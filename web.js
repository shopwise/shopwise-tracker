var cluster = require('cluster');

var port = parseInt(process.env.PORT || 1337);
var app = require("./app");

cluster(__dirname + '/app')
  .set("workers", 3)
  .listen(port, function() {
  		console.log("Listening on " + port);
	});