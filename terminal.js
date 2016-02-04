var chalk = require('chalk');
var colors = require("colors");

exports.output = function (links) {
	var finalLink = [];
	
	links.forEach(function(flag) {
		var obj = {
			page: flag.source,
			result: {
				pass: [],
				fail: []
			}
		}
		var count = flag.results.length;
		flag.results.forEach(function(item) {
			if(item.statusCode !== 404) {
				obj.result.pass.push(item.url);
			} else {
				obj.result.fail.push(item.url);
			}
			count --;
			if(count === 0) {
				finalLink.push(obj);
			}
		});
	});
	//console.log(JSON.stringify(finalLink, null, 4));
	//console.log(finalLink.page);
	
	console.log(("\t--------------RESULT--------------\t").inverse);
	finalLink.forEach(function(flag) {
			if(flag.result.pass.length) {
				console.log(chalk.yellow("\t---------------------------------------"));
				console.log("\tPAGE => " + chalk.bold(flag.page));
				console.log(chalk.blue("\t" + chalk.underline(flag.result.pass.length + " link\(s\) passed")));
				
			}
			
	});
	
	finalLink.forEach(function(flag) {
			if(flag.result.fail.length) {
				console.log(chalk.yellow("\t---------------------------------------"));
				console.log("\tPAGE => " + chalk.bold(flag.page));
				console.log(chalk.red("\t" + chalk.underline(flag.result.fail.length + " link\(s\) failed")));
				flag.result.fail.forEach(function(item) {
						console.log("\t" + item);
				});
			}
	});
}