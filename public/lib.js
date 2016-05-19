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
		"url": "https://pavlok-mvp.herokuapp.com/api/v1/stimuli/" + 
			route + "/" + intensity + "?access_token=" + authCode +
			"&reason=Hello from the developer playground!",
		"method": "POST"
	})
	.done(function(message){
		$("#result").append("<div>" + route.substring(0, 1).toUpperCase() + route.substring(1) + " delivered successfully.</div>");
	})
	.fail(function(xhr, status, error){	
		$("#result").append("<div>Failed to send " + route + "!</div>");
	});
};
pavlok.beep = function(percent){
	pavlok.generic("beep", percent);
};
pavlok.zap = function(percent){
	pavlok.generic("zap", percent);
};
pavlok.vibrate = function(percent){
	pavlok.generic("vibration", percent);
};
