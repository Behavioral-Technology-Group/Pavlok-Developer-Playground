function copyFile(){
	$.ajax({
		method: "POST",
		url: "/save_file",
		header: {
			"Cookie": document.cookie
		},
		data: {
			uid: pavCtx.uid,
			code: unescape(fileCtx.content), //fileCtx.content is the escaped code; unescape it when saving
			fname: fileCtx.fileName
		}
	})
	.fail(function(xhr, status, error){
		toastr.error("Error copying!");
	})
	.done(function(message){
		window.location.replace("/file/" + message.fid);
	});
};

function postEditorInit(){
	$("#run").click(function() {
		sendRequest();
	});
	
	$("#copy-file-button").click(function() {
		copyFile();
	});
	
	//Set the shared text in editor
	editor.setValue(unescape(fileCtx.content));
	
	//Set read-only
	editor.setOption("readOnly", true)
};
