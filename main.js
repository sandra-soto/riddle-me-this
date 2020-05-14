// client side
$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
  '#ff6961', '#db6b6b', '#ffcb5e', '#ffa530',
  '#b6ff85', '#6d9e55', '#6bb8db', '#a1ffea',
  '#9bbde8', '#8c87ab', '#e3adff', '#d9a6de'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $userboard = $('.userboard'); 
  var $gameContainer = $('.gameContainer'); 

  var $loginPage = $('.login.page'); // The login page
  var $goButton = $('#go');
  var $chatPage = $('.chat.page'); // The chatroom page
  var $joinGame = $('.joinGame'); 
  var $joinPrivateGame = $('.joinPrivateGame');
  var $createPrivateGame = $('.createPrivateGame'); 
  var $leaveGame = $('.leaveGame'); 
  var $gameButtonToggle = $('.gameButtonToggle');
  var $gameButtonsContainer = $('.gameButtonsContainer');
  var $gameButtonsPage = $('.gameButtonsPage');
  var $gameActionButton = $('.gameAction');
  var gameButtonsToggled = false;

  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  var userList = [];
  var socket = io();

  socket.on('updateUserBoard', function(mode, data){
    if(mode == "add"){
      $('#user').empty();
      userDict = new Map(data.userDict);
      userDict = new Map([...userDict.entries()].sort((a, b) => b[1].score - a[1].score));
      console.log(userDict);

      for (let [key, value] of userDict.entries()) {
         $('#user').append("<h1>" + value.username + ", " + value.score + "</h1>");
      }
      
     //// $('#user').append("<h1>" + data.player.username + ", " + data.player.score + "</h1>"); 
      // var elements=document.getElementById('myDiv').children
      // elements.item(n)
    }
    
  });


    socket.on('riddles', function (riddict){
      result = riddict

    function basicGameplay(){
      var answertest = JSON.parse(JSON.stringify(Object.values(result)));
      var testlist = JSON.parse(JSON.stringify(Object.keys(result)));
      //console.log(testlist)
      //console.log(testlist);

      var move = testlist[Math.floor(Math.random()*testlist.length)];
      var ans = answertest[Math.floor(Math.random()*answertest.length)];
      //if(rounds != 0)
      // {
      document.getElementById("demo").innerHTML = move;
      document.getElementById("answer").innerHTML = ans;
      //    rounds -= 1;
      // }
      // gameState = 1;
      // for(var i in players){
      //   var playerWin = playerWinCheck(players[i].message);
      //   if(playerWin){
      //     players[i].score += 1;
      //   }
      //}
      }
    function playerWinCheck(message){
    var playerWins = false;
    if(message == move){
    playerWins = true;
    }
    return playerWins;
    }
    basicGameplay();
    setInterval(function(){
    basicGameplay();},3000);

    //console.log("Result is:" + $('#result'))
      
  });


  function addParticipantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "I walk a lonely road. The only one that I have ever known. One(1) user online";
    } else {
      message += "there are " + data.numUsers + " players in the Lobby";
    }
    log(message);
  }

  // Sets the client's username
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);
      
    }
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }








  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
    .text(data.username)
    .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
    .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
    .data('username', data.username)
    .addClass(typingClass)
    .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
     hash = username.charCodeAt(i) + (hash << 5) - hash;
   }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  function animateGameButtonsPanel(fadeSpeed = 1000, onMode = false, offMode = false){
    width = $gameButtonsPage.width();
    console.log(onMode);
    console.log(width);
    if (!onMode && gameButtonsToggled){
      $('.gameAction').fadeOut(fadeSpeed);
      $gameButtonsPage.animate({
            width: '2%',
        }, fadeSpeed);

      gameButtonsToggled = false;
    }
    else if(!offMode){
      $('.gameAction').show();
      $gameButtonsPage.animate({
            width: '100%'
        }, 1000);

      gameButtonsToggled = true;
    }

  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });


  // Click and hover events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // alternative to enter key
   $goButton.click(function () { 
    setUsername();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });


  $joinGame.click(function () {
    joinGame();

  });

  $leaveGame.click(function () {
    leaveGame();

  });

  $createPrivateGame.click(function() {
    joinGame({isPrivate:true});
  });

   $joinPrivateGame.click(function () {
    var gameID = prompt("Enter the game code of the private game you want to join: ", "");
    if(gameID){
      joinGame({gameID: gameID});
    }

  });

  $gameButtonToggle.mouseenter(function(){
    animateGameButtonsPanel(null, onMode = true);
  });


  $gameActionButton.click(function(){
    animateGameButtonsPanel(1100);
  });

  $gameButtonsPage.click(function(e){
    if(e.target != this) return;
    animateGameButtonsPanel(1100, null, offMode = true);
  });


  // Socket events


  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    var message = "Welcome to the Riddle Me This! Lobby ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });


  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);


  });


  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });


  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });


  socket.on('gameCreated', function (data) {
    console.log("Game Created! ID is: " + data.gameID)
    log(data.username + ' created Game: ' + data.gameID);
  });
  
  socket.on('disconnect', function () {
   log('you have been disconnected');
 });
  
  socket.on('reconnect', function () {
   log('you have been reconnected');
   if (username) {
     socket.emit('add user', username);
   }
 });
  
  socket.on('reconnect_error', function () {
   log('attempt to reconnect has failed');
 });


//Join into an Existing Game
function joinGame(data = {isPrivate: false}){
  socket.emit('joinGame', data);

};


socket.on('joinSuccess', function (data) {
  log('Joining the following game: ' + data.gameID);

});



//Response from Server on existing User found in a game
socket.on('alreadyJoined', function (data) {
  log('You are already in an Existing Game: ' + data.gameID);
});


function leaveGame(){
  socket.emit('leaveGame');
};


socket.on('leftGame', function (data) {
  log('Leaving Game ' + data.gameID);
});

socket.on('notInGame', function () {
  log('You are not currently in a Game.');
});

function joinPrivateGame(){
  
  //socket.emit('subscribe', gameID);
};



});
