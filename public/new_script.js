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

function postEditorInit(){
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
	
	//Set default text in editor
	editor.setValue("//Write your code here! If you're stuck, try a snippet");
};
