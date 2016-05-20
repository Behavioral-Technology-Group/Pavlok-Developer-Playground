var pavlok = require('pavlok-beta-api-login');
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var pg = require('pg');
pg.defaults.ssl = true;

//Setup the app
var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(function(req, res, next){
	res.header('X-XSS-Protection', 0);
	next(); 
});

//Postgres connect
var client;
pg.connect(process.env.DATABASE_URL, function(err, cli){
	if(err){
		console.log("Error connecting to Postgress. Are you running in an environment without process.env.DATABASE_URL?");
	} else {
		console.log("Connected to Postgres!");
		client = cli;
	}
});

//Serve the success page with some necessary pre-serve tweaks
app.get("/success", function(req, res){
	//Get /me from Pavlok using access token
	var token = req.query.code;
	var queryParams = {
		access_token: token
	};
	
	request({
		url: "https://pavlok-mvp.herokuapp.com/api/v1/me",
		qs: queryParams,
		method: 'GET',
	}, function(error, response, body){
		if(error){
			console.log(JSON.stringify(error));
			res.redirect("/error");
		} else {
			var meResponse = JSON.parse(body);
			setupQuery("SELECT FROM Users WHERE uid=$1",
				[meResponse.uid],
				function(error, rows){
					if(!error && rows.length > 0){
						//Update the user
						setupQuery("UPDATE Users SET token=$1 WHERE uid=$2",
							[token, meResponse.uid],
							function(error, rows){
								if(error){
									res.status(500).send("Failed to update the user!");
								} else {
									establishSession(req, res, meResponse);
								}
							});	
					} else {
						//Insert the user
						setupQuery("INSERT INTO Users(uid, name, token) VALUES ($1, $2, $3)",
							[meResponse.uid, meResponse.name, token],
							function(error, rows){
								if(error){
									res.status(500).send("Failed to insert the user!");
								} else {
									establishSession(req, res, meResponse);					
								}
							});
					}
				});	
		}
	});
});

//Create a session and drop the required cookies
function establishSession(req, res, meResponse){
	var sid = uuid.v4();
	setupQuery("INSERT INTO Session (uid, session_id) VALUES ($1, $2)",
		[meResponse.uid, sid],
		function(error, rows){
			if(error){
				res.status(500).send("Failed to create session!");
			} else {
	//			req.session.sid = sid;
				res.send("Created with SID " +  sid + ".");
			}
		});
}

//Initialize the app
pavlok.init(
	"e3ae6d5fd801450de22db816c0fc44abb2d12526c52b401a3346d3e59a3663f2",
	"27dd8880146f2c8574ed89df6d03658900384548026d6f8ee83f34b3442584d0", {
		"verbose": true,
		"app": app,
		"message": "Hello from the developer playground!",
		"callbackUrl": "https://pavlok-developer-playground.herokuapp.com/auth/result",
		"callbackUrlPath": "/auth/result",
		"successPath": "/success",
		"errorPath": "/error",
		"successWithCode": true
	}
);

//Tweak the Pavlok object to enable getting the token
pavlok.getToken = function(request){
	return request.session.pavlok_token;
};

function setupQuery(queryText, params, callback){
	var query = client.query(queryText, params);
	query.on('row', function(row, result){
		result.addRow(row);
	});
	query.on('error', function(error){
		console.log("Error while executing query: " + queryText);
		console.log("Parameters were:");
		for(var i = 0 ; i < params.length; i++){
			console.log(params[i]);
		}
		console.log("Error was: " + JSON.stringify(error));
		callback(error, null);
	});
	query.on('end', function(result){
		callback(null, result.rows);
	});
}



//Serve the homepage
app.get("/", function(req, res){
	console.log("Fetching index; is logged in=" + pavlok.isLoggedIn(req));
	if(pavlok.isLoggedIn(req)){
		return res.sendFile(__dirname + "/public/home.html");
	} else {
		console.log("Redirecting to authentication...");
		pavlok.auth(req, res);
	}
});

//TODO: app.get(...) on /doc/[fileID] route

//Serve the context object -- this actually provides the information used
//on the client
app.get("/context.js", function(req, res){
	res.setHeader("Content-Type", "text/javascript");
	if(pavlok.isLoggedIn(req)){
		var context = "var pavCtx = ";
		var contextObject = {
			"auth": pavlok.getToken(req)
		};
		context += JSON.stringify(contextObject);
		context += ";";
		res.status(200).send(context);

		//TODO: Fetch from /me here; CREATE/UPDATE the User records
	} else {
		res.status(401).send("var pavCtx = {};");
	}
});

//Logout of the server
app.get("/logout", function(req, res){
	if(pavlok.isLoggedIn(req)){
		pavlok.logout(req);
		return res.status(200).send("Logged out.");
	} else {
		return res.status(404).send("You weren't signed in.");
	}
});

app.use(express.static(__dirname + "/public"));

//Start the server
app.listen(process.env.PORT || 3000, function(){
	console.log("Visit the IP address of this machine, or http://localhost:3000/.");
});
