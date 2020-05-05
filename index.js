// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 5000;
var loopLimit = 0;
const allRiddles = require("./riddleScraper");
//var router = express.Router()



server.listen(port, function () {
  console.log('Server listening at port %d', port);
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
  this.globalGame = undefined;
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

function newGameObject(socket, data){
	var gameObject = {};
  	gameObject.id = data.firstGame || (Math.random()+1).toString(36).slice(2, 18);
  	gameObject.isPrivate = data.isPrivate;
 	gameObject.playerDict = new Map(); 

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

function buildGame(socket, data) {
	
  // creates a new game object
  
  var gameObject = newGameObject(socket, data);
   

  // increases total count of games and adds game to global collection
  gameCollection.totalGameCount++;
  gameCollection.gameDict.set(gameObject.id, gameObject);

      // adds the player to the proper room in socket.io and to the gameObject
  addRoom(socket, gameObject.id);
  

   
  
  console.log();


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


  var notInGame = true;
  console.log("leaving the current room which is: " + socket.currentRoom);

  var game = getGame(socket.currentRoom);

	// if the player is the last one in the game, delete the game
  if( game['playerDict'].size == 1){ 

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
  if ((data.isPrivate == true || gameCollection.totalGameCount == 1) || (loopLimit >= 10)) {
  	console.log("BUILDING A GAME=============");
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
      //socket.emit('addroom', {room: gameID}); // add player to randomly picked room
      addRoom(socket, gameID);
      socket.emit('joinSuccess', {gameID: gameID}); // adds player join message
      game.playerDict.set(socket.id, socket.player); // add the player to the playerDict
      console.log("User {" + socket.id + ", " + socket.player['username'] + "} has been added to: " + gameID);
      console.log(game['playerDict']);
      
      
    

    }

    else {
      gameSeeker(socket, data); 
    }
  }
}

function addRoom(socket, gameID){

	
	// removes the player from the old game
	var old_game_id = socket.currentRoom;
		var old_game = getGame(socket.currentRoom);
		// if game was destroyed then it is undefined and no need to remove the player
		if (old_game != undefined){
				old_game['playerDict'].delete(socket.id);
		}

		  // get new game
  var game = getGame(gameID); 
	

	socket.leaveAll();
	// update socket variables
  socket.currentRoom = gameID;

  // join the game room
  socket.join(gameID);
  // add the player object to the player dict
  game['playerDict'].set(socket.id, socket.player);

    if(old_game != undefined){
    	console.log("uhhhhh");
    	console.log(old_game);

   	    io.in(old_game_id).emit('updateUserBoard', "add", {userDict:Array.from(old_game['playerDict']),
	 																			player:socket.player});
   }

  // update the user board html
  io.in(gameID).emit('updateUserBoard', "add", {userDict:Array.from(getGame(gameID)['playerDict']),
																					player:socket.player});

  
  	console.log(getGame(gameID));
}

function getGame(gameID){
	if(gameID == "lobby"){
		return gameCollection.globalGame;
	}
	return gameCollection['gameDict'].get(gameID);
}

// Chatroom

var numUsers = 0;
//var users = []

io.sockets.on('connection', function (socket) {

  var addedUser = false;
  var socket = socket;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
      	socket.player.score++;
    io.in(socket.currentRoom).emit('updateUserBoard', "add", {userDict:Array.from(getGame(socket.currentRoom)['playerDict']),
	 													player:socket.player});

    socket.broadcast.to(socket.currentRoom).emit('new message', {
      username: socket.player['username'],
      message: data,
      score: socket.score
    });
  });



  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

  	// store the current room in the socket
  	socket.currentRoom = 'lobby';

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
  		gameCollection.globalGame = newGameObject(socket, {firstGame:'lobby'});
  		addRoom(socket, 'lobby');
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



