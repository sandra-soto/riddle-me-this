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


function fix_string(str){
  str = str.replace(/[!.“”"]*/g, "");
  return str.trim();
}


async function scraper(ridict, rounds){
  var ridict = {};
  try{
    const result = await allRiddles(ridict);
    let riddle = JSON.parse(JSON.stringify(Object.keys(result)));
    let answer = JSON.parse(JSON.stringify(Object.values(result)));

    let new_riddle = riddle[0].trim();
    let new_ans = fix_string(answer[0]);


    console.log(new_riddle);
    console.log(new_ans);
    module.exports.saveRiddle(new_riddle, new_ans);
 
  }
  catch(error){
      //console.log("Error in Scraper: " + error);
  }
}



module.exports = new Database();






//console.log(await res);


// setInterval(function(){
//    scraper();},500); 

