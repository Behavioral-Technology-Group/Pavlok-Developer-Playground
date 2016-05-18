var pavlok = require('pavlok-beta-api-login');
var express = require('express');
var SandCastle = require('sandcastle').SandCastle;

//Setup the app
var app = express();
app.use(express.static(__dirname + "/public"));

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
	if(pavlok.isLoggedIn(req)){
		return res.redirect("index.html");
	} else {
		pavlok.auth(req, res);
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
app.post("/run", function(req, res){
	if(!pavlok.isLoggedIn(req)) return res.status(401).send("Not authorized.");
	if(req.body.code == null) return res.status(400).send("No code sent.");

	var token = pavlok.getToken(req); //Token to use for stimuli
	var code = req.body.code;

	//Expose Pavlok functions

	//Run the damn thing
	var sandcastle = new SandCastle();

	var script = sandcastle.createScript(code);
	script.on('exit', function(err, output) {
		if(err) return res.status(500).send(err);
		return res.status(200).send(output);
	});
	script.run({});
});

//Start the server
app.listen(process.env.PORT || 3000, function(){
	console.log("Visit the IP address of this machine, or http://localhost:80/.");
});
