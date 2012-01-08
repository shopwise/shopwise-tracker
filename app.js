/*
* AVAILABLE ENVIRONMENT VARIABLES
* -------------------------------
* - LOG_LEVEL[="debug"]
* - MONGODB_URL[="mongodb://localhost:27017/shopwise-tracker"]
* - FORCE_SSL[=false]
*
*/

// -------------------
// Module dependencies
// -------------------
var Log = require('log')
  , log = new Log(process.env.LOG_LEVEL || "debug"); 

var Express = require('express')
	, configure = require('express-configure')
	, app = Express.createServer(Express.logger());

var JSV = require('JSV').JSV
	, jsv = JSV.createEnvironment('json-schema-draft-03')
	, jsv_env = new JSV.Environment();

var MongoSkin = require("mongoskin")
	, db = MongoSkin.db(process.env.MONGODB_URL || 'mongodb://localhost:27017/shopwise-tracker')
	, devices = db.collection("devices")
	, users = db.collection("users")
	, sessions = db.collection("sessions");

module.exports = app;

// ---------
// SCHEMAS
// ---------	
var iso8601_pattern = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/
	, email_pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

var validation_schema = {
	"type" : "object",
  "properties" : {
		"begin" : { 
			"type" : "string", 
			"required" : true,
			"pattern" : iso8601_pattern
		},
		"end" : { 
			"type" : "string", 
			"required" : true,
			"pattern" : iso8601_pattern
		},
		"app_version" : {"type" : "string", "required" : true},
		"device" : {
			"type" : "object",
			"required" : true,
			"properties" : {
				"uid" : { "type" : "string", "required" : true },
				"model" : { "model" : "string", "required" : false }
			}
		},
		"platform" : {
				"type" : "object",
				"required" : true,
				"properties" : {
					"name" : { "type" : "string", "required" : true },
					"version" : { "type" : "string", "required" : true }
				}
		},
		"user" : {
				"type" : "object",
				"required" : false,
				"properties" : {
					"email" : { 
						"type" : "string", 
						"required" : true, 
						"pattern" : /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
					}
				}
		},
		"events" : {
			"type" : "array",
			"required" : true,
			"items" : {
					"name": { "type" : "string", "required" : true },
					"params" : {
						"type" : "object",
						"required" : true
					}
			}
		}
	}
}



// -------------
// Configuration
// -------------
app.configure( function(done) {
	app.use(Express.bodyParser());
	jsv_env.setOption("strict", true);
 	done();
});

// -------------
// Routes
// -------------
app.get('*',function(req,res,next){
	if (	 process.env.FORCE_SSL != true 
		  || req.headers["x-forwarded-proto"] === "https"){
		return next();
	}
 	res.redirect("https://" + req.headers.host + req.url);	
});

app.get('/', function(request, response) {
		response.send("WELCOME TO THE SHOPWISE TRACKER...");
});

app.post('/sessions', function(request, response) {
		
		//
		// SYNCHRONOUS TREATMENT => JSON validation
		//
		var error = null;
		var result = null;
		var status = 200;
		
		var session_json = request.body;
		
		try{
				report = jsv.validate(session_json, validation_schema);
				
				if(report.errors.length > 1){
					throw {"message":"JSON validation error", "errors" : report.errors};
				}
				
				result = "OK";
				
		} catch (err) {
			log.info("Failed to parse session message => " + err );
			status = 400;
			error = err;
		}
		
		response.setHeader("Content-Type", "application/json");
		response.statusCode = status;
		response.send({status: status, error: error, result: result});
		
		if(error){ return; }
		
		//
		// ASYNCHRONOUS TREATMENT => Save it to the DB
		//
		var device_hash = session_json.device;
		if(device_hash){
			log.debug("device:before");
			devices.update({ "uid" : device_hash.uid }, { $set: device_hash}, {upsert: true}, function(err){
				handle_mongo_callback("devices", err);
			});
		}
	 	var user_hash = session_json.user;
	 	if(user_hash){
	 	 	log.debug("user:before");
	 	 	users.update({ "email" : user_hash.email }, { $set: user_hash }, {upsert: true}, function(err){
	 	 		handle_mongo_callback("users", err);
	 	 	});
	 	}
	 	 
	 	log.debug("session:before");
	 	sessions.insert(session_json, {},  function(err){
				handle_mongo_callback("sessions", err);
	 	});
	 	 
		log.debug("END");
});


// --------
// UTILS
// --------
function handle_mongo_callback(collection_name, err){
		log.debug(collection_name + " : after");
		if(err){
					log.warning("Failed to save "+ collection_name+ " document. Error: " + err);
		}
}
