var editor = null;

var snippetDictionary = {
	zap: "pavlok.zap(50);",
	beep: "pavlok.beep(50);",
	vibrate: "pavlok.vibrate(50);",
	loginfo: "log.info(\"Informative message!\");",
	logerror: "log.error(\"Error message!\");",
	logwarn: "log.warn(\"Warning message!\");"
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
			code: editor.getValue(),
			fname: $("#file-name").val()
		}
	})
	.fail(function(xhr, status, error){
		console.log(xhr.status.code);
	})
	.done(function(message){
		window.location.replace("/file/" + message.fid);
	});
};

function insertSnippet(snippetId){
	if(snippetDictionary[snippetId] !== undefined){
		var code = editor.getValue();
		if(code.length == 0 || code.substring(code.length - 1, code.length) == "\n"){
			editor.setValue(code + snippetDictionary[snippetId]);
		} else {
			editor.setValue(code + "\n" + snippetDictionary[snippetId]);
		}
	}
}

window.onload = function(){
	$("#run").click(function() {
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
	
	editor = CodeMirror.fromTextArea(document.getElementById("code"), {
		lineNumbers: true,
		mode: "javascript",
		lineWrapping: true
	});
	
	//Populate file listings
	for(var i = 0; i < pavCtx.ownedFiles.length; i++){
		$("#file-menu").append("<li><a href=\"/file/" + pavCtx.ownedFiles[i].id + "\">" + pavCtx.ownedFiles[i].name + "</a></li>");
	}
	$("#file-menu").append("<li class=\"dropdown-header\">Shared Files</li>");
	for(var i = 0; i < pavCtx.sharedFiles.length; i++){
		$("#file-menu").append("<li><a href=\"/file/" + pavCtx.sharedFiles[i].id + "\">" + pavCtx.sharedFiles[i].name + "</a></li>");
	}
	
	//Enable snippets
	$('*[id^=_snippet_]').each(function(i, el) {
		$(this)[0].addEventListener("click", function(e) {
			var snippetId = this.id.replace("_snippet_", "");
			insertSnippet(snippetId);
			$("#snippets-modal").modal("hide");
		}); 
	});
	
	//Set default text in editor
	editor.setValue("pavlok.vibrate(50);");
};
