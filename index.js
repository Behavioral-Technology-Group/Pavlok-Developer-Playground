var pavlok = require('pavlok-beta-api-login');
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var handlebars = require('handlebars');
var uuid = require('node-uuid');
var pg = require('pg');
pg.defaults.ssl = true;

//Setup the app
var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cookieSession({
	name: "session",
	keys: [ "asessionkeythisis" ]
}));
app.use(function(req, res, next){
	console.log("-------------------------------");
	console.log(req.url + " requested from " + (req.connection.remoteAddress || req.ip));
	if(req.body && Object.keys(req.body).length > 0){
		console.log("Body: " + JSON.stringify(req.body));
	}
	if(req.params && Object.keys(req.params).length > 0){
		console.log("Params: " + JSON.stringify(req.params));	
	}

	res.header('X-XSS-Protection', 0);

	//For everything but the normal file browse routes and context script, we 
	//proceed to the next route
	if(req.url != "/" && req.url != "/context.js" && req.url != "/index.html" 
		&& !req.url.startsWith("/file/")){
		next();
		return;
	}

	//Perform user lookup for the / route and the /context.js route to let 
	//these routes populate themselves as needed with user information, or redirect
	//to a proper page
   	if((req.session.sid === undefined || req.session.sid == null)
		&& req.query.sid == null){
		console.log("Couldn't find SID; this route needes authentication!");
		pavlok.auth(req, res);
	} else {
		console.log("Found SID; looking for matching user...");
		setupQuery("SELECT * FROM Session s INNER JOIN Users u ON u.uid=s.uid WHERE session_id=$1",
			[req.session.sid || req.query.sid],
			function(error, rows){
				if(error){
					console.log("Session fetch error!");
					pavlok.auth(res, req);
				} else {
					console.log("Fetched user: " + rows[0].name + "(" + rows[0].uid + ")");
					req.pavuser = { //We populate the 'pavuser' object
						uid: rows[0].uid,
						name: rows[0].name,
						token: rows[0].token	
					};
					next();
				}
			});
	}
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


//Create a session and drop the required cookies
function establishSession(req, res, meResponse){
	var sid = uuid.v4();
	setupQuery("DELETE FROM Session WHERE uid=$1",
		[meResponse.uid],
		function(error, rows){
			if(error){
				res.status(500).send("Could not delete old sessions!");
			} else {
				setupQuery("INSERT INTO Session (uid, session_id) VALUES ($1, $2)",
					[meResponse.uid, sid],
					function(error, rows){
						if(error){
							res.status(500).send("Failed to create session!");
						} else {
							req.session.sid = sid;
							console.log("SID is now: " + req.session.sid );
							serveNewFile(req, res);
						}
					});
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
		"apiUrl": "https://pavlok-mvp.herokuapp.com",
		"successWithCode": true,
		"handleSessions": false
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

function serveNewFile(req, res){
	return res.sendFile(__dirname + "/public/index.html");
}

app.get("/", serveNewFile);

app.get("/file/:fname", function(req, res, next){
	res.send("Didn't do getting " + req.params.fname + " yet (I think there's a status code for this...)");
});

//Upload a file
app.post("/save_file", function(req, res){
	var code = req.body.code;
	var uid = req.body.uid;
	var shareType = "private";

	if(code == null || uid == null){
		res.status(400).send("No data given!");
		return;
	}

	setupQuery("INSERT INTO Files (owner, code, share_type) VALUES ($1, $2, $3) RETURNING fid",
		[uid, code, shareType],
		function(error, rows){
			if(rows.length > 0){
				res.send(200).json( { error: null, "fid": rows[0].fid } );
			} else {
				res.send(500).send(JSON.stringify(error));
			}
		});
});

//Serve the context object -- this actually provides the information used
//on the client-side for populating the page
app.get("/context.js", function(req, res){
	res.setHeader("Content-Type", "text/javascript");
	var context = "var pavCtx = ";
	var contextObject = {
		code: req.pavuser.token,
		name: req.pavuser.name,
		uid: req.pavuser.uid
	};
	context += JSON.stringify(contextObject);
	context += ";";
	res.status(200).send(context);

});

//Logout of the server
app.get("/logout", function(req, res){
	if(pavlok.isLoggedIn(req)){
		pavlok.logout(req);
		req.session.sid = null;
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
