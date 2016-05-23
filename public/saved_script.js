var editor = null;

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

function saveFile(){
	//Send an AJAX request to save; once we get the result, redirect to result URL
	$.ajax({
		method: "POST",
		url: "/update_file",
		header: {
			"Cookie": document.cookie
		},
		data: {
			fid: fileCtx.id,
			code: editor.getValue()
		}
	})
	.fail(function(xhr, status, error){
		toastr.error("Failed to save file.");
	})
	.done(function(message){
		toastr.success("File saved.");
	});
};

window.onload = function(){
	$("#run").click(function() {
		sendRequest();
	});
	
	$("#save").click(function() {
		saveFile();
	});
	
	editor = CodeMirror.fromTextArea(document.getElementById("code"), {
		lineNumbers: true,
		mode: "javascript",
		lineWrapping: true
	});
	
	//Set file text in editor
	editor.setValue(unescape(fileCtx.content));
};
