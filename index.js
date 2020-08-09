// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 5000;
var loopLimit = 0;
const allRiddles = require("./riddleScraper");
const riddleDB = require('./database');
//var router = express.Router()


// TO-DO:
// - fix names of reserved events (disconnect, reconnect, etc)
// - avatar picker and userlist html
// - fix userlist js
// - fix timers

// if a user joins mid round, they can't see the riddle


server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

app.set('view engine', 'pug');
// Routing
app.use(express.static(__dirname));


app.get('/', function(req, res){
  res.render('index');

});

app.get('/terms_conditions', function(req, res){
  res.render('tos')
});

app.get('/source_code', function(req, res){
  res.redirect('https://github.com/sandra-soto/riddle-me-this')
});



// Entire gameCollection Object holds all games and info
var gameCollection =  new function() {
  this.globalGame = undefined,
  this.totalGameCount = 0,
  this.gameDict = new Map()

};


// sets an interval to call DB for more riddles
function riddleAdd(gameID){
  getGame(gameID)['riddleAddTimerID'] = setInterval(function(){
    const result = riddleDB.getRiddle(10)
        .then(results => {
          let game = getGame(gameID);
          game['riddles'] = game['riddles'].concat(results);
         
     })
     .catch(err => {
       console.error(err)
     });
   }, 90000);
   
}

// creates newGameObject, adds player to game, 
// and adds the game to the gameCollection
function buildGame(socket,data){
    const result = riddleDB.getRiddle(10)
        .then(results => {
            data.riddles = results;
            let gameObject = newGameObject(socket, data);
            if(data.gameID =='lobby'){
              gameCollection.globalGame = gameObject;
            }
            else {
              // increases total count of games and adds game to global collection
            gameCollection.totalGameCount++;
            gameCollection.gameDict.set(gameObject.id, gameObject);
            }

            // adds the player to the proper room in socket.io and to the gameObject
            addRoom(socket, data.gameID);
     })
     .catch(err => {
       console.error(err)
     });

  
}

// creates the GameObject
function newGameObject(socket, data){
  console.log("booboobullshit");
	var gameObject = {};
  	gameObject.id = data.gameID;
  	gameObject.isPrivate = data.isPrivate;
   	gameObject.playerDict = new Map(); 
    gameObject.riddles = data.riddles;
    gameObject.timerID = -1;
    gameObject.riddleAddTimerID = -1; 

 	console.log("Game Created by "+ socket.player['username'] + " w/ " + gameObject.id);

  // shows game has been created in chat box
  io.emit('gameCreated', {
   username: socket.player['username'],
   gameID: gameObject.id
	});

  // adds player join message to chat box
  socket.emit('joinSuccess', {gameID: gameObject.id }); 
   return gameObject;

}


function showRiddles(riddict) {
  io.sockets.emit('riddles', riddict);
}

function buildPlayer(socket, username) {
	// builds a player object to be stored in the socket and in gameObjects

  var playerObject = {}; 
  playerObject.username = username;
  playerObject.score = 0;

  return playerObject;
}



function killGame(socket) {

  console.log("KILLGAME CALLED")
  var notInGame = true;
  console.log("leaving the current room which is: " + socket.currentRoom);

  var game = getGame(socket.currentRoom);

	// if the player is the last one in the game, delete the game
  if( game['playerDict'].size == 1){ 

    //delete the timer
    console.log("clearing===========");
     clearInterval(game['timerID']);
     clearInterval(game['riddleAddTimerID']);
     game['timerID'] = -1;

     --gameCollection.totalGameCount; 
    console.log("Destroy Game "+ socket.currentRoom + "!");
    socket.emit('leftGame', { gameID: socket.currentRoom });
    gameCollection.gameDict.delete(socket.currentRoom);
    console.log("Current list of games after deletion: " + Array.from(gameCollection.gameDict.keys()));
    notInGame = false;

    


  }

  else{ // if the player is not the last one in the game (i.e. there are others) just leave the game
      console.log( "User {" + socket.id + ", " + socket.player['username'] + "} has left " + socket.currentRoom);
      socket.emit('leftGame', { gameID: socket.currentRoom });
      notInGame = false;
  }

  // re-add to lobby
  addRoom(socket, 'lobby');

}


// finds a game for the player to join
function gameSeeker (socket, data) {
  ++loopLimit;
  if ((data.isPrivate == true || gameCollection.totalGameCount < 2) || (loopLimit >= 10)) {
  	console.log("BUILDING A GAME=============");
    // new random gameID
    data.gameID = (Math.random()+1).toString(36).slice(2, 18);
    buildGame(socket, data);
    loopLimit = 0;

  } 

  else {

    if(data.gameID == undefined){ // if not seeking a specific game, then find one

      var rndPick = Math.floor(Math.random() * (gameCollection.totalGameCount-1));
      var gameIDs = Array.from(gameCollection.gameDict.keys());
      console.log("POSSIBLE GAMES TO JOIN======");
      console.log(gameIDs);
      var gameID = gameIDs[rndPick];
      
    }

    else{ // if seeking a specfic game, use that game's id
    	console.log('SEEKING A specific GAME');
      var gameID = data.gameID;
    }
    
    var game = getGame(gameID);
    console.log("FOUND THIS GAME FOR USER=======");
    console.log(game);

    if (data.gameID != undefined || (!game.isPrivate && game['playerDict'].size < 2)) // change MAX number of players in a room here
    {
    
      addRoom(socket, gameID);
      socket.emit('joinSuccess', {gameID: gameID}); // adds player join message
      game.playerDict.set(socket.id, socket.player); // add the player to the playerDict
      console.log("User {" + socket.id + ", " + socket.player['username'] + "} has been added to: " + gameID);
 

    }

    else {
      gameSeeker(socket, data); 
    }
  }
}






