
function sendMessage(event){
    var userData = {
    'jwt': localStorage.getItem("JWTSessionID"),
    'language': "EN",
    'baseURL': "http://dvws.local/checkadmin",
};

event.postMessage(msg,'*')
}

window.onload = function() {

	var receiver = document.getElementById('receiver').contentWindow;
	var btn = document.getElementById('send');
	function sendMessage(e) {
		e.preventDefault();
		receiver.postMessage(localStorage.getItem("JWTSessionID"), '*');
	}

	btn.addEventListener('click', sendMessage);
}