// client side
$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = ["#ff8383", "#ff7aa1", "#FF5757", "#ff9257", "#eb8d71", "#db6588"];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $userboard = $('.userboard'); 
  var $gameContainer = $('#gameContainer'); 

  var $loginPage = $('.login.page'); // The login page
  var $goButton = $('#go');
  var $chatPage = $('.chat.page'); // The chatroom page
  var $joinGame = $('.joinGame'); 
  var $joinPrivateGame = $('.joinPrivateGame');
  var $createPrivateGame = $('.createPrivateGame'); 
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

var CorrectMsgs = [' gets it!', "++", " is on fire!", " has the answer!", " - you're doing amazing, sweetie"];


$window.on('resize', function(){
	console.log("resized");
	let viewport_width = $window.width();
	console.log(viewport_width);

	if (viewport_width < 690){

		console.log("resize");
		$("#mainpageContainer").css({'flex-direction': 'column-reverse', 'margin-top': '0px', 'height': '500px'})
		$("#lobbyContainer").css("flex-direction", "column");
		$(".container").addClass("horizontal");
		$(".userboard").css('order', "4");
		$(".stripe").css({'flex-direction': 'column', 'justify-content':'center', 'padding-left': '40px'})
		
	}

	else {
		$("#mainpageContainer").css({'flex-direction': 'row', 'margin-top': '25vh'})
		$("#lobbyContainer").css("flex-direction", "row");
		$(".container").removeClass("horizontal");
		$(".userboard").css('order', "1");
		$(".stripe").css({'flex-direction': 'row-reverse', 'justify-content':'flex-end', 'padding-left': '20px'})

	}
});

$("#privGame").click(function(){
	if ($("#privGame").text() == "×"){
		 $("#privGame").html("")
		 				.css("background-color", "rgba(0,0,0, .1)")
	}
	else{
		$("#privGame").text("×")
						.css("background-color", "rgba(255,255,255, .3)")

	} 
});


  function listUsers(userDict, location, num = "all", style = ""){
  	 for (let [key, value] of userDict.entries()) {
      	num--;
         eval(`$(".${location}")`).append(`<div id='user_container' ${style}>` + 
         						"<div class='user_inner'>" + `<div class='avi_head_small ${value.avatar.shape}' style='background-color:${getUsernameColor(value.username)}'>`+ "<br>" +
         								`<p id='face'> ${value.avatar.face}</p>` +
         								"</div>"+`<p id = 'user_info'>${value.username}</p>`+
         						"</div>" + `<p><span class = "scores">${value.score}<span></p>` + "</div>");
         if(num == 0){
         	return;
         }
      }
  }


  socket.on('updateUserBoard', function(mode, data){
    if(mode == "add"){
      $userboard.empty();
      userDict = new Map(data.userDict);
      userDict = new Map([...userDict.entries()].sort((a, b) => b[1].score - a[1].score));
      console.log(userDict);

      listUsers(userDict, "userboard");
      
    }
    
  });

   socket.on('test', function(mode, data){

   	$gameContainer.css('color', 'grey')
   	sleep(3000).then(() => {
	    $gameContainer.css('color', 'black')
	});
    
  });


socket.on('TimeUpdate', function(seconds){
	document.getElementById("timer").innerHTML = seconds + " seconds";
	console.log(seconds);

	 if ($("#myBar").width() < $("#myProgress").width()){
	 	  $("#myBar").animate({
            width: `${(25-seconds+1) * ($("#myProgress").width()/25)}`,
        }, 1000);
	 }
	 else{
	 	  $("#myBar").animate({
            width: '0',
        }, 1000);
	 }

	 	
});	

socket.on('RiddleUpdate', function(riddleObj){
	document.getElementById("riddle").innerHTML = riddleObj.riddle;
	let ans = "";
	for(let i = 0; i < riddleObj.answer.length; i++){
		if(riddleObj.answer[i] == " "){
			ans += "\xa0\xa0";
		}
		else if(riddleObj.answer[i] == "!"||riddleObj.answer[i] == "-"){
			ans += riddleObj.answer[i];
		}
		else{
			ans += "_ ";
		}
	}
	document.getElementById("answer").innerHTML = ans;
});

function sleep (time) {
	  return new Promise((resolve) => setTimeout(resolve, time));
	}

socket.on('ShowAnswer', function(answer){
	document.getElementById("riddle").innerHTML = answer;
	document.getElementById("timer").innerHTML = "\xa0";
	document.getElementById("answer").innerHTML = "\xa0";

});

