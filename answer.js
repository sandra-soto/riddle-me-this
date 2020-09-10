// module for answer processing

// replaceAll function implementation
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};


// removes any punctuation from the answer
function simpleAnswer(answerString){
	return answerString.replaceAll(/[.,!?"';]+/, '');
}


// matches the attempt to the answerString
function answerMatch(answerString, attempt){
	let str = simpleAnswer(attempt);
	// bad fix -- need to fix entries in DB 
	return eval(`/^(because)*(a)*(an)*(the)*( )*(${str})*([.,!?"';])*$/i`).test(answerString);
}

module.exports = {
	answerMatch
}


