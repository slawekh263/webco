

const jsBaseUri = "js";

const txt_notLogged = "Logged out";

var sipStack = null;
var privateUserId = "testuser01";

/** Contains filters to be executed on the chate message */
var ChatMsgFilterChain = function() {
	
	this.filters = new Array();
	this.add =  function(filter) {
		// TODO
	};
	this.processMessage = function(inMsg) {
		/* TODO: traverse all filters */
		return inMsg;
	}
	
};

/** Adds date prefix to all messages */
var DateDecorator = {
	process: function(msg) {
		return this.decorate(msg);
	},
	decorate: function(msg) {
		return 
	}
};

/** Adds user prefix to all messages */
var UserDecorator = {
	// TODO
}

var ColorDecorator = {
	// colorize message background - will textarea support that ??
}

/* ------------------------------------------ */

// in a longer perspective - create CHATAPI - move stuff from chat user

function chatInit() {
	console.log("chat initialization START");
	// loadScript(jsBaseUri + '/jssip.js');
	
	var msgFilters = new ChatMsgFilterChain();
	var dateDecorator;
	var colorizer;
	// msgFilters.push();
	
	// register to IMS
	logIn();
}

function loadScript(scriptName) 
{
	console.log("Loading script " + scriptName + "...");
	var head = document.getElementsByTagName('head')[0];
	var script = document.createElement('script');
   	script.type = 'text/javascript';
   	script.src = scriptName;
	head.appendChild(script);
	console.log("Script loaded.");
}

function webSocketOpened() {
	console.log("Socket opened, registering...");
	var registration = new jssip.Registration(sipStack, onLoggedIn, onLoggedOut, onLoginFailed);
	console.log("Registration created");	
	registration.register("sip:192.121.4.158:5060", "sip:testuser01@bites.eigctestnw.com", privateUserId, "password");
}

function logIn(localUser) {
	console.log("Loggin in");
	sipStack = new jssip.SipStack();
	if(sipStack === undefined) console.error("Unable to create STACK");
	
	var wsTransport = new WebsocketTransport("serverAddrParm-TODOchange", webSocketOpened, "", "");
	console.log("Adding transport to stack");
	sipStack.addTransport(wsTransport);
}

function wsCallback() {
	console.log("WS callback");
}

function onLoggedIn() {
	console.log("Registration OK");
	document.getElementById('status').innerHTML = "Logged in as " + privateUserId;
	document.getElementById('status').setAttribute("class", "green");
}

function onLoggedOut() {	
	console.log("Unregistered.");
	document.getElementById('status').innerHTML = txt_notLogged;
	document.getElementById('status').setAttribute("class", "red");
}

function onLoginFailed() {
	console.error("Registration FAILED");
}



function startSession(remoteUser)
{
	// regi
	
	// establish SIP dialogue with a remote peer
	
}




