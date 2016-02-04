var program = require("commander");
var chalk = require('chalk');
var fs = require("fs");
var request = require("request");
var prompt = require("prompt");
var colors = require("colors");
var URL = require("url");
var terminal = require("./terminal.js");
var linkparser = require("./linkparser.js");


program
	.usage('\<[options] <file | page url\>')
	.version('0,0,1')
	.option('-h, --help', 'Outputs usage information')
	.option('-F, --file <item>', 'Path to a filem, containing a newline separated list of URLs')
	.option('-U, --url <item>', 'URL(s) separated by a comma, Eg- \"http://www.apple.com\"')
	.parse(process.argv);

var AUTH_PROMPT = {
	properties : {
		user : { description: "Username:".blue, required: true },
		pass : { description : "Password:".blue, required:true, hidden:true }
	}
};

var counter = 0;

var nullAuth = {user: null, pass: null };


if (process.argv.length <= 2) {
	print(chalk.red("Please enter atleast one option"));
	program.help();
	program.exit();
} else {
	if (program.file) {
		getFileContent(program.file).then(function(lines){
			return checkForAuth(lines);
		}, function(err) {
			if (err.message.indexOf("ENOENT") > -1) {
				error("Oops ==> " + err.message + "\n");
				return program.help();
			} else {
				error(err.message);
			}
		}).then(function(links) {
			//console.log(JSON.stringify(links, null, 4));
			terminal.output(links);
		}, function(err) {
			error(err);
		});
	}
	
	if (program.url) {
		var option = program.url.split(',');
		checkForAuth(option).then(function(links) {
			terminal.output(links);
		}, function(err) {
			error(err);
		});
	}
}

function error(msg) {
	print(chalk.red(msg));
}
function print(msg) {
	console.log(msg);
}

function getFileContent(file) {
	return new Promise(function(resolve, reject) {
		 fs.readFile(file, function(err, fileInput) {
			if (err) {
				reject(err);
			}
			var lines = fileInput.toString().split('\n').map(function(flags) {
				return flags.trim();
				}).filter(function(flags) {
					return flags.length;
				});
				resolve(lines);
			});
	}); 
}//end of getFileContent




function checkForAuth(urls) {
	return new Promise(function(resolve,reject) {
		request(urls[0], function(err, res) {
			if (err) {
				reject(err);
			} else {
				if (res.statusCode === 401) {
					promptForAuthentication(urls[0]).then(function(creds) {
						return linkparser(urls,creds);
					}, function(err) {
						reject(err);
					}).then(function(links){
						resolve(links);
					});
					
				} else {
					linkparser(urls,null).then(function(links) {
						resolve(links);
					}, function(err) {
						reject(err);
					});
				}
			}
			
		});
	})
} //end of checkForAuth

function promptForAuthentication(url) {
	return new Promise(function(resolve, reject) {
		prompt.start();
		prompt.message = null;
		prompt.delimiter = "";
		prompt.get(AUTH_PROMPT, function(err, creds) {
			if (err) {
				throw err;
			} else {
				request(url, { auth: creds } , function(err, res) {
					if(err) {
						throw err;
					}
					else {
						if (res.statusCode !== 401) {
							resolve(creds);
						} else {
							counter++;
							if (counter < 3) {
								error("Invalid credential, please try again!");
								promptForAuthentication(url);
							} else {
								counter = 0;
								resolve(chalk.red("You reached the max number of trials, Good bye!"), null);
								process.exit(0);
							}
						}						
					}

				});
			}
		});
	});
}
