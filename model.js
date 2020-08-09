const mongoose = require('mongoose');


let riddleSchema = mongoose.Schema({
  riddle:{
    type:String,
    required:true,
    unique: true
  },

  answer:{
    type:String,
    required:true
  }

});



riddleSchema.statics.getRandomRiddles = function(numRiddles, cb){
	this.aggregate([{
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
        }], cb);
  };


module.exports = mongoose.model('Riddle', riddleSchema);