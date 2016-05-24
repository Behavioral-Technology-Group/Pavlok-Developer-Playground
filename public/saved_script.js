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

function changeVisibility(visibility){
	$.ajax({
		method: "POST",
		url: "/update_file",
		header: {
			"Cookie": document.cookie
		},
		data: {
			fid: fileCtx.id,
			share_type: visibility
		}
	})
	.fail(function(xhr, status, error){
		toastr.error("Failed to make file " + visibility + ".");
	})
	.done(function(message){
		toastr.success("File changed to " + visibility + ".");
		fileCtx.visibility = visibility;
		$("share-public").text(fileCtx.visibility == "public" ? "Make Private" : "Make Public");
	});
	
}

function postEditorInit(){
	$("#run").click(function() {
		sendRequest();
	});
	
	$("#save").click(function() {
		saveFile();
	});
	
	$("#share-public").click(function() {
		changeVisibility(fileCtx.visibility == "public" ? "private" : "public");
	});
	
	$("#delete").click(function() {
		deleteFile();
	});
	
	//Set visibility button
	$("share-public").text(fileCtx.visibility == "public" ? "Make Private" : "Make Public");
	
	//Set file name
	$("#file-menu-button").html(fileCtx.fileName + " <span class=\"caret\"></span>");
	
	//Set file text in editor
	editor.setValue(unescape(fileCtx.content));
};