socket.on('RoundWinners', function(players){
	userDict = new Map(players);
	let num = 0;
	document.getElementById("riddle").innerHTML = `Leaderboard<br />`;
	document.getElementById("answer").innerHTML = "\xa0";

	$('.riddleAnsContainer').css("justify-content", "flex-start");
	listUsers(userDict, "leaderBoard", 3, "style='justify-content:center'");
	// sleep time expects milliseconds
	function sleep (time) {
	  return new Promise((resolve) => setTimeout(resolve, time));
	}

	sleep(5000).then(() => {
	    $(".leaderBoard").empty();
	    $('.riddleAnsContainer').css("justify-content", "space-evenly");
	});


});



  function addParticipantsMessage (data) {
    var message = '';
    log(message);
  }

  // Sets the client's username
  function addNewUser (data={}) {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your avatar, username, and game type
      data = { ...data, ...get_avatar()};
      data['username'] = username; // GO BACK HERE SANDRA 


      socket.emit('add user', data);
      
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
      console.log("asadas");
    }
  }

  // Log a message
  function log (message, options, ans=false, data=undefined) {
    var $el = $('<li>')
    .text(message)
    .addClass('log')
    if (ans){
    	$el.addClass('correctAnswer')
    		.css('color', getUsernameColor(data))
    }
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

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      //$currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        addNewUserHelper();
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  function addNewUserHelper(){

  	if ($("#privGame").text() == "×"){
   		console.log("IT IS PRIVATE");
   		if ($("#privGameCode").val()){
   			console.log("EXISTING GAME");
   			addNewUser(data={gameID: cleanInput($("#privGameCode").val().trim())});
   		}
   		else
   		{
   			console.log("IT DO BE PRIVATE");
   			addNewUser(data={isPrivate:true});
   		}
   	}
   	else{
   		console.log("NOTT PRIVATE");
   		addNewUser();
   	}
  }
  // Click and hover events

  // alternative to enter key
   $goButton.click(function () { 
   	addNewUserHelper()
   	

   	

  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });


  $joinGame.click(function () {
  	socket.emit('leaveGame');
    joinGame();

  });

  $createPrivateGame.click(function() {
  	socket.emit('leaveGame');
    joinGame({isPrivate:true});
  });

   $joinPrivateGame.click(function () {
   	socket.emit('leaveGame');
    var gameID = prompt("Enter the game code of the private game you want to join: ", "");
    if(gameID){
    	try {
    		joinGame({gameID: gameID});
    	}
    	catch(err) { 
    		console.log(err)
    	}
      
    }

  });

   $gameButtonToggle.hoverIntent(function(){
    animateGameButtonsPanel(null, onMode = true);
  });


function mod(n, m) {
  return ((n % m) + m) % m;
}
  var eyes = {0:"^", 1:"•", 2:"*", 3:"u", 4:"ㅠ", 5:"-", 6:"ㅜ", 7:"★", 8:"ㅇ", 9:"◕", 10:"￢", 11:"✧",
  				 12:"♡", 13:"x", 14:"⌣̀", 15: "·", 16:"Ǒ", 17: "Π"};
  var mouths = {0:"_", 1:".", 2:"__", 3: "ㅅ", 4:" ", 5:"◡", 6:"ω", 7:"‿",  7:"ܫ", 8:"ᴗ", 9:"︹", 10:"ε", 11:"‸",};
  var shapes = {0:"circle", 1:"square"};
  var eye_index = 0;
  var mouth_index = 0;
  var shape_index = 0;
  var e_idx = Object.keys(eyes).length;
  var m_idx = Object.keys(mouths).length;
  var s_idx = Object.keys(shapes).length;

  function face_builder(){
  	
  	return eyes[get_index('eye')]+mouths[get_index('mouth')]+eyes[get_index('eye')];
  }

  function get_index(type){
  	return mod(eval(`${type}_index`), eval(`${type[0]}_idx`));
  }

  function get_avatar(){
  	return{face: face_builder(), shape: shapes[get_index('shape')]};
  }
  	$(`div.left_btn button:nth-child(${1})`).click(function(e){
    	eye_index -=1;
    	document.getElementById("face").innerHTML = face_builder();

  });

  	$(`div.right_btn button:nth-child(${1})`).click(function(e){
    	eye_index +=1;
    	document.getElementById("face").innerHTML = face_builder();

  });

  $(`div.left_btn button:nth-child(${2})`).click(function(e){

    	
    	$('#av').removeClass(shapes[get_index('shape')]);
    	shape_index -=1;
    	$('#av').addClass(shapes[get_index('shape')]);


  });

  	$(`div.right_btn button:nth-child(${2})`).click(function(e){
    	
    	
    	$('#av').removeClass(shapes[get_index('shape')]);
    	shape_index -=1;
    	$('#av').addClass(shapes[get_index('shape')]);


  });

  $(`div.left_btn button:nth-child(${3})`).click(function(e){
    	mouth_index -=1;
    	document.getElementById("face").innerHTML = face_builder();

  });

    $(`div.right_btn button:nth-child(${3})`).click(function(e){
    	mouth_index +=1;
    	document.getElementById("face").innerHTML = face_builder();

  });
 




  // Socket events


  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    var message = "Welcome to Riddle Me This!";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

    socket.on('correct answer', function (data) {
    log(data +  CorrectMsgs[Math.floor((Math.random()*CorrectMsgs.length))], options = undefined, ans = true, data=data);
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

socket.on('leftGame', function (data) {
  log('Leaving Game ' + data.gameID);
});


socket.on('joinError', function () {
   alert("Error, could not add game. Adding random public game instead!");
});



});

$(document).ready(function(){
    $(window).resize();
});