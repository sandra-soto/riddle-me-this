// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 5000;
var loopLimit = 0;
const allRiddles = require("./riddleScraper");
const riddleDB = require('./database');
const answer = require('./answer');


var MAX_PLAYERS = 8;
var ROUNDS = 5;
var ROUND_TIME = 25;
var RIDDLES_CALLED = 20;
var RIDDLE_ADD_TIME = 40000;

/*
STILL TO BE DONE
- testing !!!!
- fix typing before connected
- timed letters appearing
- UI for messages sent after correct answer
- set a default face/username so no disconnect undefined errors appear
- de-spaghettify userlist js
- sound FX

IF WANT
- custom game options

NOT FUNCTIONAL PER SE
- rename things in code aka fix the pasghetti, get rid of unnecessary things
*/


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
    const result = riddleDB.getRiddle(RIDDLES_CALLED)
        .then(results => {
          let game = getGame(gameID);
          game['riddles'] = results.concat(game['riddles']);
         
     })
     .catch(err => {
       console.error(err)
     });
   }, RIDDLE_ADD_TIME);
   
}


// creates newGameObject, adds player to game, 
// and adds the game to the gameCollection
function buildGame(socket,data){
    const result = riddleDB.getRiddle(10)
        .then(results => {
            data.riddles = results;
            let gameObject = newGameObject(socket, data);

              // increases total count of games and adds game to global collection
            gameCollection.totalGameCount++;
            gameCollection.gameDict.set(gameObject.id, gameObject);
            

            // adds the player to the proper room in socket.io and to the gameObject
            addRoom(socket, data.gameID);
     })
     .catch(err => {
       console.error(err)
     });

  
}

