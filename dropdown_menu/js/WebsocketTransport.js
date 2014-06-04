// Simple Websocket transport
function WebsocketTransport(serverAddrParm,openedParm,closedParm,errorParm) {
	this.serverAddr = serverAddrParm;
	this.opened = openedParm;
	this.closed = closedParm;
	this.error = errorParm;
	this.socketOpened = false;
}

WebsocketTransport.prototype.transportManager = null;
WebsocketTransport.serverAddr = null;
WebsocketTransport.opened = null;
WebsocketTransport.closed = null;
WebsocketTransport.error = null;
WebsocketTransport.socketOpened = false;

WebsocketTransport.prototype.initialize = function(transportManagerParm) {
    var schema = document.location.protocol;
	var wsschema = 'ws://';
    if( schema == 'https:' )
    		wsschema = 'wss://';
    		
    // TODO: eslahur - dehardcode address! 
    var address = "ws://192.121.4.53:28080/webims-sip2sip-gateway/ws/loopback/device";
    // var address = wsschema + document.location.host + this.serverAddr + "/device";
    
    console.log( 'address: '+address );
	this.socket = new WebSocket( address );
	var self = this;
	this.socket.onopen = function(event) {
		console.log('socket.onopen');
		self.socketOpened = true;
		if( self.opened != null)
			self.opened();
	}

	this.socket.onmessage = function(event) {
		var incomingMessage = event.data;
		console.log('socket.onmessage: '+incomingMessage);
		self.transportManager.incoming(incomingMessage);
	}

	this.socket.onclose = function(event) { 
		console.log('socket.onclose');
		self.socketOpened = false;
		if( self.closed )
			self.closed();
	}

	this.socket.onerror = function(event) { 
		console.log('socket.onerror'+event);
		self.socketOpened = false;
		if( self.error )
			self.error();
	}

	this.transportManager = transportManagerParm;
}

WebsocketTransport.prototype.getTransportName = function() {
	return "WS";
}

WebsocketTransport.prototype.fixTopLevelVia = function(via) {
	return via;
}

WebsocketTransport.prototype.send = function(msg) {
	console.log( "send msg: "+msg);
	this.socket.send(msg);
	return true;
}
