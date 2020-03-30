const axios = require('axios');

const cheerio = require('cheerio');

const url = 'https://riddles.fyi/random-riddles/';
//let siteName = "";

const fetchData = async() => {
	const result = await axios.get(url);
	return cheerio.load(result.data);
}

//let riddles = []
//let answer = []

const getResults = async() => {
	const $ = await fetchData();

	r = $('.query-title-link').text()
	a = $('.su-spoiler-content').text()
	if (a.split(" ").length > 3){
		return getResults();
	}
	else{
		return {
			Riddle: r,
			Answer: a,
		}
	};
};

//riddleParse(url)
 //var x = getResults();
// console.log(x)

const allRiddles = async(ridict, rounds) =>{
	riddle = await getResults()
	//console.log(riddle)
	if (Object.keys(ridict).length === 0){
		ridict[riddle["Riddle"]] = riddle["Answer"]
		//console.log(ridict)
	} 
	return ridict
	// if (Object.keys(ridict).length === rounds){
	// 	//console.log(ridict)
	// 	return ridict
	// }
	// else{
	// 	for (key in Object.keys(riddle))
	// 	{
	// 		if (Object.values(ridict).indexOf(riddle.key) > -1){
	// 			return allRiddles(ridict,rounds);
	// 		}
	// 		else{
	// 			ridict[riddle["Riddle"]] = riddle["Answer"]
	// 			return allRiddles(ridict,rounds);
	// 		}
	// 	}
	// }
	
}

//allRiddles(3)
module.exports = allRiddles;