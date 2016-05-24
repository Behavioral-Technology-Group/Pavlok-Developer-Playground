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

function insertSnippet(snippetId){
	if(snippetDictionary[snippetId] !== undefined){
		editor.replaceSelection(snippetDictionary[snippetId]);
	}
}

window.onload = function(){
	editor = CodeMirror.fromTextArea(document.getElementById("code"), {
		lineNumbers: true,
		mode: "javascript",
		lineWrapping: true
	});
	
	//Populate file listings
	if(pavCtx.ownedFiles !== "undefined"){ //Check needed for shared files
		for(var i = 0; i < pavCtx.ownedFiles.length; i++){
			$("#file-menu").append("<li><a href=\"/file/" + pavCtx.ownedFiles[i].id + "\">" + pavCtx.ownedFiles[i].name + "</a></li>");
		}
		$("#file-menu").append("<li class=\"dropdown-header\">Shared Files</li>");
		for(var i = 0; i < pavCtx.sharedFiles.length; i++){
			$("#file-menu").append("<li><a href=\"/file/" + pavCtx.sharedFiles[i].id + "\">" + pavCtx.sharedFiles[i].name + "</a></li>");
		}
	}
	
	//Enable snippets
	$('*[id^=_snippet_]').each(function(i, el) {
		$(this)[0].addEventListener("click", function(e) {
			var snippetId = this.id.replace("_snippet_", "");
			insertSnippet(snippetId);
			$("#snippets-modal").modal("hide");
		}); 
	});
	
	postEditorInit();
};
