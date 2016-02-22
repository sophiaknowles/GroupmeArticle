var request = require('request');
var cheerio = require('cheerio');
var qs = require('qs');
var HTTPS = require('https');
var cron = require('cron');
var express = require('express')
    , app = express()

//change this to cwru and other forms
//var searchTerm = formatSearchVal('case western');
var searchTerm = "?s=%20"
var year = 2016; 	//get the current year
var todayArticles = []
var todayDate = null;

app.set('port', (process.env.PORT || 5000));

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.listen(app.get('port'), function () {
  console.log('Example app listening on port ' + app.get('port'));

  var date1 = new Date();
  todayDate = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());

  var cronJob = cron.job("0 * * * * *", function(){			//runs every half an hour
	// perform operation e.g. GET request http.get() etc.
	var holdDate = new Date();
	if (!(holdDate.getFullYear() == todayDate.getFullYear() && holdDate.getMonth() == todayDate.getMonth(), holdDate.getDate() == todayDate.getDate())){
		todayDate = new Date(holdDate.getFullYear(), holdDate.getMonth(), holdDate.getDate());
		todayArticles = []
	}
	getOnePageArticles(searchTerm, year, function(newArticles){
		getUsauArticles(newArticles, function(newArticles){
			if (newArticles.length != 0){
				for (var i = 0; i < newArticles.length; i++){
					postMessage(newArticles[i])
					console.log("New Articles " + new Date())
				}
			}
			else{
				//put the time that this was printed as well
				console.log("No new article " + new Date());
			}
		})
	});

	}); 

	cronJob.start(); 
});


function postMessage(newArticle) {
  var botResponse, options, body, botReq;

  var botID = 'a3f7470da22027dd92283c778d';
  botResponse = newArticle

  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };

  body = {
    "bot_id" : botID,
    "text" : botResponse
  };

  console.log('sending ' + botResponse + ' to ' + botID);

  botReq = HTTPS.request(options, function(res) {
      if(res.statusCode == 202) {
        //neat
      } else {
        console.log('rejecting bad status code ' + res.statusCode);
      }
  });

  botReq.on('error', function(err) {
    console.log('error posting message '  + JSON.stringify(err));
  });
  botReq.on('timeout', function(err) {
    console.log('timeout posting message '  + JSON.stringify(err));
  });
  botReq.end(JSON.stringify(body));
}

function formatSearchVal(searchVal){
	var wordArray = searchVal.split(" ");
	var middleTerm = wordArray[0];
	for (var i = 1; i < wordArray.length; i++){
		if(wordArray[i].length != 0){
			middleTerm = middleTerm + "+" + wordArray[i];
		}
	}
	var searchTerm = '?s=\"' + middleTerm + "\"";
	console.log(searchTerm);
	return searchTerm
}

function formatDate(day, month, year) {
	var monthNum;

	switch (month){
		case "Jan":
			monthNum = 1;
			break;
		case "Feb":
			monthNum = 2;
			break;
		case "Mar":
			monthNum = 3;
			break;
		case "Apr":
			monthNum = 4;
			break;
		case "May":
			monthNum = 5;
			break;
		case "Jun":
			monthNum = 6;
			break;
		case "Jul":
			monthNum = 7;
			break;
		case "Aug":
			monthNum = 8;
			break;
		case "Sep":
			monthNum = 9;
			break;
		case "Oct":
			monthNum = 10;
			break;
		case "Nov":
			monthNum = 11;
			break;
		case "Dec":
			monthNum = 12;
			break;

	}
	var date = year + "-" + month + "-" + day
	var formattedDate = new Date(date)
	return formattedDate
}

function contains(a, obj) {
    var i = a.length;
    while (i--) {
       if (a[i] === obj) {
           return true;
       }
    }
    return false;
}

function getUsauArticles(newArticles, callback){
	var url = 'http://www.usaultimate.org/news/default.aspx';
	request(url, function(err, resp, body){

		//Check for error
	    if(err){
	        return console.log('Error:', err);
	    }

	    //Check for right status code
	    if(resp.statusCode !== 200){
	        return console.log('Invalid Status Code Returned:', resp.statusCode);
	    }

		  $ = cheerio.load(body);
		  var listElements = $('.bold')
		  var datesPosted = $('.time');
		  var formattedDate, articleName;
		  $(datesPosted).each(function(i, date){
	  	  	var dateHTML = $(date).html();
	  	  	var splittedDate = dateHTML.substring(0,21).split(" ")
	  	  	formattedDate = formatDate(splittedDate[1], splittedDate[0], splittedDate[2])
	  	  	articleName = $(listElements[i]).text()
	  	  	if (formattedDate >= todayDate && !contains(todayArticles, articleName)){
	  			newArticles.push($(listElements[i]).attr("href"));
	  			todayArticles.push(articleName)
	  		}
		  });
		  callback(newArticles);
	});
}

function getOnePageArticles(searchTerm, year, callback){
	var url = "http://www.ultiworld.com/";
	request(url + searchTerm, function(err, resp, body){

		//Check for error
	    if(err){
	        return console.log('Error:', err);
	    }

	    //Check for right status code
	    if(resp.statusCode !== 200){
	        return console.log('Invalid Status Code Returned:', resp.statusCode);
	    }

		  $ = cheerio.load(body);
		  var listElements = $('.snippet-excerpt__heading'); 		//list of articles
		  var datesPosted = $('.snippet-excerpt__byline');			//date for each article
		  var newArticles = [];
		  var formattedDate, articleName;
		  $(datesPosted).each(function(i, date){
	  	  	var dateHTML = $(date).html();
	  	  	var splittedDate = dateHTML.substring(0,21).split(" ")
			var month = splittedDate[4]
			var day = splittedDate[5]
			var year = splittedDate[6]
	  	  	formattedDate = formatDate(day, month, year);
	  	  	articleName = $(listElements[i]).children().text()
	  		if (formattedDate >= todayDate && !contains(todayArticles, articleName)){
	  			newArticles.push($(listElements[i]).children().attr('href'));
	  			todayArticles.push(articleName)
	  		}
		  });
		  callback(newArticles);
	});
}
