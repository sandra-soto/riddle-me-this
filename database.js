const mongoose = require('mongoose');
require('dotenv/config');
const allRiddles = require("./riddleScraper");
const RiddleModel = require('./model');
const promise = require('promise');


class Database {
  constructor() {
    this._connect()
  }
  
_connect() {
     mongoose.connect(process.env.DB_CONNECTION, { 'useNewUrlParser':true, 'useUnifiedTopology': true })
       .then(() => {
         console.log('Database connection successful')
       })
       .catch(err => {
         console.error('Database connection error')
       })
  }



 saveRiddle(r, a){
    let riddle = new RiddleModel({
    riddle: r,
    answer: a
    })

    riddle.save()
     .then(doc => {
       console.log(doc)
     })
     .catch(err => {
       console.error(err)
     })
  }

async getRiddle(numRiddles){
  const agg = await RiddleModel.aggregate([{
            $sample: { size: 100 }
        }, {
            $group: {
                _id: "$_id",
                document: { $push: "$$ROOT" }
            }
        }, {
            $limit: numRiddles
        }, {
            $unwind: "$document"
        }]);
  return agg;
  }

}


async function scraper(ridict, rounds){
  var ridict = {};
  try{
    const result = await allRiddles(ridict);
    let riddle = JSON.parse(JSON.stringify(Object.keys(result)));
    let answer = JSON.parse(JSON.stringify(Object.values(result)));
    console.log(riddle[0].substring(1,riddle[0].length-1));
    console.log(answer[0]);
    saveRiddle(riddle[0].substring(1,riddle[0].length-1), answer[0]);
 
  }
  catch(error){
      console.log("Error in Scraper: " + error);
  }
}


module.exports = new Database();







//console.log(await res);


// setInterval(function(){
//    scraper();},1000); 

