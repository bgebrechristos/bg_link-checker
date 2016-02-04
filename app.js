var program = require("commander");
var chalk = require('chalk');
var fs = require("fs");
var request = require("request");
var prompt = require("prompt");
var cheerio = require("cheerio");
var colors = require("colors");
var URL = require("url");
var ProgressBar = require("progress");

program
	.usage('\<[options] <file | page url\>')
	.version('0,0,1')
	.option('-h, --help', 'Outputs usage information')
	.option('-F, --file <item>', 'enter a proper file information')
	.option('-U, --url <item>', 'enter a page URL with absolute path, Eg- \"http://www.apple.com\"')
	.parse(process.argv);

var AUTH_PROMPT = {
	properties : {
		user : { description: "Username:".blue, required: true },
		pass : { description : "Password:".blue, required:true, hidden:true }
	}
};

var counter = 0;

var appendProtocol = /^[^https?:]/;

var nullAuth = {user: null, pass: null };


if (process.argv.length <= 2) {
	print(chalk.red("Please enter atleast one option"));
	program.help();
	program.exit();
} else if (!process.argv) {
	print(chalk.red("You need to pick atleast one option"));
	program.help();
	program.exit();
}
else {
	if (program.file) {
		getFileContent(program.file, function(err, result) {
			if (err) {
				if (err.message.indexOf("ENOENT") > -1) {
					error("Oops ==> " + err.message + "\n");
					return program.help();
				} else {
					error(err.message);
				}
			} else {
				checkForAuth(result, function(err, links) {
					if(err) error(err);

		  			//console.log(JSON.stringify(links, null, 4));
		  			terminalOut(links);
       			});
      		}
    	});
	}
	if (program.url) {
		var option = program.url.split(',');
		checkForAuth(option, function(err, links) {
			if (err) {
				error(err);
			} else {
				terminalOut(links);
			}
		});
	}
}

function error(msg) {
	print(chalk.red(msg));
}
function print(msg) {
	console.log(msg);
}

function getFileContent(file, callback) {
  fs.readFile(file, function(err, fileInput) {
    if (err) {
      return callback(err);
  }
  var lines = fileInput.toString().split('\n').map(function(flags) {
		return flags.trim();
	}).filter(function(flags) {
		return flags.length;
	});
  callback(null, lines);
  });
}




function checkForAuth(urls, cb) {
	request(urls[0], function(err, res) {
		if (err) {
			return cb(err);
		}
		if (res.statusCode === 401) {
			promptForAuthentication(urls[0], function(err, creds) {
				if(err) print(err);
				else {
					parseLinks(urls, creds, function(err, links) {
						if(err) {
							cb(err);
						} else {
							cb(null, links);	
						}
        			});
				}
			});
		}
		else {
			parseLinks(urls, null, function(err, links) {
				if(err) return cb(err);
				cb(null, links);
			});
		}
	});
} //end of checkForAuth



function parseLinks(urls, creds, cb) {
	var auths = { auth : creds };
	var links = [];
	var count = urls.length;
	
	print("Loading urls for testing .....");

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
			if(err) return cb(err, null);
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
							cb(null, links);
						}
					}
				});
			});
		});
	});
}// end of parseLinks


function promptForAuthentication(url, cb) {
	prompt.start();
	prompt.message = null;
	prompt.delimiter = "";
		prompt.get(AUTH_PROMPT, function(err, creds) {
			if (err) throw err;
			request(url, { auth: creds } , function(err, res) {
				if(err) throw err;
				if (res.statusCode !== 401) {
					cb(null, creds);
				} else {
					counter++;
					if (counter < 3) {
						error("Invalid credential, please try again!");
						promptForAuthentication(url, cb);
					} else {
						counter = 0;
						cb(chalk.red("You reached the max number of trials, Good bye!"), null);
						process.exit(0);
					}
				}
			});
		});
}


function terminalOut(links) {
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
	
	print(("\t--------------RESULT--------------\t").inverse);
	finalLink.forEach(function(flag) {
			if(flag.result.pass.length) {
				print(chalk.yellow("\t---------------------------------------"));
				print("\tPAGE => " + chalk.bold(flag.page));
				print(chalk.blue("\t" + chalk.underline(flag.result.pass.length + " link\(s\) passed")));
				
			}
			
	});
	
	finalLink.forEach(function(flag) {
			if(flag.result.fail.length) {
				print(chalk.yellow("\t---------------------------------------"));
				print("\tPAGE => " + chalk.bold(flag.page));
				print(chalk.red("\t" + chalk.underline(flag.result.fail.length + " link\(s\) failed")));
				flag.result.fail.forEach(function(item) {
						print("\t" + item);
				});
			}
	});
}