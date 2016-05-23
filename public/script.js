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

function saveFile(filename){
	//Send an AJAX request to save; once we get the result, redirect to result URL
	$.ajax({
		method: "POST",
		url: "/save_file",
		header: {
			"Cookie": document.cookie
		},
		data: {
			uid: pavCtx.uid,
			code: editor.getValue()
		}
	})
	.fail(function(xhr, status, error){
		console.log(xhr.status.code);
	})
	.done(function(message){
		window.location.replace("/file/" + message.fid);
	});
};

window.onload = function(){
	$("#run").click(function() {
		sendRequest();
	});
	$("#share").click(function() {
		sendRequest();
	});
	
	$("#save-file-button").click(function() {
		var filename = $("#file-name").val()
		if(filename == null || filename.length < 1){
			$('#file-name').tooltip({ title: "You must enter a filename." })
			return;
		}
		saveFile(filename);
		$("#save-modal").modal("hide");	
	});
	try {
		$("#login-message").text("Welcome " + pavCtx.name + ".");
	} catch (e) {}

	editor = CodeMirror.fromTextArea(document.getElementById("code"), {
		lineNumbers: true,
		mode: "javascript",
		lineWrapping: true
	});
};
