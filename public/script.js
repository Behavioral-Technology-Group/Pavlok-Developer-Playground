function sendRequest(){
	//(1) Fetch contents of textarea
	var code = editAreaLoader.getValue("code");
	
	//(2) Disable button
	 $("#run").button("loading");
	
	//(3) Send the AJAX request
	$("#run").button("reset");

	$.ajax("/run", {
		"data": JSON.stringify({
			"code": code,
		}),
		"method": "POST",
		
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
