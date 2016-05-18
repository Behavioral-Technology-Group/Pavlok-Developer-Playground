var pavlok = require('pavlok-beta-api-login');
var express = require('express');

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
		return res.status(200).send(pavlok.getToken(req)); 	
	} else {
		pavlok.auth(req, res);
	}
});

//Start the server
app.listen(80, function(){
	console.log("Visit the IP address of this machine, or http://localhost:80/.");
});
