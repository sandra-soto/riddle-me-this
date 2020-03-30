// Setup basic express server
var express = require('express');
var app = express();
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 5000;
var loopLimit = 0;
const allRiddles = require("./riddleScraper");
//var router = express.Router()



server.listen(port, function () {
  console.log('Server listening at port %d', port);
  fs.writeFileSync(__dirname + '/start.log', 'started'); 
});

app.set('view engine', 'pug');
// Routing
app.use(express.static(__dirname));


app.get('/', function(req, res){
  
  scraper();
  setInterval(function(){
  scraper();},10000); //Empty dict for game-specific maybe? And then rounds
  
  res.render('index'); //{result: result}
});

app.get('/terms_conditions', function(req, res){
  res.render('tos')
});

app.get('/source_code', function(req, res){
  res.redirect('https://github.com/sandra-soto/RMT')
});
module.exports = express.Router();


// Entire gameCollection Object holds all games and info
var gameCollection =  new function() {

  this.totalGameCount = 0,
  this.gameDict = new Map()

};

async function scraper(ridict, rounds){
  var ridict = {};
  try{
     const result = await allRiddles(ridict);
    showRiddles(result);
    console.log(result);
  }
  catch(error){
      console.log("Error in Scraper: " + error);
  }
}

function buildGame(socket, data) {
   var gameObject = {};
   gameObject.id = (Math.random()+1).toString(36).slice(2, 18);
   gameObject.isPrivate = data.isPrivate;
   

   gameObject.playerDict = new Map(); // adding playerObjects
   gameObject.playerDict.set(socket.id, socket.player);

   gameCollection.totalGameCount++;
   gameCollection.gameDict.set(gameObject.id, gameObject);

   console.log("Game Created by "+ socket.player['username'] + " w/ " + gameObject.id);
   io.emit('gameCreated', {
    username: socket.player['username'],
    gameID: gameObject.id
});

  socket.emit('joinSuccess', {gameID: gameObject.id }); // adds player join message
  addRoom(socket, gameObject.id);
  //socket.emit('addroom', {room:gameObject.id});
  console.log('There are now ' + gameObject.playerDict.size + ' player(s) in game ' + gameObject.id);
  console.log(gameObject.playerDict);
  console.log();


}

function showRiddles(riddict) {
    io.sockets.emit('riddles', riddict);
}

function buildPlayer(socket, username) {
  var playerObject = {}; // store the player in the socket session for this client
  playerObject.username = username;
  playerObject.score = 0; // initialized at zero

  return playerObject;
}



function killGame(socket) {

  if(!socket.currentRoom.localeCompare('lobby')){ // if the player is in the lobby then do nothing
    socket.emit('notInGame');
    return;
  }

  var notInGame = true;
  console.log("leaving the current room which is: " + socket.currentRoom);

  var game = gameCollection['gameDict'].get(socket.currentRoom);

 
  if( game['playerDict'].size == 1){ // if the player is the last one in the game, delete the game

     --gameCollection.totalGameCount; 
    console.log("Destroy Game "+ socket.currentRoom + "!");
    socket.emit('leftGame', { gameID: socket.currentRoom });
    socket.broadcast.to(socket.currentRoom).emit('gameDestroyed', {gameID: socket.currentRoom, lastPlayer: socket.player['username']});
    gameCollection.gameDict.delete(socket.currentRoom);
    console.log("Current list of games after deletion: " + Array.from(gameCollection.gameDict.keys()));
    notInGame = false;

  }

  else{ // if the player is not the last one in the game (i.e. there are others)
      console.log( "User {" + socket.id + ", " + socket.player['username'] + "} has left " + socket.currentRoom);
      socket.emit('leftGame', { gameID: socket.currentRoom });
      notInGame = false;



  }

  // re-add to lobby
  addRoom(socket, 'lobby');
  //socket.emit('addroom', {room: 'lobby'});

  //update game info
  game.playerDict.delete(socket.id);

  console.log("Users remaining:");
  console.log("\t");
  console.log(game.playerDict);

}


