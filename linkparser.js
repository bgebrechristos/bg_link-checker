var chalk = require('chalk');
var request = require("request");
var cheerio = require("cheerio");
var URL = require("url");
var ProgressBar = require("progress");

module.exports = function (urls, creds) {
	return new Promise(function(resolve,reject) {
		var auths = { auth : creds };
		var links = [];
		var count = urls.length;
		
		console.log("Loading urls for testing .....");
	
		var bar = new ProgressBar("Evaluating ... [:bar] :percent :etas", {
			complete: "=",
			incomplete: " ",
			width: 30,
			total: urls.length,
			stream: process.stderr
		});
	
		urls.forEach(function(flag) {
			var obj = {
				source: flag,
				results: []
			};
			request(flag, auths, function(err, res, html) {
				if(err) return reject(err);
				//grab the body
				var $ = cheerio.load(html);
				
				//parsing all links with a tag
				$('a').each(function() {
						if ($(this).attr('href').match(/^(http|https|www)/)) {
							var hrefLinks = {
								url: $(this).attr('href')	
							};
						} else {
							var hrefLinks = {
								url: URL.resolve(flag, $(this).attr('href')),
							};
						}
						obj.results.push(hrefLinks);
				});
	
				//parsing javascript links
				$('script').each(function() {
					if($(this).attr('src') !== undefined) {
						if ($(this).attr('src').match(/^(http|https|www)/)) {
							var scriptLinks = {
								url: $(this).attr('src'),
							};
						} else {
							var scriptLinks = {
								url: URL.resolve(flag, $(this).attr('src')),
							};
						}
						obj.results.push(scriptLinks);
					}
				});
	
				//parsing css links
				$('link').each(function() {
					if ($(this).attr('href').match(/^(http|https|www)/)) {
						var cssLinks = {
							url: $(this).attr('href'),
						};
					} else {		
						var cssLinks = {
							url: URL.resolve(flag, $(this).attr('href')),
						};	
					}		
					obj.results.push(cssLinks);
				});
				
				var counter2 = obj.results.length;
	
				obj.results.forEach(function (url) { 	
	
					request(url.url, auths, function (err, res) {
	
						if (err) {
							url.statusCode = err.message;
						} else {
							url.statusCode = res.statusCode;
						}
						
						counter2--;
						
						if (counter2 === 0) {
							
							count--;
							bar.tick();
							links.push(obj);
							
							if (count === 0) {
								resolve(links);
							}
						}
					});
				});
			});
		});
	});
}// end of linkparser
