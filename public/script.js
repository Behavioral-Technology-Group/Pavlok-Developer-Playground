function sendRequest(){
	//(1) Fetch contents of textarea
	var code = editAreaLoader.getValue("code");
	
	//(2) Disable button
	 $("#run").button("loading");
	
	//(3) Send the AJAX request
	$.ajax({
		"url": "/run",
		"processData": false,
		"contentType": "application/json",
		"data": JSON.stringify({
			"code": code,
			"auth": pavCtx.auth
		}),
		"method": "POST",
	})
	.done(function(message){
		$("#result").text(message);
	})
	.fail(function(xhr, status, error){	
		$("#result").text(xhr.responseText + " (" + xhr.status + "; " + error + ")");
	})
	.always(function(){
		$("#run").button("reset");
	});
};

window.onload = function(){
	$("#run").click(function() {
		sendRequest();
	});
	
	editAreaLoader.init({
		id : "code",
		syntax: "js",
		min_width: 600,
		min_height: 450,
		start_highlight: true,
		allow_toggle: false,
		allow_resize: false,
		toolbar: "undo, select_font, redo"
	});
};
