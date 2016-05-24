function saveFile(){
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

function deleteFile(){
	$.ajax({
		method: "POST",
		url: "/delete_file",
		header: {
			"Cookie": document.cookie
		},
		data: {
			fid: fileCtx.id
		}
	})
	.fail(function(xhr, status, error){
		toastr.error("Failed to delete file.");
	})
	.done(function(message){
		toastr.success("File deleted.");
		setTimeout(function(){
			window.location.replace("/");
		}, 750);
	});
};

function postEditorInit(){
	$("#run").click(function() {
		sendRequest();
	});
	
	$("#save").click(function() {
		saveFile();
	});
	
	$("#delete").click(function() {
		deleteFile();
	});
	
	//Set file name
	$("#file-menu-button").html(fileCtx.fileName + " <span class=\"caret\"></span>");
	
	//Set file text in editor
	editor.setValue(unescape(fileCtx.content));
};
