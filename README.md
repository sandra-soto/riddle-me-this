[![Generic badge](https://img.shields.io/badge/License-MIT-blue.svg)](https://shields.io/)
[![Generic badge](https://img.shields.io/badge/Made_with-❤-red.svg)](https://shields.io/)
 
# Riddle Me This!

**Riddle Me This!** is an online multiplayer game, in which players race against the clock (and other players) to answer riddles

![RMT landing page](https://i.imgur.com/buHo1RE.png)

***Play the game [here](http://riddlethis.herokuapp.com/) (http://riddlethis.herokuapp.com/)!***



## Built with

* Node.js
* Socket.io 
* MongoDB Atlas

## How it works
**webscraping and MongoDB**  - RMT uses a Mongo database to retrieve random riddles. The DB was populated with data gathered from the webscrape of a popular riddle-hosting website

**answer matching** - RMT uses a simple regex module to match player answers against riddle answers

**public/private game rooms** - socket.io allows users to be added to individual rooms. Using this feature, randomized game codes and options for game type (private or public), allow players to be matched with games and to be able to communicate with others within the same game


## Features
* **avatar picker**: with hundreds of possible combinations, players can choose from different eyes, mouths, and geometric shapes to build an avatar
* **public and private games**: users can join a random public game, join a private game via code, or create their own private game to share with friends
* **dynamically updated leaderboard**: each player in a game can be found in the game's leaderboard, which updates automatically and sorts by highest score
* **timed rounds, infinite game**: each round lasts 25 seconds but the game keeps going on forever


## At a Glance

![RMT gameplay page](https://i.imgur.com/M58tjXH.png)
RMT gameplay page showing the ranked list of players, a timed riddle, and the game chat

![RMT avatar picker](https://i.imgur.com/kqkjSg5.png)
More shots of the avatar picker! And a look into selecting a private game from the homepage

## How to Install

```
> git clone https://github.com/sandra-soto/riddle-me-this
> cd riddle-me-this
> npm install
> nodemon index.js
```


## Credits

[Sandra Soto](https://github.com/sandra-soto) - design, frontend, backend (game mechanics), and MongoDB

[Kati Tran](https://github.com/kati-tran) - concept, title, and webscraping

Built on top of basic socket.io chat forked from [Frankenmint](https://github.com/Frankenmint/) - [https://github.com/Frankenmint/mmserver/](https://github.com/Frankenmint/mmserver/)

## License
[MIT](https://choosealicense.com/licenses/mit/)