// finds a game for the player to join
function gameSeeker (socket, data) {
  ++loopLimit;
  if ((data.isPrivate == true || gameCollection.totalGameCount == 0) || (loopLimit >= 10)) {

    buildGame(socket, data);
    loopLimit = 0;

  } 

  else {

    if(data.gameID == undefined){ // if not seeking a specific game, then find one
      var rndPick = Math.floor(Math.random() * gameCollection.totalGameCount);
      var gameIDs = Array.from(gameCollection.gameDict.keys());
      var gameID = gameIDs[rndPick];
      
    }

    else{ // if seeking a specfic game, use that game's id
      var gameID = data.gameID;
    }
    
    var game = gameCollection.gameDict.get(gameID);

    if (data.gameID != undefined || (!game.isPrivate && game['playerDict'].size < 2)) // change MAX number of players in a room here
    {
      //socket.emit('addroom', {room: gameID}); // add player to randomly picked room
      addRoom(socket, gameID);
      socket.emit('joinSuccess', {gameID: gameID}); // adds player join message
      game.playerDict.set(socket.id, socket.player); // add the player to the playerDict
      console.log("User {" + socket.id + ", " + socket.player['username'] + "} has been added to: " + gameID);
      console.log(game.playerDict);
      io.broadcast.to(gameID).emit('updateUserBoard', {userDict:game});
      
    

    }

    else {
      gameSeeker(socket, data);
    }
  }
}

function addRoom(socket, gameID){
  socket.currentRoom = gameID;
  socket.emit('addroom', {room:gameID});
}


// Chatroom

var numUsers = 0;
//var users = []

io.sockets.on('connection', function (socket) {

  var addedUser = false;
  var socket = socket;


    socket.on('subscribe', function(data) { // join specific room, make specific room the currentRoom
      
      socket.leaveAll();
      socket.join(data.room); 
      socket.currentRoom = data.room;
      

  })

    socket.on('unsubscribe', function(data) { 
      socket.leave(data.room); })


  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'

    socket.score += 1;

    console.log('Current room is: ' + socket.currentRoom);
    console.log('Current score is: ' + socket.score);


    socket.broadcast.to(socket.currentRoom).emit('new message', {
      username: socket.player['username'],
      message: data,
      score: socket.score
    });
  });


  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

  
    //store player object in the socket
    socket.player = buildPlayer(socket, username);
    console.log(socket.player);


    socket.score = 0;
    ++numUsers;
    //users.push(username);
    addedUser = true;

	//updateClients(); 
    socket.emit('login', {
      numUsers: numUsers
    });

    //socket.emit('addroom', {room:'lobby'}); // when a user is added to rmt, they join the lobby
    addRoom(socket, 'lobby');

    // echo to the current room that a person has connected
    socket.broadcast.to('lobby').emit('user joined', {
      username: socket.player['username'],
      numUsers: numUsers
    });

    
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.to(socket.currentRoom).emit('typing', {
      username: socket.player['username']
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.to(socket.currentRoom).emit('stop typing', {
      username: socket.player['username']
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;
      killGame(socket);
      /*
		for (var i=0; i<users.length;i++){
		  if(users[i] == socket.username){
		    delete users[i];
		    delete [socket.username]
		  	}
		  }
      */
		//updateClients();
      // echo globally that this client has left
      socket.broadcast.to(socket.currentRoom).emit('user left', {
        username: socket.player['username'],
        numUsers: numUsers
      });
    }
    //updateClients();
  });

  /*
    function updateClients(socket) {
        io.sockets.emit('update', users);
    }
    */


  socket.on('joinGame', function (data = {isPrivate:false, gameID:undefined}){
    console.log(socket.player['username'] + " wants to join a game");
    console.log("game is private: " + data.isPrivate + " and game ID is: " + data.gameID);

    var alreadyInGame = false;

    if(('lobby'.localeCompare(socket.currentRoom)) != 0){ // if not in a game
      alreadyInGame = true;
      console.log(socket.player['username'] + " already has a Game!");
      socket.emit('alreadyJoined', {
        gameID: socket.currentRoom
      });

    }

    if (alreadyInGame == false){
      gameSeeker(socket, data);
    }


  });


  socket.on('leaveGame', function() {
    if (gameCollection.totalGameCount == 0){
     socket.emit('notInGame');  
   }

   else {
    killGame(socket);
  }
  

});

});



