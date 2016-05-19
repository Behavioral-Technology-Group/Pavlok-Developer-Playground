var pavlok = require('pavlok-beta-api-login');
var express = require('express');
var bodyParser = require('body-parser');
var SandCastle = require('sandcastle').SandCastle;

//Setup the app
var app = express();
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(function(req, res, next){
	res.header('X-XSS-Protection', 0);
	next(); 
});

//Initialize the app
pavlok.init(
	"e3ae6d5fd801450de22db816c0fc44abb2d12526c52b401a3346d3e59a3663f2",
	"27dd8880146f2c8574ed89df6d03658900384548026d6f8ee83f34b3442584d0", {
		"verbose": true,
		"app": app,
		"message": "Hello from the developer playground!",
		"callbackUrl": "https://pavlok-developer-playground.herokuapp.com/auth/result",
		"callbackUrlPath": "/auth/result",
		"successUrl": "/success",
		"errorUrl": "/error"
	}
);

//Tweak the Pavlok object to enable getting the token
pavlok.getToken = function(request){
	return request.session.pavlok_token;
};

//Serve the pages
app.get("/", function(req, res){
	console.log("Fetching index; is logged in=" + pavlok.isLoggedIn(req));
	if(pavlok.isLoggedIn(req)){
		return res.send(__dirname + "/public/home.html");
	} else {
		pavlok.auth(req, res);
	}
});
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
	} else {
		res.status(401).send("var pavCtx = {};");
	}
});
app.get("/logout", function(req, res){
	if(pavlok.isLoggedIn(req)){
		pavlok.logout(req);
		return res.status(200).send("Logged out.");
	} else {
		return res.status(404).send("You weren't signed in.");
	}
});

//Start the server
app.listen(process.env.PORT || 3000, function(){
	console.log("Visit the IP address of this machine, or http://localhost:3000/.");
});