// creates the GameObject
function newGameObject(socket, data){
	var gameObject = {};
  	gameObject.id = data.gameID;
  	gameObject.isPrivate = data.isPrivate;
   	gameObject.playerDict = new Map(); 
    gameObject.riddles = data.riddles;
    gameObject.timerID = -1;
    gameObject.riddleAddTimerID = -1; 

 	console.log("Game Created by "+ socket.player['username'] + " w/ " + gameObject.id);

  // shows game has been created in chat box
  socket.emit('gameCreated', {
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

function buildPlayer(socket, data) {
	// builds a player object to be stored in the socket and in gameObjects

  var playerObject = {}; 
  playerObject.username = data.username;
  playerObject.avatar = {'face':data.face, 'shape': data.shape};
  playerObject.answered = false;
  playerObject.score = 0;

  return playerObject;
}



function killGame(socket) {

  console.log("KILLGAME CALLED")
  var notInGame = true;
  console.log("leaving the current room which is: " + socket.currentRoom);

  var game = getGame(socket.currentRoom); 
	// if the player is the last one in the game, delete the game
  if(game['playerDict'].size == 1){ 
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

  // reupdate socket
  addRoom(socket, undefined)

}


// finds a game for the player to join
function gameSeeker (socket, data) {
  ++loopLimit;
  if ((data.isPrivate == true || gameCollection.totalGameCount == 0) || (loopLimit >= 30)) {
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

      if (getGame(gameID) == undefined){
      	console.log("EEEOEORORO")
      	socket.emit("joinError", gameID);
      	return gameSeeker(socket, {'isPrivate':data.isPrivate});
      }
    }
    
    var game = getGame(gameID);
    console.log("FOUND THIS GAME FOR USER=======");
    console.log(game);

    if (data.gameID != undefined || (!game.isPrivate && game['playerDict'].size < MAX_PLAYERS)) // change MAX number of players in a room here
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


function all_answered(players){
  ans = true;
  for(let [key, value] of players.entries()){
  
    ans = ans && value.answered;
  }
  return ans;
}


function beginGame(socket, gameID){
  
	var game = getGame(gameID);
	var round = 0;
  var timeleft = ROUND_TIME;
  var answer = undefined;
  var paused = false;
  var finished_rounds = false;
  var everyone_answered = false;


  io.in(gameID).emit("RiddleUpdate", game['riddles'][game['riddles'].length-1].document);

  game['timerID'] = setInterval(function(){
    everyone_answered = all_answered(game['playerDict']);
    // if the round has ended but it isn't paused, then pause it and advance the round count
    if(timeleft<=0 && !paused){
      // remove the riddle already used
      game['riddles'].pop();
      
      paused = true;
      socket.player.answered = false;
      round +=1;
      console.log("ROUND ====", round, game['id']);
      //console.log("ROUND ====", round, game['riddles'][game['riddles'].length-1].document);

    }

    // if the round is over and the timer has paused
    else if(paused && !finished_rounds){

      // show the answer for each riddle
      io.in(gameID).emit("ShowAnswer", answer);

      // if on the fifth round, then "game" has finished
      if (round == 5){
        timeleft = ROUND_TIME + 6;
        round = 0;
        finished_rounds = true; // finished_rounds changed to true so we can later show winners
      }
      else{
        // add 3 seconds to show answer and ROUND_TIME for next round
        timeleft = ROUND_TIME + 3;
        paused = false;

      }
      everyone_answered = false;
    }

    // if "game" has finished then show the winners and unpause
    else if(finished_rounds){
      finished_rounds = false;
      io.in(gameID).emit("RoundWinners", Array.from(game['playerDict']));
      paused = false;
      
    }

    // start next round
    else if(!paused && timeleft<=ROUND_TIME && !finished_rounds){
       io.in(gameID).emit("TimeUpdate", timeleft);
       io.in(gameID).emit("RiddleUpdate",game['riddles'][game['riddles'].length-1].document);
       answer = game['riddles'][game['riddles'].length-1].document.answer;
       
    }

    if(everyone_answered){
      timeleft = 0;
    }
  

    timeleft--;

   
      

    },1000);


  riddleAdd(gameID);
  

	

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

  if (gameID != undefined){
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

    // if the game hasn't started yet, start it
    if(getGame(gameID)['timerID'] == -1){
    	console.log("starting the game????????////");
      beginGame(socket, gameID);
    }
  }

  
}

function joinGame(socket, data){
  console.log(socket.player['username'] + " wants to join a game");
  console.log("game is private: " + data.isPrivate + " and game ID is: " + data.gameID);
  if(socket.currentRoom != undefined){
    socket.broadcast.to(socket.currentRoom).emit('user left', {
        username: socket.player['username'],
      });
  }
  gameSeeker(socket, data);
    
}

function getGame(gameID){
	return gameCollection['gameDict'].get(gameID);
}

function getCurrentRiddle(gameID){
  let game = getGame(gameID);
  return game['riddles'][game['riddles'].length-1].document;
}

// Chatroom

var numUsers = 0;

io.sockets.on('connection', function (socket) {

  var addedUser = false;
  var socket = socket;



  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'

    let game = getGame(socket.currentRoom);

    // if the player hasnt answered the riddle already and the answer matches
    if(!game['playerDict'].get(socket.id).answered && answer.answerMatch(getCurrentRiddle(socket.currentRoom).answer,data)){
      game['playerDict'].get(socket.id).answered = true;
      socket.player.score++;
       io.in(socket.currentRoom).emit('updateUserBoard', "add", {userDict:Array.from(getGame(socket.currentRoom)['playerDict']),
                        player:socket.player});
       io.in(socket.currentRoom).emit('correct answer', socket.player['username']);

    }
    else if(socket.player.answered){
      // do nothing
    }
    else {

      // send the message to everyone
      socket.broadcast.to(socket.currentRoom).emit('new message', {
        username: socket.player['username'],
        message: data,
      });
      
      

    }


  });



  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (data) {
    if (addedUser) return;

  	// store the current room in the socket, currenntly not in a room
  	socket.currentRoom = undefined;

    // store the player in the socket
    socket.player = buildPlayer(socket, data);
    
    //update number of total players
    ++numUsers;

    addedUser = true;

    joinGame(socket, data);

    socket.emit('login', {
      numUsers: numUsers
    });

    // echo to the current room that a person has connected
    socket.broadcast.to(socket.currentRoom).emit('user joined', {
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
      
      

          var gameID = socket.currentRoom;
        io.in(gameID).emit('updateUserBoard', "add", {userDict:Array.from(getGame(gameID)['playerDict']),
																					player:socket.player})
        killGame(socket);

      
      // echo that this client has left
      socket.broadcast.to(socket.currentRoom).emit('user left', {
        username: socket.player['username'],
        numUsers: numUsers
      });
    }

  });



  socket.on('joinGame', function (data = {isPrivate:false, gameID:undefined}){
  	joinGame(socket, data);
 
    


  });


  socket.on('leaveGame', function() {
 
    if (socket.currentRoom == undefined){
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
    //console.log(result);
  }
  catch(error){
      console.log("Error in Scraper: " + error);
  }
}