function beginGame(socket, gameID){

	var game = getGame(gameID);
	
  let scraperTime = 0;
  let timeleft = 10;

  io.in(gameID).emit("RiddleUpdate", game['riddles'][game['riddles'].length-1].document);


  game['timerID'] = setInterval(function(){
    if(timeleft<=0){

      // remove the riddle already used
      console.log(game['riddles']);
      game['riddles'].pop();
      
      timeleft = 10;
   
      console.log(game);
      io.in(gameID).emit("RiddleUpdate",game['riddles'][game['riddles'].length-1].document);

    }

      timeleft -=1;
      scraperTime +=1;
       io.in(gameID).emit("TimeUpdate", timeleft);

    },1000);


  riddleAdd(gameID);

    console.log(game['timerID']);

  //io.in(gameID).emit("roundTimer", Array.from(game.riddles));
	

}

function addRoom(socket, gameID){

	
	// removes the player from the old game, if there is one (currentRoom is not undefined)
	var old_game_id = socket.currentRoom;
  console.log(`addRoom === ${socket.player.username} is leaving ${old_game_id} and joining ${gameID}`);
	var old_game = getGame(socket.currentRoom);


  socket.leaveAll();

	// if game was destroyed then it is undefined and no need to remove the player
	if (old_game != undefined){
			old_game['playerDict'].delete(socket.id);

      // update the userBoard for the old game
      io.in(old_game_id).emit('updateUserBoard', "add", {userDict:Array.from(old_game['playerDict']),
                                        player:socket.player});
  }

  // get new game
  var game = getGame(gameID); 

	
	// update socket variables
  socket.currentRoom = gameID;

  // join the game room
  socket.join(gameID);

  // add the player object to the player dict
  game['playerDict'].set(socket.id, socket.player);

  
  // update the user board in the new game
  io.in(gameID).emit('updateUserBoard', "add", {userDict:Array.from(getGame(gameID)['playerDict']),
																					player:socket.player});

  // if there are 2 people in a room, start the game by showing the riddle
  // if(getGame(gameID)['playerDict'].size == 2){
  // 	beginGame(socket, gameID);
  // }

  // if the game hasn't started yet, start it
  if(getGame(gameID)['timerID'] == -1 && ((old_game_id !='lobby' && gameID == 'lobby') || (old_game_id == 'lobby' && gameID != 'lobby'))){
    beginGame(socket, gameID);
  }

  
}

function getGame(gameID){
	if(gameID == "lobby"){
		return gameCollection.globalGame;
	}
	return gameCollection['gameDict'].get(gameID);
}

// Chatroom

var numUsers = 0;

io.sockets.on('connection', function (socket) {

  var addedUser = false;
  var socket = socket;

  socket.on('increasePlayerScore', function(){
  	socket.player.score++;
  		    io.in(socket.currentRoom).emit('updateUserBoard', "add", {userDict:Array.from(getGame(socket.currentRoom)['playerDict']),
	 													player:socket.player});
  });

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'

    socket.broadcast.to(socket.currentRoom).emit('new message', {
      username: socket.player['username'],
      message: data,
    });
  });



  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

  	// store the current room in the socket, currenntly not in a room
  	socket.currentRoom = undefined;

    // store the player in the socket
    socket.player = buildPlayer(socket, username);
    
    //update number of total players
    ++numUsers;

    addedUser = true;


	// update the number of users online
    socket.emit('login', {
      numUsers: numUsers
    });


    
    // if the lobby hasn't been created, create it
    if (gameCollection.totalGameCount == 0){ // gamecount zero means no lobby
    	gameCollection.totalGameCount++;
    	console.log("CREATING LOBBY");
  		buildGame(socket, {gameID:'lobby'});
 
  	}

  	// when a user is added to rmt, they join the lobby
  	else {
  		addRoom(socket, 'lobby');
  	}
    

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
      // deleting again because killgame emits notingame for lobby CHANGE THIS
      getGame(socket.currentRoom)['playerDict'].delete(socket.id);

          var gameID = socket.currentRoom;
  io.in(gameID).emit('updateUserBoard', "add", {userDict:Array.from(getGame(gameID)['playerDict']),
																					player:socket.player})

      
      // echo globally that this client has left
      socket.broadcast.to(socket.currentRoom).emit('user left', {
        username: socket.player['username'],
        numUsers: numUsers
      });
    }

  });



  socket.on('joinGame', function (data = {isPrivate:false, gameID:undefined}){
    console.log(socket.player['username'] + " wants to join a game");
    console.log("game is private: " + data.isPrivate + " and game ID is: " + data.gameID);

    var alreadyInGame = false;

    if(('lobby'.localeCompare(socket.currentRoom)) != 0){ // if already in a non-lobby game
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
 
    if (socket.currentRoom.localeCompare("lobby") == 0){
    	socket.emit('notInGame');  
   }

   else {
    killGame(socket);
  }
  

});

});

// scraping function which was used to populate the DB
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


