var editor = null;
var startTime = null;

//Library of functions for user-scripts to use
function getFormattedTime(){
	var tDelta = new Date().getTime() - startTime;
	return (tDelta / 1000).toFixed(3);
};

var log = {};
log.info = function(message){
	$("#logs").append("<div class=\"log-info\">" + getFormattedTime() + " - " + message + "</div>");
};

log.error = function(message){
	$("#logs").append("<div class=\"log-error\">" + getFormattedTime() + " - " + message + "</div>");
};

log.warn = function(message){
	$("#logs").append("<div class=\"log-warn\">" + getFormattedTime() + " - " + message + "</div>");
}

log.clear = function(){
	$("#logs").html("");
}

var pavlok = {};
pavlok.generic = function(route, percent){
	//Fetch auth code
	var authCode = pavCtx.auth;
	var intensity = Math.floor(percent * 2.55);
	if(intensity > 255) intensity = 255;
	if(intensity < 0) intensity = 1;
	
	$.ajax({
		"url": "http://pavlok-mvp.herokuapp.com/api/v1/me",
		"data": {
			"access_token": authCode
		/*	"reason": "Hello from the Developer Playground!" */
		}
	})
	.done(function(message){
		$("#result").append("<div>" + message + " delivered successfully.</div>");
	})
	.fail(function(xhr, status, error){	
		$("#result").append("<div>Failed to send " + route + "!</div>");
	});
};
pavlok.beep = function(percent){
	pavlok.generic("beep", percent);
};


function sendRequest(){
	//(1) Fetch contents of textarea
	var code = editor.getValue();

	//(2) Disable button
	 $("#run").button("loading");
	 
	 //(3) Setup logs
	 $("#result").html("");
	 log.clear();
	 startTime = new Date().getTime();
	 
	//(4) Evaluate the script -- this CAN and will lead to issues if they overwrite stuff on the page, but whatever -- no risk to the server
	var result = "?";
	try {
		eval(code);
		result = "Script completed in " + ((new Date().getTime() - startTime) / 1000).toFixed(2) + " seconds.";	
	} catch(e) {
		result = "Your script encountered an error: " + e;
	}
	
	$("#run").button("reset");
	$("#result").append("<div>" + result + "</div>");
};

window.onload = function(){
	$("#run").click(function() {
		sendRequest();
	});

	editor = CodeMirror.fromTextArea(document.getElementById("code"), {
		lineNumbers: true,
		mode: "javascript",
		lineWrapping: true
	});
};
