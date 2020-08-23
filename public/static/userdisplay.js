window.onload = function() {

	var receiver = document.getElementById('receiver').contentWindow;
	var btn = document.getElementById('send');
	function sendMessage(e) {
		e.preventDefault();
		receiver.postMessage(localStorage.getItem("JWTSessionID"), '*');
	}

	btn.addEventListener('click', sendMessage);
}
