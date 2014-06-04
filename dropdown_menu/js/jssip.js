/**
 * Namespace object for the JSSIP library.
 */
var jssip = {};
jssip.trim = function(toTrim) {
	while (toTrim.substring(0,1) == ' ') {
		toTrim = toTrim.substring(1, toTrim.length);
	}
	while (toTrim.substring(toTrim.length-1, toTrim.length) == ' ') {
			toTrim = toTrim.substring(0,toTrim.length-1);
	}
	return toTrim;
}

jssip.readToken = function(parseObj,limiters) {
	if( typeof parseObj.pos == "undefined")
		parseObj.pos = 0;
	var str = parseObj.str;
	while( ( parseObj.pos < str.length ) &&
			( limiters.indexOf( str.charAt( parseObj.pos ) ) >= 0 ) )
		++parseObj.pos;
	if( parseObj.pos >= str.length )
		return null;
	var sidx = parseObj.pos;
	while( ( parseObj.pos < str.length ) &&
			( limiters.indexOf( str.charAt( parseObj.pos ) ) < 0 ) )
			++parseObj.pos;
	if( parseObj.pos >= str.length )
		return str.substring( sidx);
	else
		return str.substring( sidx,parseObj.pos);
}

jssip.readLine = function(parseObj) {
	if( typeof parseObj.pos == "undefined")
		parseObj.pos = 0;
	var str = parseObj.str;
	if( parseObj.pos >= str.length )
		return null;
	var sidx = parseObj.pos;
	while( ( parseObj.pos < str.length ) &&
			( str.charAt( parseObj.pos ) != "\r" ) )
			++parseObj.pos;
	var returnValue = null;
	if( parseObj.pos >= str.length )
		returnValue = str.substring( sidx);
	else
		returnValue = str.substring( sidx,parseObj.pos);
	if( ( parseObj.pos < str.length ) &&
			( str.charAt( parseObj.pos ) == "\r") )
		++parseObj.pos;
	if( ( parseObj.pos < str.length ) &&
			( str.charAt( parseObj.pos ) == "\n") )
		++parseObj.pos;
	return returnValue;
}


jssip.readRemainder = function(parseObj,limiters) {
	var str = parseObj.str;
	while( ( parseObj.pos < str.length ) &&
			( limiters.indexOf( str.charAt( parseObj.pos ) ) >= 0 ) )
		++parseObj.pos;
	if( parseObj.pos >= str.length )
		return null;
	return str.substr( parseObj.pos );
}
/**
 * Represents a SIP URI 
 * @constructor
 */
jssip.Uri = function() {
}

jssip.Uri.prototype.class = "Uri";

jssip.Uri.prototype.userName = null;
jssip.Uri.prototype.password = null;
jssip.Uri.prototype.urlParameters = null;
jssip.Uri.prototype.headers = null;
jssip.Uri.prototype.tel = null;
jssip.Uri.prototype.comp = null;
jssip.Uri.prototype.host = null;
jssip.Uri.prototype.port = null;
jssip.Uri.prototype.maddr = null;
jssip.Uri.prototype.transport = null;
jssip.Uri.prototype.secure = false;
jssip.Uri.prototype.looseRoute = false;
jssip.Uri.prototype.comp = null;
jssip.Uri.prototype.tag = null;
jssip.Uri.prototype.bracesPresent = false;
jssip.Uri.prototype.unparsed = null;

/**
 * Sets up this Uri instance for a string representation of the URI
 * @param uriStr The URI string
 */
jssip.Uri.prototype.set = function(uriStr) {
	this.empty();
	uriStr = jssip.trim( uriStr );
	uriStr = this.convertToAddrSpec( uriStr );
	this.parseAddrSpec( uriStr );
	var parms = this.getURLparameters();
	if( parms != "") {
		var hidx = 0;
		var remaining = "";
		while( hidx >= 0 ) {
			hidx = parms.indexOf( ";");
			var parm = "";
			if( hidx >= 0 ) {
				parm = parms.substring( 0,hidx);
				parms = parms.substring( hidx+1);
			} else
				parm = parms;
			var eidx = parm.indexOf("=");
			var name = "";
			var value = "";
			var hasValue = false;
			if( eidx >= 0 ) {
				name = parm.substring(0,eidx);
				value = parm.substring( eidx+1);
				hasValue = true;
			} else
				name=parm;
			if( name == "maddr" )
				this.maddr = value;
			else
			if( name == "transport")
				this.transport = value;
			else
			if( name == "lr")
				this.looseRoute = true;
			else
			if( name == "comp")
				this.comp = value;
			else
			if( !this.bracesPresent && name == "tag")
				this.tag = value;
			else {
				if( remaining != "")
					remaining = remaining + ";";
				remaining = remaining + name;
				if( hasValue )
					remaining = remaining + "=" + value;
			}
		}
		this.setURLparameters( remaining );
	}
}

/**
 * Initializes this Uri object to an empty state.
 */
jssip.Uri.prototype.empty = function() {
	this.userName = "";
	this.password = "";
	this.urlParameters = "";
	this.headers = "";
	this.tel = "";
	this.comp = "";
	this.host = "";
	this.port = "";
	this.maddr = "";
	this.transport = "";
	this.secure = false;
	this.looseRoute = false;
	this.comp = "";
	this.tag = null;
	this.bracesPresent = false;
	this.unparsed = null;
}

/**
 * @private
 * @param addr
 * @returns
 */
jssip.Uri.prototype.convertToAddrSpec = function(addr) {
	var startIdx = addr.indexOf( "<");
	this.bracesPresent = false;
	if( ( startIdx >= 0 ) && ( startIdx < ( addr.length - 1 ) ) ) {
		startIdx = startIdx+1;
		endIdx = addr.indexOf( ">",startIdx );
		if( endIdx >= 0 ) {
			if( endIdx+1 < addr.length )
				this.unparsed = jssip.trim( addr.substring( endIdx+1) );
			addr = addr.substring( startIdx,endIdx );
			this.bracesPresent = true;
		}
	}
	return addr;
}

/**
 * @private
 * @param addr
 */
jssip.Uri.prototype.parseAddrSpec = function(addr) {
	var isSip = false;
	if( addr.substr(0,4) == "sip:") {
		isSip = true;
		this.secure = false;
		addr = addr.substr(4);
	} else
	if( addr.substr(0,5) == "sips:") {
		isSip = true;
		this.secure = true;
		addr = addr.substr(5);
	}
	if( isSip ) {
		var hidx = addr.indexOf( "?");
		if( hidx >= 0 ) {
			this.headers = jssip.trim( addr.substr( hidx+1) );
			addr = addr.substring( 0,hidx );
		}
		hidx = addr.indexOf( ";");
		if( hidx >= 0 ) {
			this.urlParameters = jssip.trim( addr.substr( hidx+1 ) );
			addr = addr.substring( 0,hidx );
		}
		hidx = addr.indexOf( "@");
		var userpart = null;
		var hostpart = null;
		if( hidx >= 0 ) {
			userpart = addr.substring( 0,hidx );
			hostpart = addr.substring( hidx+1);
		} else {
			userpart = "";
			hostpart = addr;
		}
		hidx = userpart.indexOf( ":");
		if( hidx >= 0 ) {
			this.userName = userpart.substring( 0,hidx );
			this.password = userpart.substring( hidx+1);
		} else
			this.userName = userpart;
		hidx = hostpart.indexOf( ":");
		if( hidx >= 0 ) {
			this.host = hostpart.substring( 0,hidx);
			this.port = hostpart.substring( hidx+1);
		} else
			this.host = hostpart;
	} else
	if( addr.substr( 0,4) == "tel:") {
		addr = addr.substr( 4 );
		hidx = addr.indexOf( ";");
		if( hidx >= 0 ) {
			this.urlParameters = jssip.trim( addr.substr( hidx+1 ) );
			addr = addr.substring( 0,hidx );			
		}
		this.tel = addr;
	}
}

/**
 * Converts this Uri instance into a string format.
 * @returns {String} The Uri as a string.
 */
jssip.Uri.prototype.format = function() {
	var uri = "";
	if( this.isTel() ) {
		uri = "tel:"+this.tel;
		if( this.urlParameters != "")
			uri = uri + ";"+this.urlParameters;
	} else {
		if( this.isSecure() )
			uri = "sips:";
		else
			uri = "sip:";
		var atNeeded = false;
		if( this.userName != "" ) {
			atNeeded = true;
			uri = uri + this.userName;
		}
		if( this.password != "") {
			atNeeded = true;
			uri = uri + ":" + this.password;
		}
		if( atNeeded )
			uri = uri + "@";
		if( this.host != "" )
			uri = uri + this.host;
		if( this.port != "" )
			uri = uri + ":" + this.port;
		if( this.maddr != "" )
			uri = uri +";maddr="+this.maddr;
		if( this.transport != "" )
			uri = uri+";transport="+this.transport;
		if( this.looseRoute )
			uri = uri+";lr";
		if( this.comp != "" )
			uri = uri + ";comp="+this.comp;
		if( this.tag != null )
			uri = uri + ";tag="+this.tag;
		if( this.urlParameters != "" )
			uri = uri + ";" + this.urlParameters;
		if( this.headers != "")
			uri = uri + "?" + this.headers;
	}
	return uri;
}

/**
 * Gets the headers of this Uri instance (string after the ? character)
 * @returns {String} The headers of this Uri instance.
 */
jssip.Uri.prototype.getHeaders = function() {
	return this.headers;
}

/**
 * Sets the headers of this Uri instance (string after the ? character)
 * @param parm The headers of this Uri instance.
 */
jssip.Uri.prototype.setHeaders = function(parm) {
	this.headers = parm;
}

/**
 * Gets the parameters of this Uri instance (parameters that have no specific accessor method)
 * @returns {String} The concatenated parameters of this Uri instance (e.g. a=2;b=1).
 */
jssip.Uri.prototype.getURLparameters = function() {
	return this.urlParameters;
}

/**
 * Sets the parameters of this Uri instance (parameters that have no specific accessor method)
 * @param parm The concatenated parameters of this Uri instance (e.g. a=2;b=1).
 */
jssip.Uri.prototype.setURLparameters = function(parm) {
	this.urlParameters = parm;
}

/**
 * Gets the host part of this Uri instance.
 * @returns {String} The host part of this Uri instance.
 */
jssip.Uri.prototype.getHost = function() {
	return this.host;
}

/**
 * Sets the host part of this Uri instance.
 * @param parm The host part of this Uri instance.
 */
jssip.Uri.prototype.setHost = function(parm) {
	this.host = parm;
}

/**
 * Gets the user name part of this Uri instance.
 * @returns {String} The user name part of this Uri instance.
 */
jssip.Uri.prototype.getUserName = function() {
	return this.userName;
}

/**
 * Sets the user name part of this Uri instance.
 * @param parm The user name part of this Uri instance.
 */
jssip.Uri.prototype.setUserName = function(parm) {
	this.userName = parm;
}

/**
 * Gets the password part of this Uri instance.
 * @returns {String} The password part of this Uri instance.
 */
jssip.Uri.prototype.getPassword = function() {
	return this.password;
}

/**
 * Sets the user name part of this Uri instance.
 * @param parm The password part of this Uri instance.
 */
jssip.Uri.prototype.setPassword = function(parm) {
	this.password = parm;
}

/**
 * Checks whether this Uri instance is a tel: URI.
 * @returns {Boolean} True if this Uri instance is a tel: URI.
 */
jssip.Uri.prototype.isTel = function() {
	return this.tel != null && this.tel != "";
}

/**
 * Gets the telephone number of this Uri instance if this is a tel: URI.
 * @returns The telephone number of this Uri instance.
 */
jssip.Uri.prototype.getTel = function() {
	return this.tel;
}

/**
 * Sets the telephone number of this Uri instance if this is a tel: URI.
 * @param parm The telephone number of this Uri instance.
 */
jssip.Uri.prototype.setTel = function(parm) {
	this.tel = parm;
}


/**
 * Gets the port part of this Uri instance.
 * @returns {String} The port part of this Uri instance.
 */
jssip.Uri.prototype.getPort = function() {
	return this.port;
}

/**
 * Sets the port part of this Uri instance.
 * @param parm The port part of this Uri instance.
 */
jssip.Uri.prototype.setPort = function(parm) {
	this.port = parm;
}

/**
 * Checks whether this is a sips: URI.
 * @returns {Boolean} True if this is a sips: URI.
 */
jssip.Uri.prototype.isSecure = function() {
	return this.secure;
}

/**
 * Sets whether this is a sips: URI
 * @param parm True if this is a sips: URI.
 */
jssip.Uri.prototype.setSecure = function(parm) {
	this.secure = parm;
}

/**
 * Checks whether lr parameter is present in this Uri instance
 * @returns True if lr parameter is present in this Uri instance.
 */
jssip.Uri.prototype.isLooseRoute = function() {
	return this.looseRoute;
}

/**
 * Sets the lr parameter of this Uri instance.
 * @param parm True, if lr parameter is present in this Uri instance
 */

jssip.Uri.prototype.setLooseRoute = function(parm) {
	this.looseRoute = parm;
}

/**
 * Gets the maddr parameter of this Uri instance.
 * @returns {String} The maddr parameter of this Uri instance.
 */
jssip.Uri.prototype.getMaddr = function() {
	return this.maddr;
}

/**
 * Sets the maddr parameter of this Uri instance.
 * @param parm The maddr parameter of this Uri instance.
 */
jssip.Uri.prototype.setMaddr = function(parm) {
	this.maddr = parm;
}

/**
 * Gets the transport parameter of this Uri instance.
 * @returns {String} The transport parameter of this Uri instance.
 */

jssip.Uri.prototype.getTransport = function() {
	return this.transport;
}

/**
 * Sets the transport parameter of this Uri instance.
 * @param parm The transport parameter of this Uri instance.
 */
jssip.Uri.prototype.setTransport = function(parm) {
	this.transport = parm;
}


/**
 * Gets the comp parameter of this Uri instance.
 * @returns {String} The maddr parameter of this Uri instance.
 */

jssip.Uri.prototype.getComp = function() {
	return this.comp;
}

/**
 * Sets the comp parameter of this Uri instance.
 * @param parm The comp parameter of this Uri instance.
 */
jssip.Uri.prototype.setComp = function(parm) {
	this.comp = parm;
}

/**
 * Gets the tag parameter of this Uri instance.
 * @returns {String} The tag parameter of this Uri instance.
 */
jssip.Uri.prototype.getTag = function() {
	return this.tag;
}

/**
 * Sets the tag parameter of this Uri instance.
 * @param parm The tag parameter of this Uri instance.
 */

jssip.Uri.prototype.setTag = function(parm) {
	this.tag = parm;
}

/**
 * If the URI is between braces (e.g. <sip: ...>) then it returns the unparsed part that comes after the closing brace.
 * @returns The unparsed part as string.
 */
jssip.Uri.prototype.getUnparsed = function() {
	if( this.bracesPresent)
		return this.unparsed;
	else
		return null;
}

/**
 * Checks whether this Uri instance is empty.
 * @returns {Boolean} True if the Uri instance is empty.
 */
jssip.Uri.prototype.isEmpty = function() {
	return  this.host == "" || this.host == null;
}
/**
 * Represents a user-readable name and a SIP URI.
 * @constructor
 */
jssip.NameAddr = function() {
}

jssip.NameAddr.prototype.class = "NameAddr";

jssip.NameAddr.prototype.uri = null;
jssip.NameAddr.prototype.displayName = null;

/**
 * Sets this NameAddr instance to an empty state.
 */
jssip.NameAddr.prototype.empty = function() {
	this.uri = new jssip.Uri();
	this.uri.empty();
	this.displayName = null;
}

/**
 * Parses a NameAddr from its string representation.
 * @param nameAddress String representation of the NameAddr
 */
jssip.NameAddr.prototype.set = function(nameAddress) {
	this.empty();
	this.uri.set( nameAddress );
	var hidx = nameAddress.indexOf("\"");
	if( hidx >= 0 ) {
		var eidx = nameAddress.indexOf( "\"",hidx+1);
		if( eidx >= 0 )
			this.displayName = nameAddress.substring( hidx+1,eidx);
	}
}

/**
 * Creates a string representation of the NameAddr instance.
 * @returns {String} The string representation.
 */
jssip.NameAddr.prototype.format = function() {
	var nameaddr = "";
	if( this.displayName != null )
		nameaddr = "\""+this.displayName+"\" ";
	nameaddr = nameaddr + "<"+this.uri.format()+">";
	return nameaddr;
}

/**
 * Gets the display name of this NameAddr instance.
 * @returns The display name.
 */
jssip.NameAddr.prototype.getDisplayName = function() {
	return this.displayName;
}

/**
 * Sets the display name of this NameAddr instance.
 * @param parm The display name.
 */
jssip.NameAddr.prototype.setDisplayName = function(parm) {
	this.displayName = parm;
}

/**
 * Gets the SIP URI of this NameAddr instance.
 * @returns The SIP URI represented by an Uri instance.
 */

jssip.NameAddr.prototype.getUri = function() {
	return this.uri;
}

/**
 * Sets the SIP URI of this NameAddr instance.
 * @param parm The SIP URI represented by an Uri instance.
 */
jssip.NameAddr.prototype.setUri = function(parm) {
	this.uri = parm;
}/**
 * Represents a SIP Address containing readable name, SIP address and tag.
 * @constructor
 */
jssip.Address = function() {
}

jssip.Address.prototype.class = "Address";

jssip.Address.prototype.nameAddr = null;
jssip.Address.prototype.parameters = null;
jssip.Address.prototype.tag = null;

/**
 * Empties this Address instance so that it contains no address/tag. 
 */
jssip.Address.prototype.empty = function() {
	this.nameAddr = new jssip.NameAddr();
	this.nameAddr.empty();
	this.parameters = "";
	this.tag = null;
}

/**
 * Sets the value of this Address instance from another
 * Address instance or from a string.
 * @param address Another Address instance or a string containing
 * SIP address.
 */
jssip.Address.prototype.set = function(address) {
	this.empty();
	if( ( typeof address.class != "undefined" ) &&
			( address.class == "Address" ) ) {
		this.setNameAddr( address.getNameAddr());
		this.setTag( address.getTag());
	} else {
		this.nameAddr.set(address);
		var uriObj = this.nameAddr.getUri();
		var unparsed = uriObj.getUnparsed();
		if( unparsed != null ) {
			var hidx = unparsed.indexOf( ";");
			if( hidx >= 0 ) {
				unparsed = unparsed.substring( hidx+1 );
				var remaining = "";
				while( hidx >= 0 ) {
					hidx = unparsed.indexOf( ";");
					var parm = "";
					if( hidx >= 0 ) {
						parm = unparsed.substring( 0,hidx);
						unparsed = unparsed.substring( hidx+1);
					} else
						parm = unparsed;
					var eidx = parm.indexOf("=");
					var name = "";
					var value = "";
					var hasValue = false;
					if( eidx >= 0 ) {
						name = parm.substring(0,eidx);
						value = parm.substring( eidx+1);
						hasValue = true;
					} else
						name=parm;
					if( name == "tag" )
						this.tag = value;
					else {
						if( remaining != "")
							remaining = remaining + ";";
						remaining = remaining + name;
						if( hasValue )
							remaining = remaining + "=" + value;
					}
				}
				this.parameters = remaining;
			}
		} else {
			this.tag = uriObj.getTag();
			this.parameters = uriObj.getURLparameters();
		}
	}
}

/**
 * Generates a new tag for this Address instance.
 */
jssip.Address.prototype.generateTag = function() {
	var rnd = ( Math.floor( Math.random() * 65536 ) *
			Math.floor( Math.random() * 65536 ) *
			Math.floor( Math.random() * 65536 ) ) +
			281474976710656;
	var tag = rnd.toString(16);
	this.setTag( tag );
}

/**
 * Converts this Address instance into a format suitable for SIP address headers.
 * @returns The string representation of this Address instance.
 */
jssip.Address.prototype.format = function() {
	var address = this.nameAddr.format();
	if( this.tag != null )
		address = address + ";tag=" + this.tag;
	if( this.parameters != "")
		address = address + ";" + this.parameters;
	return address;
}

/**
 * Creates a new Address instance whose value is equivalent with this
 * Address instance.
 * @returns {jssip.Address} The cloned Address instance.
 */
jssip.Address.prototype.clone = function() {
	var address = new jssip.Address();
	address.empty();
	address.setNameAddr( this.getNameAddr());
	address.setTag( this.getTag());
	address.setParameters( this.getParameters());
	return address;
}

/**
 * Gets the list of Address parameters (other than the tag parameter)
 * @returns {String} list of Address parameters in a string format.
 */
jssip.Address.prototype.getParameters = function() {
	return this.parameters;
}

/**
 * Sets the list of Address parameters (other than the tag parameter)
 * @param parm list of Address parameters in a string format. Use setTag() to set the tag parameter.
 */ 
jssip.Address.prototype.setParameters = function(parm) {
	this.parameters = parm;
}

/**
 * Gets the NameAddr instance representing the printable name/SIP address part of this Address instance.
 * @returns {jssip.NameAddr} The NameAddr instance.
 */
jssip.Address.prototype.getNameAddr = function() {
	return this.nameAddr;
}

/**
 * Sets the NameAddr instance representing the printable name/SIP address part of this Address instance.
 * @param parm The NameAddr instance to be set.
 */
jssip.Address.prototype.setNameAddr = function(parm) {
	this.nameAddr = parm;
}

/**
 * Gets the tag parameter of this Address instance
 * @returns {String} The tag parameter.
 */
jssip.Address.prototype.getTag = function() {
	return this.tag;
}

/**
 * Sets the tag parameter of this Address instance
 * @param parm The tag parameter.
 */
jssip.Address.prototype.setTag = function(parm) {
	this.tag = parm;
}
/**
 * Represents a Via header.
 * @constructor
 */
jssip.Via = function() {
}

jssip.Via.prototype.class = "Via";

jssip.Via.prototype.protocol = null;
jssip.Via.prototype.version = null;
jssip.Via.prototype.transport = null;
jssip.Via.prototype.sentby = null;
jssip.Via.prototype.maddr = null;
jssip.Via.prototype.received = null;
jssip.Via.prototype.branch = null;
jssip.Via.prototype.ttl = null;
jssip.Via.prototype.comp = null;
jssip.Via.prototype.rport = null;
jssip.Via.prototype.extension = null;

/**
 * Initializes a Via object from the wire representation of a Via header value.
 * @param viaStr String representation of the Via header value.
 */
jssip.Via.prototype.set = function(viaStr) {
	this.empty();
	var viaParseObj = { str: viaStr };
	this.protocol = jssip.readToken( viaParseObj,"/");
	this.version = jssip.readToken( viaParseObj,"/");
	this.transport = jssip.readToken( viaParseObj,"/ ");
	this.sentby = jssip.readToken( viaParseObj," ;");

	var remainder = "";
	var parm = null;
	do {
		parm = jssip.readToken( viaParseObj,";");
		if( parm != null ) {
			var parmParseObj = { str: parm };
			var parmName = jssip.readToken( parmParseObj,"=");
			var parmValue = jssip.readToken( parmParseObj,"=;");
			if( parmName == "maddr")
				this.maddr = parmValue;
			else
			if( parmName == "received")
				this.received = parmValue;
			else
			if( parmName == "branch")
				this.branch = parmValue;
			else
			if( parmName == "ttl")
				this.ttl = parmValue;
			else
			if( parmName == "comp")
				this.comp = parmValue;
			else
			if( parmName == "rport")
				this.rport = parmValue;
			else {
				if( remainder.length > 0 )
					remainder = remainder + ";";
				remainder = remainder + parmName + "=" + parmValue;				
			}
		}
	} while( parm != null );
	if( remainder.length > 0 )
		this.extension = remainder;
}

/**
 * Initializes the Via object to an empty state.
 */
jssip.Via.prototype.empty = function() {
	this.protocol = "SIP";
	this.version = "2.0";
	this.transport = null;
	this.sentby = null;
	this.maddr = null;
	this.received = null;
	this.branch = null;
	this.ttl = null;
	this.comp = null;
	this.rport = null;
	this.extension = null;
}

/**
 * Produces the wire representation of this Via header value.
 * @returns {String} The Via header value in the format found in SIP messages.
 */
jssip.Via.prototype.format = function() {
	var via = this.protocol + "/" + 
			this.version + "/" + 
			this.transport + " " +
			this.sentby + ";" +
			"branch=" + this.branch;
	if( this.maddr != null )
		via = via + ";maddr=" + this.maddr;
	if( this.received != null )
		via = via + ";received=" + this.received;
	if( this.ttl != null)
		via = via + ";ttl=" + this.ttl;
	if( this.comp != null )
		via = via + ";comp=" + this.comp;
	if( this.rport != null )
		via = via + ";rport=" + this.rport;
	if( this.extension != null )
		via = via + ";" + extension;
	return via;
}

/**
 * Gets the transport (TCP or UDP) of this Via instance.
 * @returns The transport of this Via instance.
 */
jssip.Via.prototype.getTransport = function() {
	return this.transport;
}

/**
 * Sets the transport (TCP or UDP) of this Via instance.
 * @param parm The transport of this Via instance.
 */
jssip.Via.prototype.setTransport = function(parm) {
	this.transport = parm;
}

/**
 * Gets the "sent by" field of this Via instance.
 * @returns The value of the "sent by" field. 
 */
jssip.Via.prototype.getSentBy = function() {
	return this.sentby;
}

/**
 * Sets the "sent by" field of this Via instance.
 * @param parm The value of the "sent by" field.
 */
jssip.Via.prototype.setSentBy = function(parm) {
	this.sentby = parm;
}

/**
 * Gets the branch parameter of this Via instance. 
 * @returns The branch parameter of this Via instance.
 */
jssip.Via.prototype.getBranch = function() {
	return this.branch;
}

/**
 * Sets the branch parameter of this Via instance.
 * @param parm The branch parameter of this Via instance.
 */
jssip.Via.prototype.setBranch = function(parm) {
	this.branch = parm;
}

/**
 * Gets the maddr parameter of this Via instance.
 * @returns The maddr parameter of this Via instance.
 */
jssip.Via.prototype.getMaddr = function() {
	return this.maddr;
}

/**
 * Sets the maddr parameter of this Via instance.
 * @param parm The maddr parameter of this Via instance.
 */
jssip.Via.prototype.setMaddr = function(parm) {
	this.maddr = parm;
}

/**
 * Gets the received parameter of this Via instance.
 * @returns The received parameter of this Via instance.
 */
jssip.Via.prototype.getReceived = function() {
	return this.received;
}

/**
 * Sets the received parameter of this Via instance.
 * @param parm The received parameter of this Via instance.
 */
jssip.Via.prototype.setReceived = function(parm) {
	this.received = parm;
}

/**
 * Gets the ttl parameter of this Via instance.
 * @returns The ttl parameter of this Via instance.
 */
jssip.Via.prototype.getTTL = function() {
	return this.ttl;
}

/**
 * Sets the ttl parameter of this Via instance.
 * @param parm The ttl parameter of this Via instance.
 */
jssip.Via.prototype.setTTL = function(parm) {
	this.ttl = parm;
}

/**
 * Gets the comp parameter of this Via instance.
 * @returns The comp parameter of this Via instance.
 */
jssip.Via.prototype.getComp = function() {
	return this.comp;
}

/**
 * Sets the comp parameter of this Via instance.
 * @param parm The comp parameter of this Via instance.
 */
jssip.Via.prototype.setComp = function(parm) {
	this.comp = parm;
}

/**
 * Gets the rport parameter of this Via instance.
 * @returns The rport parameter of this Via instance.
 */
jssip.Via.prototype.getRport = function() {
	return this.rport;
}

/**
 * Sets the rport parameter of this Via instance.
 * @param parm The rport parameter of this Via instance.
 */
jssip.Via.prototype.setRport = function(parm) {
	this.rport = parm;
}

/**
 * Gets extension parameters of this Via instance (parameters that have no specific accessor methods)
 * @returns {String} Concatenated extension parameters (e.g. a=1;b=2)
 */
jssip.Via.prototype.getExtension = function() {
	return this.extension;
}

/**
 * Sets extension parameters of this Via instance (parameters that have no specific accessor methods)
 * @param parm Concatenated extension parameters (e.g. a=1;b=2)
 */
jssip.Via.prototype.setExtension = function(parm) {
	this.extension = parm;
}

/**
 * Creates an exact copy of the Via instance.
 * @returns {jssip.Via} The new Via instance having the same
 * parameters as this instance.
 */
jssip.Via.prototype.clone = function() {
	var newVia = new jssip.Via();
	newVia.empty();
	newVia.setTransport( this.getTransport());
	newVia.setRport( this.getRport());
	newVia.setBranch( this.getBranch());
	newVia.setSentBy( this.getSentBy());
	newVia.setComp( this.getComp());
	newVia.setTTL( this.getTTL());
	newVia.setExtension( this.getExtension());
	return newVia;
}
/**
 * Represents a SIP header whose value is an URI and 
 * may have parameters.
 * @constructor
 */
jssip.ParametrizedHeader = function() {
	this.parameters = new Array();
}

jssip.ParametrizedHeader.prototype.class = "ParametrizedHeader";
jssip.ParametrizedHeader.prototype.value = null;
jssip.ParametrizedHeader.prototype.parameters = null;

/**
 * Initializes the instance to empty value.
 */
jssip.ParametrizedHeader.prototype.empty = function() {
	this.value = null;
	this.parameters = new Array();
}

/**
 * Sets up the instance from a string representation of the header value.
 * @param hdr String representation of the header value
 */
jssip.ParametrizedHeader.prototype.set = function(hdr) {
	this.empty();
	this.value = new jssip.Uri();
	this.value.set(hdr);
	var remainder = this.value.getUnparsed();
	if( remainder != null ) {
		var parseObj = { str: remainder };
		var parm = null;
		do {
			var parmstr = jssip.readToken(parseObj,";");
			if( ( parmstr != null ) && ( parmstr != "" ) ) {
				var name = null;
				var value = null;
				var idx = parmstr.indexOf("=");
				if( idx < 0 )
					name = parmstr;
				else {
					name = parmstr.substring(0,idx);
					value = parmstr.substring(idx+1);
				}
				this.parameters[name]=value;
			}
		} while( parmstr != null );
	}
}

/**
 * Returns the ParametrizedHeader instance in string format.
 * @returns The instance in string format.
 */
jssip.ParametrizedHeader.prototype.format = function() {
	var value = "<"+this.value.format()+">";
	for( var key in this.parameters ) {
		var kv = this.parameters[key];
		if( kv == null )
			value = value + ";" + key;
		else
			value = value + ";" + key + "=" + kv;
	}
	return value;
}

/**
 * Checks whether a certain parameter name exists.
 * @param parameterName The parameter name to check.
 * @returns True if the parameter name exists.
 */
jssip.ParametrizedHeader.prototype.hasParameter = function(parameterName) {
	return typeof this.parameters[parameterName] != "undefined";
}

/**
  * Returns the value of a certain parameter.
  * @param parameterName The parameter name to read.
  * @returns The value of the parameter.
  */
jssip.ParametrizedHeader.prototype.getParameter = function(parameterName) {
	return this.parameters[parameterName];
}

/**
  * Sets the value of a certain parameter.
  * @param parameterName The parameter to set.
  * @param parameterValue The value to set.
  */
jssip.ParametrizedHeader.prototype.setParameter = function(parameterName,parameterValue) {
	this.parameters[parameterName]=parameterValue;
}

/**
  * Gets the value of the header (the part before the parameters)
  * @returns The value of the header as an Uri instance
  */
jssip.ParametrizedHeader.prototype.getValue = function() {
	return this.value;
}

/**
  * Sets the value of the header (the part before the parameters)
  * @parm value The value of the header as an Uri instance.
  */
jssip.ParametrizedHeader.prototype.setValue = function(value) {
	this.value = value;
}/**
 * Represents an Authorization header
 * @constructor
 */
jssip.AuthorizationHeader = function() {
}

jssip.AuthorizationHeader.prototype.class = "AuthorizationHeader";

jssip.AuthorizationHeader.authmethods = new Object();
jssip.AuthorizationHeader.authmethods.UNKNOWN = -1;
jssip.AuthorizationHeader.authmethods.DIGEST = 0;

jssip.AuthorizationHeader.prototype.auth = jssip.AuthorizationHeader.authmethods.UNKNOWN;
jssip.AuthorizationHeader.prototype.username = null;
jssip.AuthorizationHeader.prototype.realm = null;
jssip.AuthorizationHeader.prototype.nonce = null;
jssip.AuthorizationHeader.prototype.uri = null;
jssip.AuthorizationHeader.prototype.algorithm = null;
jssip.AuthorizationHeader.prototype.qop = null;
jssip.AuthorizationHeader.prototype.nc = null;
jssip.AuthorizationHeader.prototype.cnonce = null;
jssip.AuthorizationHeader.prototype.response = null;


/**
 * Sets the instance to empty state.
 */
jssip.AuthorizationHeader.prototype.empty = function() {
	this.auth = jssip.AuthorizationHeader.authmethods.UNKNOWN;
	this.username = null;
	this.realm = null;
	this.nonce = null;
	this.uri = null;
	this.algorithm = null;
	this.qop = null;
	this.nc = null;
	this.cnonce = null;
	this.response = null;
}

/**
 * @private
 */
jssip.AuthorizationHeader.prototype.cutQuotation = function(str) {
	var s = str;
	if( s.length == 0 )
		return s;
	if( s.charAt(0) == "\"")
		s = s.substring(1);
	if( s.length == 0 )
		return s;
	var lnm = s.length - 1;
	if( s.charAt(lnm) == "\"")
		s = s.substring(0,lnm);
	return s;
}

/**
 * Sets the state of the instance from wire representation of the WWW-Authenticate header value.
 * @param hdr The value of the WWW-Authenticate header as a string.
 * @returns True if the parsing was successful
 */
jssip.AuthorizationHeader.prototype.set = function(hdr) {
	this.empty();
	var parseObj = { str: hdr };
	var authMode = jssip.readToken( parseObj, " ");
// Fow now, we support only Digest
	if( authMode != "Digest" )
		return false;
	this.auth = jssip.AuthorizationHeader.authmethods.DIGEST;
	var parm = null;
	do {
		parm = jssip.readToken( parseObj,",");
		if( parm != null ) {
			idx = parm.indexOf("=");
			if( idx >= 0 ) {
				var name = jssip.trim( parm.substring(0,idx) );
				var value = parm.substring(idx+1);
				if( name == "username") {
					this.username = this.cutQuotation(value);
				} else
				if( name == "realm") {
					this.realm = this.cutQuotation(value);
				} else
				if( name == "nonce") {
					this.nonce = this.cutQuotation(value);
				} else
				if( name == "uri") {
					this.uri = this.cutQuotation(value);
				} else
				if( name == "qop") {
					this.qop = this.cutQuotation(value);
				} else
				if( name == "algorithm") {
					this.algorithm = value;
				} else
				if( name == "nc") {
					this.nc = value;
				} else
				if( name == "cnonce") {
					this.cnonce = this.cutQuotation(value);
				} else
				if( name == "response") {
					this.response = this.cutQuotation(value);
				}
			}
		}
	} while( parm != null )
}

/**
 * Formats the instance into a wire representation string.
 * @returns {String} The value of the instance as string 
 */
jssip.AuthorizationHeader.prototype.format = function() {
	var value = "";
	switch( this.auth ) {
	case jssip.AuthorizationHeader.authmethods.DIGEST:
		value = "Digest";
		break;
	}
	value = value + " ";
	if( this.username != null )
		value = value + "username=\""+this.username+"\",";
	if( this.realm != null )
		value = value + "realm=\""+this.realm+"\",";
	if( this.nonce != null )
		value = value + "nonce=\""+this.nonce+"\",";
	if( this.uri != null )
		value = value + "uri=\""+this.uri+"\",";
	if( this.response != null )
		value = value + "response=\""+this.response+"\",";
	if( this.algorithm != null )
		value = value + "algorithm="+this.algorithm+",";
	if( this.cnonce != null )
		value = value + "cnonce=\""+this.cnonce+"\",";
	if( this.qop != null )
		value = value + "qop="+this.qop+",";
	if( this.nc != null )
		value = value + "nc="+this.nc+",";
	var lnm = value.length - 1;
	if( value.charAt(lnm)== ",")
		value = value.substring(0,lnm);
	return value;
}

/**
 * Gets the authentication method.
 * @returns The authentication method. See jssip.AuthorizationHeader.authmethods.
 */
jssip.AuthorizationHeader.prototype.getAuth = function() {
	return this.auth;
}

/**
 * Sets the authentication method.
 * @param parm The authentication method. See See jssip.AuthorizationHeader.authmethods.
 */
jssip.AuthorizationHeader.prototype.setAuth = function(parm) {
	this.auth = parm;
}

/**
 * Gets the username.
 * @returns The username. 
 */
jssip.AuthorizationHeader.prototype.getUsername = function() {
	return this.username;
}

/**
 * Sets the username.
 * @param parm The username.
 */
jssip.AuthorizationHeader.prototype.setUsername = function(parm) {
	this.username = parm;
}

/**
 * Gets the realm.
 * @returns The realm. 
 */
jssip.AuthorizationHeader.prototype.getRealm = function() {
	return this.realm;
}

/**
 * Sets the realm.
 * @param parm The realm.
 */
jssip.AuthorizationHeader.prototype.setRealm = function(parm) {
	this.realm = parm;
}

/**
 * Gets the nonce.
 * @returns The nonce. 
 */
jssip.AuthorizationHeader.prototype.getNonce = function() {
	return this.nonce;
}

/**
 * Sets the nonce.
 * @param parm The nonce.
 */
jssip.AuthorizationHeader.prototype.setNonce = function(parm) {
	this.nonce = parm;
}

/**
 * Gets the uri value.
 * @returns The uri value. 
 */
jssip.AuthorizationHeader.prototype.getUri = function() {
	return this.uri;
}

/**
 * Sets the uri value.
 * @param parm The uri value.
 */
jssip.AuthorizationHeader.prototype.setUri = function(parm) {
	this.uri = parm;
}

/**
 * Gets the qop value.
 * @returns The qop value. 
 */
jssip.AuthorizationHeader.prototype.getQop = function() {
	return this.qop;
}

/**
 * Sets the qop value.
 * @param parm The qop value.
 */
jssip.AuthorizationHeader.prototype.setQop = function(parm) {
	this.qop = parm;
}

/**
 * Gets the algorithm value.
 * @returns The algorithm value. 
 */
jssip.AuthorizationHeader.prototype.getAlgorithm = function() {
	return this.algorithm;
}

/**
 * Sets the algorithm value.
 * @param parm The algorithm value.
 */
jssip.AuthorizationHeader.prototype.setAlgorithm = function(parm) {
	this.algorithm = parm;
}

/**
 * Gets the nonce count value.
 * @returns The NC value. 
 */
jssip.AuthorizationHeader.prototype.getNC = function() {
	return this.nc;
}

/**
 * Sets the nonce count value.
 * @param parm The NC value.
 */
jssip.AuthorizationHeader.prototype.setNC = function(parm) {
	this.nc = parm;
}

/**
 * Gets the cnonce value.
 * @returns The cnonce value. 
 */
jssip.AuthorizationHeader.prototype.getCnonce = function() {
	return this.cnonce;
}

/**
 * Sets the cnonce value.
 * @param parm The algorithm value.
 */
jssip.AuthorizationHeader.prototype.setCnonce = function(parm) {
	this.cnonce = parm;
}

/**
 * Gets the response value.
 * @returns The response value. 
 */
jssip.AuthorizationHeader.prototype.getResponse = function() {
	return this.response;
}

/**
 * Sets the response value.
 * @param parm The response value.
 */
jssip.AuthorizationHeader.prototype.setResponse = function(parm) {
	this.response = parm;
}
/**
 * Represents a WWW-Authenticate header
 * @constructor
 */
jssip.WWWAuthenticateHeader = function() {
}

jssip.WWWAuthenticateHeader.prototype.class = "WWWAuthenticateHeader";

jssip.WWWAuthenticateHeader.authmethods = new Object();
jssip.WWWAuthenticateHeader.authmethods.UNKNOWN = -1;
jssip.WWWAuthenticateHeader.authmethods.DIGEST = 0;

jssip.WWWAuthenticateHeader.prototype.auth = jssip.WWWAuthenticateHeader.authmethods.UNKNOWN;
jssip.WWWAuthenticateHeader.prototype.realm = null;
jssip.WWWAuthenticateHeader.prototype.domain = null;
jssip.WWWAuthenticateHeader.prototype.nonce = null;
jssip.WWWAuthenticateHeader.prototype.stale = false;
jssip.WWWAuthenticateHeader.prototype.qop = null;
jssip.WWWAuthenticateHeader.prototype.algorithm = null;

/**
 * Sets the instance to empty state.
 */
jssip.WWWAuthenticateHeader.prototype.empty = function() {
	this.auth = jssip.WWWAuthenticateHeader.authmethods.UNKNOWN;
	this.realm = null;
	this.domain = null;
	this.nonce = null;
	this.stale = false;
	this.qop = null;
	this.algorithm = null;
}

/**
 * @private
 */
jssip.WWWAuthenticateHeader.prototype.cutQuotation = function(str) {
	var s = str;
	if( s.length == 0 )
		return s;
	if( s.charAt(0) == "\"")
		s = s.substring(1);
	if( s.length == 0 )
		return s;
	var lnm = s.length - 1;
	if( s.charAt(lnm) == "\"")
		s = s.substring(0,lnm);
	return s;
}

/**
 * Sets the state of the instance from wire representation of the WWW-Authenticate header value.
 * @param hdr The value of the WWW-Authenticate header as a string.
 * @returns True if the parsing was successful
 */
jssip.WWWAuthenticateHeader.prototype.set = function(hdr) {
	this.empty();
	var parseObj = { str: hdr };
	var authMode = jssip.readToken( parseObj, " ");
// Fow now, we support only Digest
	if( authMode != "Digest" )
		return false;
	this.auth = jssip.WWWAuthenticateHeader.authmethods.DIGEST;
	var parm = null;
	do {
		parm = jssip.readToken( parseObj,",");
		if( parm != null ) {
			idx = parm.indexOf("=");
			if( idx >= 0 ) {
				var name = jssip.trim( parm.substring(0,idx) );
				var value = parm.substring(idx+1);
				if( name == "realm") {
					this.realm = this.cutQuotation(value);
				} else
				if( name == "domain" ) {
					this.domain = this.cutQuotation(value);
				} else
				if( name == "nonce") {
					this.nonce = this.cutQuotation(value);
				} else
				if( name == "stale") {
					this.stale = value == "true";
				} else
				if( name == "qop") {
					this.qop = this.cutQuotation(value);
				} else
				if( name == "algorithm") {
					this.algorithm = value;
				}
			}
		}
	} while( parm != null )
}

/**
 * Formats the instance into a wire representation string.
 * @returns {String} The value of the instance as string 
 */
jssip.WWWAuthenticateHeader.prototype.format = function() {
	var value = "";
	switch( this.auth ) {
	case jssip.WWWAuthenticateHeader.authmethods.DIGEST:
		value = "Digest";
		break;
	}
	value = value + " ";
	if( this.realm != null )
		value = value + "realm=\""+this.realm+"\",";
	if( this.domain != null )
		value = value + "domain=\""+this.domain+"\",";
	if( this.nonce != null )
		value = value + "nonce=\""+this.nonce+"\",";
	value = value + "stale=";
	if( this.stale )
		value = value + "true";
	else
		value = value + "false";
	value = value + ",";
	if( this.qop != null )
		value = value + "qop=\""+this.qop+"\",";
	if( this.algorithm != null )
		value = value + "algorithm="+this.algorithm+",";
	var lnm = value.length - 1;
	if( value.charAt(lnm)== ",")
		value = value.substring(0,lnm);
	return value;
}

/**
 * Gets the authentication method.
 * @returns The authentication method. See jssip.WWWAuthenticateHeader.authmethods.
 */
jssip.WWWAuthenticateHeader.prototype.getAuth = function() {
	return this.auth;
}

/**
 * Sets the authentication method.
 * @param parm The authentication method. See See jssip.WWWAuthenticateHeader.authmethods.
 */
jssip.WWWAuthenticateHeader.prototype.setAuth = function(parm) {
	this.auth = parm;
}

/**
 * Gets the realm.
 * @returns The realm. 
 */
jssip.WWWAuthenticateHeader.prototype.getRealm = function() {
	return this.realm;
}

/**
 * Sets the realm.
 * @param parm The realm.
 */
jssip.WWWAuthenticateHeader.prototype.setRealm = function(parm) {
	this.realm = parm;
}

/**
 * Gets the domain.
 * @returns The domain. 
 */
jssip.WWWAuthenticateHeader.prototype.getDomain = function() {
	return this.domain;
}

/**
 * Sets the domain.
 * @param parm The domain.
 */
jssip.WWWAuthenticateHeader.prototype.setDomain = function(parm) {
	this.domain = parm;
}

/**
 * Gets the nonce.
 * @returns The nonce. 
 */
jssip.WWWAuthenticateHeader.prototype.getNonce = function() {
	return this.nonce;
}

/**
 * Sets the nonce.
 * @param parm The nonce.
 */
jssip.WWWAuthenticateHeader.prototype.setNonce = function(parm) {
	this.nonce = parm;
}

/**
 * Gets the stale flag.
 * @returns The stale flag. 
 */
jssip.WWWAuthenticateHeader.prototype.getStale = function() {
	return this.stale;
}

/**
 * Sets the stale flag.
 * @param parm The stale flag.
 */
jssip.WWWAuthenticateHeader.prototype.setStale = function(parm) {
	this.stale = parm;
}

/**
 * Gets the qop value.
 * @returns The qop value. 
 */
jssip.WWWAuthenticateHeader.prototype.getQop = function() {
	return this.qop;
}

/**
 * Sets the qop value.
 * @param parm The qop value.
 */
jssip.WWWAuthenticateHeader.prototype.setQop = function(parm) {
	this.qop = parm;
}

/**
 * Gets the algorithm value.
 * @returns The algorithm value. 
 */
jssip.WWWAuthenticateHeader.prototype.getAlgorithm = function() {
	return this.algorithm;
}

/**
 * Sets the algorithm value.
 * @param parm The algorithm value.
 */
jssip.WWWAuthenticateHeader.prototype.setAlgorithm = function(parm) {
	this.algorithm = parm;
}
/**
 * Record-Route parser
 * @constructor
 */
jssip.RecordRouteHeader = function() {
	this.elements = new Array();
}

jssip.RecordRouteHeader.prototype.class = "RecordRouteHeader";
jssip.RecordRouteHeader.prototype.elements = null;

/**
 * Resets the instance into its empty state.
 */
jssip.RecordRouteHeader.prototype.empty = function() {
	this.elements = new Array();
}

/**
 * Parser a RecordRoute header value.
 * @param str RecordRoute header value.
 */
jssip.RecordRouteHeader.prototype.set = function(str) {
	this.empty();
	var parseObj = { str: str };
	do {
		var parmstr = jssip.readToken(parseObj,",");
		if( ( parmstr != null ) && ( parmstr != "" ) )
			this.elements.push(parmstr);
	} while( parmstr != null );
}

/**
 * Produces a RecordRoute header value from the instance state.
 * @returns RecordRoute header value.
 */
jssip.RecordRouteHeader.prototype.format = function() {
	var str = "";
	for( var i = 0 ; i < this.elements.length ; ++i ) {
		if( str.length > 0 )
			str = str+",";
		str = str + this.elements[i];
	}
	return str;
}

/**
 * Produces header value where the original RecordRoute address
 * entries are in reverse order making the result suitable for 
 * Route header values in responses.
 * @returns Header value with RecordRoute entries in reverse order.
 */
jssip.RecordRouteHeader.prototype.reverseFormat = function() {
	var str = "";
	for( var i = this.elements.length - 1 ; i >= 0 ; --i ) {
		if( str.length > 0 )
			str = str+",";
		str = str + this.elements[i];
	}
	return str;
}

/**
 * Returns the number of route address elements in the route list.
 * @returns
 */
jssip.RecordRouteHeader.prototype.routeSize = function() {
	return this.elements.length;
}

/**
 * Returns the route address element at a given index.
 * @param idx Index of the route address element
 * @returns Route address element at the given index.
 */
jssip.RecordRouteHeader.prototype.routeAt = function(idx) {
	return this.elements[idx];
}

/**
 * Adds a route address element to the route address element list.
 * @param route Route address element as a string.
 */
jssip.RecordRouteHeader.prototype.addRoute = function(route) {
	this.elements.push(route);
}

/**
 * Parser for option-type headers like Supported and Require.
 * @constructor
 */
jssip.OptionHeader = function() {
	this.elements = new Array();
}

jssip.OptionHeader.prototype.class = "OptionHeader";
jssip.OptionHeader.prototype.elements = null;

/**
 * Resets the instance into its empty state.
 */
jssip.OptionHeader.prototype.empty = function() {
	this.elements = new Array();
}

/**
 * Parses the option-type header string.
 * @param str The header value of the option-type header
 */
jssip.OptionHeader.prototype.set = function(str) {
	this.empty();
	var parseObj = { str: str };
	do {
		var parmstr = jssip.readToken(parseObj,",");
		if( ( parmstr != null ) && ( parmstr != "" ) )
			this.elements.push(parmstr);
	} while( parmstr != null );
}

/**
 * Formats the state of this instance into an option-type header value
 * @returns The option-type header value.
 */
jssip.OptionHeader.prototype.format = function() {
	var str = "";
	for( var i = 0 ; i < this.elements.length ; ++i ) {
		if( str.length > 0 )
			str = str+",";
		str = str + this.elements[i];
	}
	return str;
}

/**
 * Adds an option into this instance state.
 * @param option
 */
jssip.OptionHeader.prototype.addOption = function(option) {
	this.elements.push(option);
}


/**
 * Checks whether an option is present in the option list.
 * @param option The option to check.
 * @returns True if the option is present, false otherwise.
 */
jssip.OptionHeader.prototype.isOptionPresent = function(option) {
	return this.elements.indexOf(option) >= 0;
}
/**
 * Object representing SIP messages (requests or responses)
 * @constructor
 */
jssip.SipMsg = function() {
}

jssip.SipMsg.prototype.class = "SipMsg";

jssip.SipMsg.method = new Object();
jssip.SipMsg.method.UNDEFINED = -1;
jssip.SipMsg.method.INVITE = 0;	
jssip.SipMsg.method.ACK = 1;	
jssip.SipMsg.method.BYE = 2;	
jssip.SipMsg.method.MESSAGE = 3;	
jssip.SipMsg.method.REFER = 4;	
jssip.SipMsg.method.OPTIONS = 5;	
jssip.SipMsg.method.UPDATE = 6;	
jssip.SipMsg.method.NOTIFY = 7;	
jssip.SipMsg.method.SUBSCRIBE = 8;
jssip.SipMsg.method.REGISTER = 9;	
jssip.SipMsg.method.INFO = 10;
jssip.SipMsg.method.CANCEL = 11;	
jssip.SipMsg.method.PUBLISH = 12;	
jssip.SipMsg.method.PRACK = 13;

jssip.SipMsg.methodNames = [];
jssip.SipMsg.methodNames[jssip.SipMsg.method.UNDEFINED] = "UNDEFINED";
jssip.SipMsg.methodNames[jssip.SipMsg.method.INVITE] = "INVITE";
jssip.SipMsg.methodNames[jssip.SipMsg.method.ACK] = "ACK";
jssip.SipMsg.methodNames[jssip.SipMsg.method.BYE] = "BYE";
jssip.SipMsg.methodNames[jssip.SipMsg.method.MESSAGE] = "MESSAGE";
jssip.SipMsg.methodNames[jssip.SipMsg.method.REFER] = "REFER";
jssip.SipMsg.methodNames[jssip.SipMsg.method.OPTIONS] = "OPTIONS";
jssip.SipMsg.methodNames[jssip.SipMsg.method.UPDATE] = "UPDATE";
jssip.SipMsg.methodNames[jssip.SipMsg.method.NOTIFY] = "NOTIFY";
jssip.SipMsg.methodNames[jssip.SipMsg.method.SUBSCRIBE] = "SUBSCRIBE";
jssip.SipMsg.methodNames[jssip.SipMsg.method.REGISTER] = "REGISTER";
jssip.SipMsg.methodNames[jssip.SipMsg.method.INFO] = "INFO";
jssip.SipMsg.methodNames[jssip.SipMsg.method.CANCEL] = "CANCEL";
jssip.SipMsg.methodNames[jssip.SipMsg.method.PUBLISH] = "PUBLISH";
jssip.SipMsg.methodNames[jssip.SipMsg.method.PRACK] = "PRACK";

jssip.SipMsg.respCode = new Object();
jssip.SipMsg.respCode.UNDEFINED = -1;
jssip.SipMsg.respCode.TRYING = 100;
jssip.SipMsg.respCode.RINGING = 180;
jssip.SipMsg.respCode.CALL_IS_BEING_FORWARDED = 181;
jssip.SipMsg.respCode.QUEUED = 182;
jssip.SipMsg.respCode.SESSION_PROGRESS = 183;
jssip.SipMsg.respCode.OK = 200;
jssip.SipMsg.respCode.ACCEPTED = 202;
jssip.SipMsg.respCode.MULTIPLE_CHOICES = 300;
jssip.SipMsg.respCode.MOVED_PERMANENTLY = 301;
jssip.SipMsg.respCode.MOVED_TEMPORARILY = 302;
jssip.SipMsg.respCode.USE_PROXY = 305;
jssip.SipMsg.respCode.ALTERNATIVE_SERVICE = 380;
jssip.SipMsg.respCode.BAD_REQUEST = 400;
jssip.SipMsg.respCode.UNAUTHORIZED = 401;
jssip.SipMsg.respCode.PAYMENT_REQUIRED = 402;
jssip.SipMsg.respCode.FORBIDDEN = 403;
jssip.SipMsg.respCode.NOT_FOUND = 404;
jssip.SipMsg.respCode.METHOD_NOT_ALLOWED = 405;
jssip.SipMsg.respCode.NOT_ACCEPTABLE = 406;
jssip.SipMsg.respCode.PROXY_AUTHENTICATION_REQUIRED = 407;
jssip.SipMsg.respCode.REQUEST_TIMEOUT = 408;
jssip.SipMsg.respCode.GONE = 410;
jssip.SipMsg.respCode.REQUEST_ENTITY_TOO_LARGE = 413;
jssip.SipMsg.respCode.REQUEST_URI_TOO_LONG = 414;
jssip.SipMsg.respCode.UNSUPPORTED_MEDIA_TYPE = 415;
jssip.SipMsg.respCode.BAD_EXTENSION = 420;
jssip.SipMsg.respCode.EXTENSION_REQUIRED = 421;
jssip.SipMsg.respCode.INTERVAL_TOO_BRIEF = 423;
jssip.SipMsg.respCode.TEMPORARILY_UNAVAILABLE = 480;
jssip.SipMsg.respCode.CALL_TRANSACTION_DOES_NOT_EXIST = 481;
jssip.SipMsg.respCode.LOOP_DETECTED = 482;
jssip.SipMsg.respCode.TOO_MANY_HOPS = 483;
jssip.SipMsg.respCode.ADDRESS_INCOMPLETE = 484;
jssip.SipMsg.respCode.AMBIGUOUS = 485;
jssip.SipMsg.respCode.BUSY_HERE = 486;
jssip.SipMsg.respCode.REQUEST_TERMINATED = 487;
jssip.SipMsg.respCode.NOT_ACCEPTABLE_HERE = 488;
jssip.SipMsg.respCode.BAD_EVENT = 489;
jssip.SipMsg.respCode.REQUEST_PENDING = 491;
jssip.SipMsg.respCode.SERVER_INTERNAL_ERROR = 500;
jssip.SipMsg.respCode.NOT_IMPLEMENTED = 501;
jssip.SipMsg.respCode.BAD_GATEWAY = 502;
jssip.SipMsg.respCode.SERVICE_UNAVAILABLE = 503;
jssip.SipMsg.respCode.SERVER_TIMEOUT = 504;
jssip.SipMsg.respCode.VERSION_NOT_SUPPORTED = 505;
jssip.SipMsg.respCode.MESSAGE_TOO_LARGE = 513;
jssip.SipMsg.respCode.BUSY_EVERYWHERE = 600;
jssip.SipMsg.respCode.DECLINE = 603;
jssip.SipMsg.respCode.DOES_NOT_EXIST_ANYWHERE = 604;
jssip.SipMsg.respCode.NON_ACCEPTABLE = 606;

jssip.SipMsg.rspText = [];
jssip.SipMsg.rspText[jssip.SipMsg.respCode.TRYING] = "Trying";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.RINGING] = "Ringing";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.CALL_IS_BEING_FORWARDED] = "Call is being forwarded";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.QUEUED] = "Queued";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.SESSION_PROGRESS] = "Session Progress";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.OK] = "OK";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.ACCEPTED] = "Accepted";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.MULTIPLE_CHOICES] = "Multiple Choices";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.MOVED_PERMANENTLY] = "Moved Permanently";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.MOVED_TEMPORARILY] = "Moved Temporarily";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.USE_PROXY] = "Use Proxy";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.ALTERNATIVE_SERVICE] = "Alternative Service";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.BAD_REQUEST] = "Bad Request";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.UNAUTHORIZED] = "Unauthorized";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.PAYMENT_REQUIRED] = "Payment Required";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.FORBIDDEN] = "Forbidden";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.NOT_FOUND] = "Not Found";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.METHOD_NOT_ALLOWED] = "Method Not Allowed";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.NOT_ACCEPTABLE] = "Not Acceptable";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.PROXY_AUTHENTICATION_REQUIRED] = "Proxy Authentication Required";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.REQUEST_TIMEOUT] = "Request Timeout";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.GONE] = "Gone";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.REQUEST_ENTITY_TOO_LARGE] = "Request Entity Too Large";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.REQUEST_URI_TOO_LONG] = "Request URI Too Long";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.UNSUPPORTED_MEDIA_TYPE] = "Unsupported Media Type";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.BAD_EXTENSION] = "Bad Extension";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.EXTENSION_REQUIRED] = "Extension Required";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.INTERVAL_TOO_BRIEF] = "Interval Too Brief";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.TEMPORARILY_UNAVAILABLE] = "Temporarily Unavailable";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.CALL_TRANSACTION_DOES_NOT_EXIST] = "Call Transaction Does Not Exist";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.LOOP_DETECTED] = "Loop Detected";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.TOO_MANY_HOPS] = "Too Many Hops";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.ADDRESS_INCOMPLETE] = "Address Incomplete";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.AMBIGUOUS] = "Ambiguous";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.BUSY_HERE] = "Busy Here";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.REQUEST_TERMINATED] = "Request Terminated";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.NOT_ACCEPTABLE_HERE] = "Not Acceptable Here";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.BAD_EVENT] = "Bad Event";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.REQUEST_PENDING] = "Request Pending";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.SERVER_INTERNAL_ERROR] = "Server Internal Error";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.NOT_IMPLEMENTED] = "Not Implemented";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.BAD_GATEWAY] = "Bad Gateway";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.SERVICE_UNAVAILABLE] = "Service Unavailable";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.SERVER_TIMEOUT] = "Server Timeout";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.VERSION_NOT_SUPPORTED] = "Version Not Supported";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.MESSAGE_TOO_LARGE] = "Message Too Large";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.BUSY_EVERYWHERE] = "Busy Everywhere";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.DECLINE] = "Decline";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.DOES_NOT_EXIST_ANYWHERE] = "Does Not Exist Anywhere";
jssip.SipMsg.rspText[jssip.SipMsg.respCode.NON_ACCEPTABLE] = "Not Acceptable";

jssip.SipMsg.headers = new Object();
jssip.SipMsg.headers.ALLOW = "Allow";
jssip.SipMsg.headers.AUTHORIZATION = "Authorization";
jssip.SipMsg.headers.CALLID = "Call-ID";
jssip.SipMsg.headers.CONTACT = "Contact";
jssip.SipMsg.headers.CONTENT_LENGTH = "Content-Length";
jssip.SipMsg.headers.CONTENT_TYPE = "Content-Type";
jssip.SipMsg.headers.CSEQ = "CSeq";
jssip.SipMsg.headers.EXPIRES = "Expires";
jssip.SipMsg.headers.FROM = "From";
jssip.SipMsg.headers.PPI = "P-Preferred-Identity";
jssip.SipMsg.headers.RACK = "RAck";
jssip.SipMsg.headers.RECORD_ROUTE = "Record-Route";
jssip.SipMsg.headers.REQUIRE = "Require";
jssip.SipMsg.headers.ROUTE = "Route";
jssip.SipMsg.headers.RSEQ = "RSeq";
jssip.SipMsg.headers.SUPPORTED = "Supported";
jssip.SipMsg.headers.TO = "To";
jssip.SipMsg.headers.VIA = "Via";
jssip.SipMsg.headers.WWWAUTHENTICATE = "WWW-Authenticate";

jssip.SipMsg.NOTRANSACTION = 0xFFFFFFFF;
jssip.SipMsg.prototype.respCode = jssip.SipMsg.respCode.UNDEFINED;
jssip.SipMsg.prototype.respText = null;
jssip.SipMsg.prototype.method = jssip.SipMsg.method.UNDEFINED;
jssip.SipMsg.prototype.reqUri = null;
jssip.SipMsg.prototype.vias = null;
jssip.SipMsg.prototype.to = null;
jssip.SipMsg.prototype.from = null;
jssip.SipMsg.prototype.callid = null;
jssip.SipMsg.prototype.cseqMethod = jssip.SipMsg.method.UNDEFINED;
jssip.SipMsg.prototype.cseqValue = null;
jssip.SipMsg.prototype.routes = null;
jssip.SipMsg.prototype.maxForwards = -1;
jssip.SipMsg.prototype.transId = jssip.SipMsg.NOTRANSACTION;
jssip.SipMsg.prototype.body = null;
jssip.SipMsg.prototype.headers = null;

/**
 * @private
 * @param parm
 * @returns
 */
jssip.SipMsg.checkAndConvertToAddress = function( parm ) {
	var aobj = null;
	if( ( typeof parm ) == "string" ) {
		aobj = new jssip.Address();
		aobj.set( parm );
	} else
	if( ( typeof parm ) == "object") {
		if( ( typeof parm.class != "undefined" ) &&
			( parm.class == "Address") ) {
			aobj = parm;
		}
	}
	return aobj;
}

/**
 * @private
 * @param parm
 * @returns
 */
jssip.SipMsg.checkAndConvertToUri = function( parm ) {
	var aobj = null;
	if( ( typeof parm ) == "string" ) {
		aobj = new jssip.Uri();
		aobj.set( parm );
	} else
	if( ( typeof parm ) == "object") {
		if( ( typeof parm.class != "undefined" ) &&
			( parm.class == "Uri") ) {
			aobj = parm;
		}
	}
	return aobj;
}

/**
 * @private
 * @param methodName
 * @returns
 */
jssip.SipMsg.lookupMethodCode = function(methodName) {
	var idx = 0;
	for( idx = 0; idx < jssip.SipMsg.methodNames.length ; ++idx ) {
		if( methodName == jssip.SipMsg.methodNames[idx])
			return idx;
	}
	return jssip.SipMsg.method.UNDEFINED;
}

/**
 * Sets up this SipMsg object as a SIP request.
 * @param methodParm Method code. Method codes can be found as properties of jssip.SipMsg.method object.
 * @param reqUriParm Request URI parameter as Uri instance or string.
 * @param toParm Value of the To header as Address instance or string.
 * @param fromParm Value of the From header as Address instace or string.
 * @param callidParm Value of the Call-ID header as string.
 * @param cseqParm Value of the CSeq header's value field as integer. If this parameter is
 * omitted, a random CSeq value will be generated.
 * @param cseqMethodParm Value of the CSeq header's method field. If this parameter is omitted, methodParm will be used.
 */
jssip.SipMsg.prototype.setRequest = function( 
		methodParm,
        reqUriParm,
        toParm,
        fromParm,
        callidParm,
        cseqParm,
        cseqMethodParm) {
	this.respCode = jssip.SipMsg.respCode.UNDEFINED;
	this.method = methodParm;
	this.reqUri = jssip.SipMsg.checkAndConvertToUri( reqUriParm);
	this.to = jssip.SipMsg.checkAndConvertToAddress( toParm );
	this.from = jssip.SipMsg.checkAndConvertToAddress( fromParm );
	this.callid = callidParm;
	this.maxForwards = -1;
	this.transId = jssip.SipMsg.NOTRANSACTION;
	if( typeof cseqParm != "undefined" )
		this.cseqValue = cseqParm;
	else
		this.cseqValue = Math.floor( ( Math.random() *65535 ) + 1 );
	if( typeof cseqMethodParm != "undefined")
		this.cseqMethod = cseqMethodParm;
	else
		this.cseqMethod = methodParm;		
}

/**
 * Sets up this SipMsg object as a SIP response.
 * @param respCodeParm Response code. Symbolic response code names can be found as jssip.SipMsg.respCode properties.
 * @param respTextParm Response text. jssip.SipMsg.rspText is an array for response texts.
 * @param toParm Value of the To header as Address instance or string.
 * @param fromParm Value of the From header as Address instance or string.
 * @param callidParm Value of the Call-ID header as string.
 * @param cseqParm Value of the CSeq header's value field as integer. If this parameter is
 * omitted, a random CSeq value will be generated.
 * @param cseqMethodParm Value of the CSeq header's method field. If this parameter is omitted, methodParm will be used.
 */
jssip.SipMsg.prototype.setResponse = function( 
		respCodeParm,
        respTextParm,
        toParm,
        fromParm,
        callidParm,
        cseqParm,
        cseqMethodParm) {
	this.respCode = respCodeParm;
	this.respText = respTextParm;
	this.to = jssip.SipMsg.checkAndConvertToAddress( toParm );
	this.from = jssip.SipMsg.checkAndConvertToAddress( fromParm );
	this.callid = callidParm;
	this.maxForwards = -1;
	this.transId = jssip.SipMsg.NOTRANSACTION;
	if( typeof cseqParm != "undefined" )
		this.cseqValue = cseqParm;
	else
		this.cseqValue = Math.floor( ( Math.random() *65535 ) + 1 );
	if( typeof cseqMethodParm != "undefined")
		this.cseqMethod = cseqMethodParm;
	else
		this.cseqMethod = methodParm;		
}

/**
 * @private
 * @param line
 * @returns {Boolean}
 */
jssip.SipMsg.prototype.parseHeaderLine = function(line) {
	cidx = line.indexOf( ": ");
	if( cidx < 0 )
		return false;
	var headerName = line.substring( 0,cidx );
	var headerValue = line.substring( cidx+2 );
	var headerObject = { name: headerName, value: headerValue };
	this.headers.push( headerObject );
	return true;
}

/**
 * @private
 * @param hdrName
 * @returns
 */
jssip.SipMsg.prototype.parseAddressHeader = function(hdrName) {
	var hdrValue = this.findHeader( hdrName );
	if( hdrValue == null )
		return null;
	var addr = new jssip.Address();
	addr.set( hdrValue );
	return addr;
}

/**
 * @private
 */
jssip.SipMsg.prototype.parseCSeqHeader = function() {
	var cseqLine = this.findHeader( jssip.SipMsg.headers.CSEQ);
	if( cseqLine == null )
		return;
	var parseObj = { str: cseqLine };
	var csv = jssip.readToken( parseObj," ");
	var csm = jssip.readToken( parseObj," ");
	if( csv != null )
		this.cseqValue = parseInt( csv );
	this.cseqMethod = jssip.SipMsg.lookupMethodCode( csm );
}

/**
 * @private
 */
jssip.SipMsg.prototype.parseVias = function() {
	this.vias = [];
	var vhdrs = this.findHeaders( jssip.SipMsg.headers.VIA);
	var idx = 0;
	for( idx=0 ; idx < vhdrs.length ; ++idx) {
		var vhdrv = vhdrs[idx];
		var viaObj = { str: vhdrv };
		var via = null;
		do {
			via = jssip.readToken( viaObj,",");
			if( via != null ) {
				viahdr = new jssip.Via();
				viahdr.set( via );
				this.vias.push( viahdr );
			}
		} while( via != null );
	}
}

/**
 * Sets up this SipMsg object from a wire representation of a SIP mess
 * @param message SIP message in string format.
 * @returns {Boolean} True if parsing the message is successful, false otherwise.
 */
jssip.SipMsg.prototype.parseMessage = function(message) {
	var msgParseObj = { str: message };
	var firstLine = jssip.readLine( msgParseObj);
	if( firstLine == null )
		return false;
	var firstLineParseObj = { str: firstLine };
	var t1 = jssip.readToken( firstLineParseObj," ");
	var t2 = jssip.readToken( firstLineParseObj," ");
	if( t1 == null || t2 == null )
		return false;
	if( t1.substr( 0,3) == "SIP") {
		this.respCode = parseInt( t2 );
		if( this.respCode == NaN )
			return false;
		this.respText = jssip.readRemainder( firstLineParseObj," " );
	} else {
		this.method = jssip.SipMsg.lookupMethodCode(t1);
		this.reqUri = new jssip.Uri();
		this.reqUri.set( t2 );
	}
	var inHeaderBlock = true;
	this.headers = [];
	do {
		var line = jssip.readLine( msgParseObj);
		if( line == null )
			break;
		else
		if( line == "" )
			inHeaderBlock = false;
		else
			this.parseHeaderLine( line );
	} while( inHeaderBlock );
	if( inHeaderBlock )
		this.body = null;
	else
		this.body = jssip.readRemainder( msgParseObj, "\r\n");
	this.parseVias();
	this.from = this.parseAddressHeader( jssip.SipMsg.headers.FROM);
	this.to = this.parseAddressHeader( jssip.SipMsg.headers.TO);
	this.callid = this.findHeader( jssip.SipMsg.headers.CALLID);
	this.routes = this.findHeader(jssip.SipMsg.headers.ROUTE);
	this.parseCSeqHeader();
	return true;
}

/**
 * Creates a response message from this SipMsg if this SipMsg represents a request message.
 * @param respcode Response code. See jssip.SipMsg.respCode.
 * @param resptext Response text. See jssip.SipMsg.rspText.
 * @returns {jssip.SipMsg} The newly generated response message.
 */
jssip.SipMsg.prototype.createResponse = function(respcode,resptext) {
	var rspMsg = new jssip.SipMsg();
	rspMsg.setResponse( respcode, resptext, this.to, this.from, this.callid, this.cseqValue, this.method);
	rspMsg.setVias( this.getVias());
	if( ( respcode != jssip.SipMsg.respCode.TRYING ) &&
		( rspMsg.getTo().getTag() == null ) )
		rspMsg.getTo().generateTag();
	return rspMsg;
} 

/**
 * Creates an ACK request if this SipMsg represents the INVITE request that needs to be ACKed.
 * @param toTag To tag from the dialog-creating response to the INVITE request.
 * @returns {jssip.SipMsg} SipMsg object representing the ACK request.
 */
jssip.SipMsg.prototype.createAck = function(toTag) {
	var ackMsg = new jssip.SipMsg();
	var to = this.to.clone();
	if( typeof toTag != "undefined" )
		to.setTag( toTag );
	ackMsg.setRequest( jssip.SipMsg.method.ACK,
			this.reqUri,
			to,
			this.from,
			this.callid,
			this.cseqValue);
	ackMsg.setVias( this.getVias());
	ackMsg.setRoutes( this.getRoutes());
	return ackMsg;
}

/**
 * Retrieves the value of a SIP header from the SIP message.
 * @param headerName Name of the header. See jssip.SipMsg.headers.
 * @param occurence Controls the index of the specified header that should be retrieved. Defaults to 1.
 * @returns The value of the header or null.
 */
jssip.SipMsg.prototype.findHeader = function(headerName,occurence) {
	if( typeof occurence == "undefined")
		occurence = 1;
	var idx = 0;
	for( idx = 0 ; idx < this.headers.length ; ++idx ) {
		var hdrobj = this.headers[idx];
		if( headerName == hdrobj.name ) {
			if( --occurence == 0 )
				return hdrobj.value;
		}
	}
	return null;
}

/**
 * Retrieves the values of all the SIP headers with the specified name.
 * @param headerName Name of the SIP header(s) to retrieve.
 * @returns {Array} Values of the retrieved SIP headers. Each occurence of the specified SIP
 * header is one entry in the returned Array instance.
 */
jssip.SipMsg.prototype.findHeaders = function(headerName) {
	var idx = 0;
	var result = [];
	for( idx = 0 ; idx < this.headers.length ; ++idx ) {
		var hdrobj = this.headers[idx];
		if( headerName == hdrobj.name )
				result.push( hdrobj.value );
	}
	return result;
}

/**
 * Adds a header to the SIP message
 * @param nameParm Name of the SIP header
 * @param valueParm Value of the SIP header
 */
jssip.SipMsg.prototype.addHeader = function(nameParm,valueParm) {
	var hdrobj = { name: nameParm, value: valueParm};
	if( this.headers == null )
		this.headers = [];
	this.headers.push( hdrobj );
}

/**
 * Formats the SipMsg object into a string representation that can be sent over the wire.
 * @returns {String} The string representation of the SIP message.
 */
jssip.SipMsg.prototype.format = function() {
	var msg = "";
	if( this.isResponse() ) {
		msg = "SIP/2.0 "+this.respCode+" "+this.respText+"\r\n";
	} else {
		msg = jssip.SipMsg.methodNames[this.method]+" "+this.reqUri.format()+" SIP/2.0\r\n";
	}
	if( this.vias != null ) {
		var idx = 0;
		for( idx = 0 ; idx < this.vias.length ; ++idx )
			msg = msg + "Via: " + this.vias[idx].format() + "\r\n";
	}
	if( this.getFrom().getTag() == null )
		this.getFrom().generateTag();
	msg = msg + jssip.SipMsg.headers.FROM+ ": " + this.from.format() + "\r\n";
	msg = msg + jssip.SipMsg.headers.TO+": "+ this.to.format() + "\r\n";
	msg = msg + jssip.SipMsg.headers.CALLID+": "+ this.callid + "\r\n";
	msg = msg + jssip.SipMsg.headers.CSEQ+": "+this.cseqValue+" "+jssip.SipMsg.methodNames[this.cseqMethod]+"\r\n";
	var clen = 0;
	if( this.body != null )
		clen = this.body.length;
	msg = msg + jssip.SipMsg.headers.CONTENT_LENGTH+": "+clen+"\r\n";
	if( this.routes != null )
		msg = msg + jssip.SipMsg.headers.ROUTE+": "+this.routes+"\r\n";
	if( this.headers != null ) {
		var idx = 0;
		for( idx = 0 ; idx < this.headers.length ; ++idx ) {
			var hdrobj = this.headers[idx];
			var hdrName = hdrobj.name;
			if( ( hdrName != jssip.SipMsg.headers.FROM ) &&
				( hdrName != jssip.SipMsg.headers.TO ) &&
				( hdrName != jssip.SipMsg.headers.CALLID ) &&
				( hdrName != jssip.SipMsg.headers.CSEQ ) &&
				( hdrName != jssip.SipMsg.headers.VIA) ) {
				msg = msg + hdrName +": "+hdrobj.value+ "\r\n";
			}
		}
	}
	msg = msg + "\r\n";
	if( this.body != null )
		msg = msg + this.body;
	return msg;
}

/**
 * Returns the SIP response code if this SipMsg represents a SIP response.
 * Otherwise returns jssip.SipMsg.respCode.UNDEFINED.
 * @returns SIP response code as integer.
 */
jssip.SipMsg.prototype.getResponseCode = function() {
	return this.respCode;
}

/**
 * Sets the SIP response code of this SipMsg object
 * @param parm The response code. See jssip.SipMsg.respCode.
 */
jssip.SipMsg.prototype.setResponseCode = function(parm) {
	this.respCode = parm;
}

/**
 * Determines if this SipMsg object represents a SIP request.
 * @returns {Boolean} True if this SipMsg object represents a SIP request.
 */
jssip.SipMsg.prototype.isRequest = function() {
	return this.method != jssip.SipMsg.method.UNDEFINED;
}

/**
 * Determines if this SipMsg object represents a SIP response.
 * @returns {Boolean} True if this SipMsg object represents a SIP response.
 */
jssip.SipMsg.prototype.isResponse = function() {
	return this.respCode != jssip.SipMsg.respCode.UNDEFINED;
}

/**
 * Determines if this SipMsg object represents a provisional SIP response (100<=response code<200).
 * @returns {Boolean} True if this SipMsg object represents a provisional SIP response.
 */
jssip.SipMsg.prototype.is1xxResponse = function() {
	return this.respCode >= 100 && this.respCode < 200;
}

/**
 * Determines if this SipMsg object represents a success final SIP response (200<=response code<300).
 * @returns {Boolean} True if this SipMsg object represents a success final SIP response.
 */
jssip.SipMsg.prototype.is2xxResponse = function() {
	return this.respCode >= 200 && this.respCode < 300;
}

/**
 * Determines if this SipMsg object represents a final SIP response (200<=response code).
 * @returns {Boolean} True if this SipMsg object represents a final SIP response.
 */
jssip.SipMsg.prototype.isFinalResponse = function() {
	return this.respCode >= 200;
}

/**
 * Gets the response text of this SIP response.
 * @returns Response text.
 */
jssip.SipMsg.prototype.getResponseText = function() {
	return this.respText;
}

/**
 * Sets the response text of this SIP response.
 * @param parm Response text as string.
 */
jssip.SipMsg.prototype.setResponseText = function(parm) {
	this.respText = parm;
}

/**
 * Gets the method code of this SIP request.
 * @returns The method code. See jssip.SipMsg.method.
 */
jssip.SipMsg.prototype.getMethod = function() {
	return this.method;
}

/**
 * Sets the method code of this SIP request.
 * @param methodParm The method code. See jssip.SipMsg.method.
 */
jssip.SipMsg.prototype.setMethod = function(methodParm) {
	this.method = methodParm;
}

/**
 * Gets the request URI of this SIP request.
 * @returns Request URI as an Uri object.
 */
jssip.SipMsg.prototype.getReqUri = function() {
	return this.reqUri;
}

/**
 * Sets the request URI of this SIP request.
 * @param reqUriParm Request URI as an Uri object.
 */
jssip.SipMsg.prototype.setReqUri = function(reqUriParm) {
	this.reqUri = reqUriParm;
}

/**
 * Gets the value of the Call-ID header of this SIP request or response.
 * @returns Call ID as string.
 */
jssip.SipMsg.prototype.getCallId = function() {
	return this.callid;
}

/**
 * Sets the value of the Call-ID heaser of this SIP request or response.
 * @param callidParm Call ID as string.
 */
jssip.SipMsg.prototype.setCallId = function(callidParm) {
	this.callid = callidParm;
}

/**
 * Gets the value of the To header.
 * @returns To header value as an Address object.
 */
jssip.SipMsg.prototype.getTo = function() {
	return this.to;
}

/**
 * Sets the value of the To header.
 * @param toParm To header value as an Address object.
 */
jssip.SipMsg.prototype.setTo = function(toParm) {
	this.to = toParm;
}

/**
 * Gets the value of the From header.
 * @returns From header value as an Address object.
 */
jssip.SipMsg.prototype.getFrom = function() {
	return this.from;
}

/**
 * Sets the value of the From header.
 * @param fromParm From header value as an Address object.
 */
jssip.SipMsg.prototype.setFrom = function(fromParm) {
	this.from = fromParm;
}

/**
 * Gets the sequence number from the CSeq header.
 * @returns The sequence number from the CSeq header as an integer.
 */
jssip.SipMsg.prototype.getCSeq = function() {
	return this.cseqValue;
}

/**
 * Sets the sequence number in the CSeq header.
 * @param parm The sequence number in the CSeq header as an integer.
 */
jssip.SipMsg.prototype.setCSeq = function(parm) {
	this.cseqValue = parm;
}

/**
 * Gets the method in the CSeq header.
 * @returns Method index in the CSeq header. See jssip.SipMsg.method.
 */
jssip.SipMsg.prototype.getCSeqMethod = function() {
	return this.cseqMethod;
}

/**
 * Sets the method in the CSeq header.
 * @param parm Method index in the CSeq header. See jssip.SipMsg.method.
 */
jssip.SipMsg.prototype.setCSeqMethod = function(parm) {
	this.cseqMethod = parm;
}

/**
 * Gets the body of the SIP message.
 * @returns The body of the SIP message as string.
 */
jssip.SipMsg.prototype.getBody = function() {
	var b = this.body;
	if( b == "" )
		b = null;
	return b;
}

/**
 * Sets the body of the SIP message.
 * @param parm The body of the SIP message as string.
 */
jssip.SipMsg.prototype.setBody = function(parm) {
	this.body = parm;
}

/**
 * Gets the Via headers.
 * @returns Via headers as Array of Via objects.
 */
jssip.SipMsg.prototype.getVias = function() {
	return this.vias;
}

/**
 * Sets the Via headers.
 * @param parm Via headers as Array of Via objects.
 */
jssip.SipMsg.prototype.setVias = function(parm) {
	this.vias = parm;
}

/**
 * Gets the value of the Route header.
 * @returns The value of the Route header.
 */
jssip.SipMsg.prototype.getRoutes = function() {
	return this.routes;
}

/**
 * Sets the value of the Route header.
 * @param parm The value of the Route header.
 */
jssip.SipMsg.prototype.setRoutes = function(parm) {
	this.routes = parm;
}

/**
 * Checks whether this SipMsg is inside a dialog.
 * @returns {Boolean} Returns true if the To tag is non-empty.
 */
jssip.SipMsg.prototype.isInsideDialog = function() {
	return this.getTo().getTag() != null;
}
jssip.TransportManager = function() {
	this.transports = [];
}

jssip.TransportManager.prototype.class = "TransportManager";

jssip.TransportManager.prototype.transports = null;
jssip.TransportManager.prototype.uastm = null;
jssip.TransportManager.prototype.uactm = null;

jssip.TransportManager.prototype.addTransport = function(transport) {
	this.transports.push( transport );
	transport.initialize(this);
}

// Prepared for only 1 transport for now
jssip.TransportManager.prototype.selectTransport = function(msg) {
	if( this.transports.length < 1)
		return null;
	else
		return this.transports[0];
}

jssip.TransportManager.prototype.send = function(msg) {
	var transport = this.selectTransport(msg);
	if( transport == null )
		return false;
	var formatted = msg.format();
	return transport.send( formatted );
}

jssip.TransportManager.prototype.incoming = function(msg) {
	var sipmsg = new jssip.SipMsg();
// Drop message if it cannot be parsed
	if( !sipmsg.parseMessage(msg) )
		return;
	if( sipmsg.isRequest()) {
		if( this.uastm != null ) {
			this.uastm.incoming( sipmsg);
		}
	} else {
		if( this.uactm != null )
			this.uactm.incoming( sipmsg );
	}
}

jssip.TransportManager.prototype.setUacTransactionManager = function(uactmParm) {
	this.uactm = uactmParm;
}

jssip.TransportManager.prototype.setUasTransactionManager = function(uastmParm) {
	this.uastm = uastmParm;
}

jssip.UacTransaction = function(tmParm,idParm,msgParm) {
	this.tm = tmParm;
	this.id = idParm;
	this.msg = msgParm;
}

jssip.UacTransaction.prototype.class = "UacTransaction";

jssip.UacTransaction.states = {
		Unknown: -1,
		Started: 0,
		TryingCalling: 1, 
		Proceeding: 2, 
		Completed: 3, 
		Confirmed: 4, 
		Terminating: 5,
		Terminated: 6
}

jssip.UacTransaction.prototype.tm = null;
jssip.UacTransaction.prototype.id = null;
jssip.UacTransaction.prototype.msg = null;
jssip.UacTransaction.prototype.state = jssip.UacTransaction.states.Unknown;

jssip.UacTransaction.prototype.start = function() {
	this.state = jssip.UacTransaction.states.Started;
	this.tm.send(this.msg);
}

jssip.UacTransaction.prototype.incoming = function(sipmsg) {
	if(sipmsg.getResponseCode() < 200 ) {
		if( ( this.state == jssip.UacTransaction.states.Started ) && ( sipmsg.getResponseCode() == 100 ) )
			this.state = jssip.UacTransaction.states.Proceeding;
		if( ( ( this.state == jssip.UacTransaction.states.Started ) ||
			  ( this.state == jssip.UacTransaction.states.Proceeding ) ) &&
			  ( sipmsg.getResponseCode() != jssip.SipMsg.respCode.TRYING ) ) {
			this.tm.passToUser(this.id,sipmsg);
		}
	} else {
		this.tm.passToUser(this.id,sipmsg);
		this.state = jssip.UacTransaction.states.Terminated;
		this.tm.terminate(this.id);
	}
}

jssip.InviteUacTransaction = function(tmParm,idParm,msgParm) {
	this.tm = tmParm;
	this.id = idParm;
	this.msg = msgParm;
}

jssip.InviteUacTransaction.prototype.class = "InviteUacTransaction";

jssip.InviteUacTransaction.states = {
		Unknown: -1,
		TryingCalling: 0, 
		Proceeding: 1, 
		Completed: 2, 
		Confirmed: 3, 
		Terminating: 4,
		Terminated: 5
}

jssip.InviteUacTransaction.prototype.tm = null;
jssip.InviteUacTransaction.prototype.id = null;
jssip.InviteUacTransaction.prototype.msg = null;
jssip.InviteUacTransaction.prototype.state = jssip.InviteUacTransaction.states.Unknown;

jssip.InviteUacTransaction.prototype.start = function() {
	this.state = jssip.InviteUacTransaction.states.TryingCalling;
	this.tm.send(this.msg);
}

jssip.InviteUacTransaction.prototype.incoming = function(sipmsg) {
	if(sipmsg.getResponseCode() < 200 ) {
		if( ( this.state == jssip.InviteUacTransaction.states.Started ) && ( sipmsg.getResponseCode() == 100 ) )
			this.state = jssip.InviteUacTransaction.states.Proceeding;
		if( ( ( this.state == jssip.InviteUacTransaction.states.TryingCalling ) ||
			  ( this.state == jssip.InviteUacTransaction.states.Started ) ||
			  ( this.state == jssip.InviteUacTransaction.states.Proceeding ) ) &&
			  ( sipmsg.getResponseCode() != jssip.SipMsg.respCode.TRYING ) ) {
			this.state = jssip.InviteUacTransaction.states.Proceeding;
			this.tm.passToUser(this.id,sipmsg);
		}
	} else
	if( sipmsg.getResponseCode() < 300 ) {
		this.tm.passToUser(this.id,sipmsg);
		this.state = jssip.InviteUacTransaction.states.Terminated;
// Don't terminate the transaction if this is an OK to CANCEL - further
// responses will be incoming.
		if( sipmsg.getCSeqMethod() != jssip.SipMsg.method.CANCEL )
			this.tm.terminate(this.id);
	} else {
		var toTag = sipmsg.getTo().getTag();
		var ackMsg = this.msg.createAck(toTag);
		this.tm.send(ackMsg);
		this.tm.passToUser(this.id,sipmsg);
		this.state = jssip.InviteUacTransaction.states.Terminated;
		this.tm.terminate(this.id);
	}		
}
/**
 * Handles outgoing (UAC) transactions. Normally the SipStack
 * class is responsible of creating an instance of UacTransactionManager.
 * @constructor
 * @param tmParm
 * @param userParm
 */

jssip.UacTransactionManager = function(tmParm,userParm) {
	this.tm = tmParm;
	this.user = userParm;
	if(this.tm != null )
		this.tm.setUacTransactionManager(this);
	this.transactions = new Object();
}

jssip.UacTransactionManager.prototype.class = "UacTransactionManager";
jssip.UacTransactionManager.prototype.tm = null;
jssip.UacTransactionManager.prototype.user = null;

jssip.UacTransactionManager.MAGIC = "z9hG4bK";
jssip.UacTransactionManager.MAGICLEN=7;

jssip.UacTransactionManager.prototype.transactions = null;

/**
 * @private
 * @param sipmsg
 * @returns {String}
 */
jssip.UacTransactionManager.generateKey = function(sipmsg) {
	var rnd1 = ( Math.floor( Math.random() * 65536 ) *
			Math.floor( Math.random() * 65536 ) ) +
			4294967296;
	var rnd2 = ( Math.floor( Math.random() * 65536 ) *
			Math.floor( Math.random() * 65536 ) ) +
			4294967296;
	var key = rnd1.toString(16) + "_" + rnd2.toString(16);
	return key;
}

/**
 * @private
 * @param sipmsg
 * @returns
 */
jssip.UacTransactionManager.extractKey = function(sipmsg) {
	var key = null;
	var vias = sipmsg.getVias();
	var via = vias[0];
	var branch = via.getBranch();
	if( branch.substr(0,jssip.UacTransactionManager.MAGICLEN) == jssip.UacTransactionManager.MAGIC ) {
		key = branch.substr(jssip.UacTransactionManager.MAGICLEN);
	}
	return key;
}

/**
 * Sends a SIP request as a new UAC transaction. Top-level Via
 * header will be generated with a new branch ID if the parameter
 * message does not yet contain it.
 * @param sipmsg A SipMsg object, representing the request.
 * @returns transaction ID string
 */
jssip.UacTransactionManager.prototype.sendRequest = function(sipmsg) {
	if( sipmsg.getReqUri().isEmpty() ||
		( sipmsg.getCSeqMethod() == jssip.SipMsg.method.UNDEFINED )||
		sipmsg.getTo().getNameAddr().getUri().isEmpty() ||
		sipmsg.getFrom().getNameAddr().getUri().isEmpty() ||
		( sipmsg.getMethod() == jssip.SipMsg.method.UNDEFINED ) )
		return null;
	var id = null;
	var vias = sipmsg.getVias();
	if( ( vias == null ) || ( vias.length == 0 ) )
		id = this.addTopLevelVia(sipmsg);
	else {
		id = vias[0].getBranch().substr(0,jssip.UacTransactionManager.MAGICLEN);
	}
	var trans = null;
	if( sipmsg.getMethod() == jssip.SipMsg.method.INVITE ) {
		trans = new jssip.InviteUacTransaction( this,id, sipmsg);
	} else {
		trans = new jssip.UacTransaction( this,id,sipmsg);
	}

	trans.start();
	this.transactions[id] = trans;
	return id;
}

/**
 * @private
 * @param sipmsg
 */
jssip.UacTransactionManager.prototype.incoming = function(sipmsg) {
	var vias = sipmsg.getVias();
	if( ( vias == null ) || ( vias.length == 0 ) )
		return;
	var branch = vias[0].getBranch();
	if( branch == null || branch.length < jssip.UacTransactionManager.MAGICLEN )
		return;
	var id = jssip.UacTransactionManager.extractKey(sipmsg);
	var trans = this.transactions[id];
	if( typeof trans == "undefined")
		return;
	trans.incoming(sipmsg);
}

/**
 * @private
 * @param id
 */
jssip.UacTransactionManager.prototype.terminate = function(id) {
	delete this.transactions[id];
}

/**
 * @private
 * @param sipmsg
 * @returns
 */
jssip.UacTransactionManager.prototype.addTopLevelVia = function(sipmsg) {
	var viahdr = new jssip.Via();
	viahdr.empty();
	viahdr.setTransport( "TCP");
	viahdr.setSentBy( "127.0.0.1");
	var id = jssip.UacTransactionManager.generateKey(sipmsg);
	viahdr.setBranch( jssip.UacTransactionManager.MAGIC+id);
	sipmsg.setVias( [ viahdr ] );
	return id;
}

/**
 * Sets the user of the UacTransactionManager. The user object must
 * implement the incomingUac(id,sipmsg) method. Normally called by the Dialog layer.
 * @param userParm
 */
jssip.UacTransactionManager.prototype.setUser = function(userParm) {
	this.user = userParm;
}

/**
 * @private
 * @param id
 * @param sipmsg
 */
jssip.UacTransactionManager.prototype.passToUser = function(id,sipmsg) {
	if( this.user != null ) {
		this.user.incomingUac( id,sipmsg );
	}
}

/**
 * @private
 * @param sipmsg
 */
jssip.UacTransactionManager.prototype.send = function(sipmsg) {
	this.tm.send(sipmsg);
}
jssip.UasTransaction = function(tmParm,idParm,msgParm) {
	this.tm = tmParm;
	this.id = idParm;
	this.msg = msgParm;
}

jssip.UasTransaction.prototype.class = "UasTransaction";

jssip.UasTransaction.states = {
		Unknown: -1,
		Started: 0,
		TryingCalling: 1, 
		Proceeding: 2, 
		Completed: 3, 
		Confirmed: 4, 
		Terminating: 5,
		Terminated: 6
}

jssip.UasTransaction.prototype.tm = null;
jssip.UasTransaction.prototype.id = null;
jssip.UasTransaction.prototype.msg = null;
jssip.UasTransaction.prototype.state = jssip.UasTransaction.states.Unknown;

jssip.UasTransaction.prototype.sendResponse = function(sipmsg) {
	var vias = this.msg.getVias();
	sipmsg.setVias(vias);
	this.tm.send(sipmsg);
	this.tm.terminate(this.id);
}

jssip.UasTransaction.prototype.incoming = function(sipmsg) {
}

jssip.UasTransaction.prototype.start = function() {
	this.tm.passToUser(this.id,this.msg);
}

jssip.InviteUasTransaction = function(tmParm,idParm,msgParm) {
	this.tm = tmParm;
	this.id = idParm;
	this.msg = msgParm;
}

jssip.InviteUasTransaction.prototype.class = "InviteUasTransaction";

jssip.InviteUasTransaction.states = {
		Unknown: -1,
		Started: 0,
		TryingCalling: 1, 
		Proceeding: 2, 
		Responded: 3, 
		Acknowledged: 4, 
		Terminating: 5,
		Terminated: 6
}

jssip.InviteUasTransaction.prototype.tm = null;
jssip.InviteUasTransaction.prototype.id = null;
jssip.InviteUasTransaction.prototype.msg = null;
jssip.InviteUasTransaction.prototype.state = jssip.InviteUasTransaction.states.Unknown;

jssip.InviteUasTransaction.prototype.sendResponse = function(sipmsg) {
	var vias = this.msg.getVias();
	sipmsg.setVias(vias);
	this.tm.send(sipmsg);
	if( sipmsg.isResponse() && ( sipmsg.getResponseCode() >= 300) ) {
		this.states = jssip.InviteUasTransaction.states.Responded;
	} else {
		this.states = jssip.InviteUasTransaction.states.Terminating;
	}
}

jssip.InviteUasTransaction.prototype.incoming = function(sipmsg) {
	if(sipmsg.getMethod() == jssip.SipMsg.method.ACK)
		this.tm.terminate(this.id);
	else
	if(sipmsg.getMethod() == jssip.SipMsg.method.INVITE) {
		var rspmsg = sipmsg.createResponse(jssip.SipMsg.respCode.TRYING,jssip.SipMsg.rspText[jssip.SipMsg.respCode.TRYING]);
		this.tm.send(rspmsg);
	}
}

jssip.InviteUasTransaction.prototype.start = function() {
	this.tm.passToUser(this.id,this.msg);	
}

/**
 * Handles incoming (UAS) transactions. Normally SipStack
 * class creates and manages the UasTransactionManager instance.
 * @constructor
 * @param tmParm
 * @param userParm
 */
jssip.UasTransactionManager = function(tmParm,userParm) {
	this.tm = tmParm;
	this.user = userParm;
	if(this.tm != null )
		this.tm.setUasTransactionManager(this);
	this.transactions = new Object();
}

jssip.UasTransactionManager.prototype.class = "UasTransactionManager";
jssip.UasTransactionManager.prototype.tm = null;
jssip.UasTransactionManager.prototype.user = null;

/**
 * @private
 * @param sipmsg
 * @returns
 */
jssip.UasTransactionManager.generateKey = function(sipmsg) {
	var key = null;
	var vias = sipmsg.getVias();
	if( ( vias != null ) && ( vias.length > 0 ) ) {
		var via = vias[0];
		key = via.getBranch()+"+"+
				via.getSentBy();
				
	}
	return key;
}

/**
 * @private
 * @param key
 * @returns
 */
jssip.UasTransactionManager.prototype.findTransaction = function(key) {
	var t = this.transactions[key];
	if( typeof t == "undefined")
		return null;
	return t;
}

/**
 * @private
 * @param key
 * @param trans
 */
jssip.UasTransactionManager.prototype.insertTransaction = function(key,trans) {
	this.transactions[key] = trans;
}

/**
 * @private
 * @param sipmsg
 */
jssip.UasTransactionManager.prototype.incoming = function(sipmsg) {
	var key = jssip.UasTransactionManager.generateKey(sipmsg);
	var trans = this.findTransaction(key);
	if( trans != null ) {
		trans.incoming(sipmsg);
	} else {
		trans = null;
		if( sipmsg.getMethod() == jssip.SipMsg.method.INVITE)
			trans = new jssip.InviteUasTransaction(this,key,sipmsg);
		else
			trans = new jssip.UasTransaction(this,key,sipmsg);
		this.insertTransaction(key,trans);
// Not logical but otherwise the 100 Trying goes out after the first
// response.
		trans.incoming(sipmsg);
		trans.start();
	}
}

/**
 * @private
 */
jssip.UasTransactionManager.prototype.terminate = function(id) {
	delete this.transactions[id];
}

/**
 * Sends a response to an incoming request.
 * @param key Transaction ID of the incoming transaction.
 * @param sipmsg SipMsg instance representing the response message.
 * @returns {Boolean} True if the transaction ID was valid.
 */
jssip.UasTransactionManager.prototype.sendResponse = function(key,sipmsg) {
	var trans = this.findTransaction(key);
	if( trans == null )
		return false;
	trans.sendResponse(sipmsg);
}

/**
 * @private
 * @param userParm
 */
jssip.UasTransactionManager.prototype.setUser = function(userParm) {
	this.user = userParm;
}

/**
 * @private
 * @param id
 * @param sipmsg
 */
jssip.UasTransactionManager.prototype.passToUser = function(id,sipmsg) {
	if( this.user != null )
		this.user.incomingUas( id,sipmsg );
}

/**
 * @private
 * @param sipmsg
 */
jssip.UasTransactionManager.prototype.send = function(sipmsg) {
	this.tm.send(sipmsg);
}
jssip.DialogID = function() {
	this.earlyDialogs = new Array();
	this.dialogMessage = null;
	this.cseq = -1;
}

jssip.DialogID.prototype.class = "DialogID";
jssip.DialogID.prototype.callID = null;
jssip.DialogID.prototype.fromTag = null;
jssip.DialogID.prototype.toTag = null;
jssip.DialogID.prototype.dialog = null;
jssip.DialogID.prototype.earlyDialogs = null;
jssip.DialogID.prototype.dialogMessage = null;
jssip.DialogID.prototype.cseq = -1;
jssip.DialogID.prototype.isResponseMsg = false;

jssip.DialogID.prototype.set = function(sipmsg) {
	this.isResponseMsg = sipmsg.isResponse();
	this.callID = sipmsg.getCallId();
	var address = sipmsg.getFrom();
	var tag = address.getTag();
	if( tag == "")
		tag = null;
	this.fromTag = tag;
	address = sipmsg.getTo();
	tag = address.getTag();
	if( tag == "")
		tag = null;
	this.toTag = tag;
}

jssip.DialogID.prototype.equals = function(id) {
	if( this.callID != id.callID )
		return false;
// This dialog ID is the search instance. It is compared
// against the dialog ID (id) extracted from the message on which
// the dialog is based (initiating request for outgoing dialogs,
// dialog-establishing response for incoming dialogs).
// Rules for direct match (search from-base from, search to-base to or base null)
// - If the base dialog ID was created from a response (incoming dialog) and the 
//   search dialog ID was created from a request. 
// - If the base dialog ID was created from a request and the search dialog ID
//   was created from a response
// Rules for reverse match (search from-base to, search to-base from)
// - If the base dialog ID was created from a request and the search dialog
// was created from a request too
// - If the base dialog ID was created from a response and the search dialog ID 
	if( ( id.isResponse() && !this.isResponse() ) || ( !id.isResponse() && this.isResponse())) {
		if( this.fromTag != id.fromTag )
			return false;
		if( this.toTag == null )
			return true;
		return this.toTag == id.toTag;
	} else {
		if( this.toTag != id.fromTag )
			return false;
		return this.fromTag == id.toTag;		
	}
}

jssip.DialogID.prototype.simpleEquals = function(id) {
	if( this.callID != id.callID )
		return false;
	if( this.fromTag != id.fromTag )
			return false;
	if( this.toTag == null )
			return true;
	return this.toTag == id.toTag;
}

jssip.DialogID.prototype.createEarlyDialog = function(sipmsg,baseCSeq) {
	var tag = sipmsg.getTo().getTag();
	var existingDialogState = null;
	var contactHdr = sipmsg.findHeader( jssip.SipMsg.headers.CONTACT );
	if( contactHdr == null )
		return null;
	if( tag != null ) {
		if( typeof this.earlyDialogs[tag] == "undefined") {
			var dialogState = new Object();
			dialogState.msg = sipmsg;
			dialogState.cseq = baseCSeq;
			dialogState.early = false;
			this.earlyDialogs[tag] = dialogState;
			existingDialogState = dialogState;
		} else {
			existingDialogState = this.earlyDialogs[tag];
		}
	}
	return existingDialogState;
}

jssip.DialogID.prototype.establishFinalDialog = function(sipmsg) {
	var tag = sipmsg.getTo().getTag();
	if( tag != null ) {
		if( typeof this.earlyDialogs[tag] == "undefined") {
			this.dialogMessage = sipmsg;
			this.cseq = sipmsg.getCSeq();
		} else {
			var dialogStatus = this.earlyDialogs[tag];
			this.dialogMessage = dialogStatus.msg;
			this.cseq = dialogStatus.cseq;
		}
		this.toTag = tag;
		this.earlyDialogs = null;
	}
}

jssip.DialogID.prototype.findEarlyDialog = function(tag) {
	var dialogState = null;
	if( typeof this.earlyDialogs[tag] != "undefined") {
		dialogState = this.earlyDialogs[tag];
	}
	return dialogState;
}

jssip.DialogID.prototype.stepCSeq = function(tag) {
	var cseq = 0;
	if(this.cseq >= 0) {
		this.cseq = this.cseq + 1;
		cseq = this.cseq;
	} else {
		if( typeof this.earlyDialogs[tag] == "undefined")
			cseq = 1;
		else {
			cseq = this.earlyDialogs[tag].cseq+1;
			this.earlyDialogs[tag].cseq = cseq;
		}
	}
	return cseq;
}

jssip.DialogID.prototype.getCSeq = function(tag) {
	var cseq = 0;
	if(this.cseq >= 0) {
		cseq = this.cseq;
	} else {
		if( typeof this.earlyDialogs[tag] == "undefined")
			cseq = 1;
		else {
			cseq = this.earlyDialogs[tag].cseq;
		}
	}
	return cseq;	
}

jssip.DialogID.prototype.getCallID = function() {
	return this.callID;
}

jssip.DialogID.prototype.setCallID = function(callIDParm) {
	this.callID = callIDParm;
}

jssip.DialogID.prototype.getFromTag = function() {
	return this.fromTag;
}

jssip.DialogID.prototype.setFromTag = function(fromTagParm) {
	this.fromTag = fromTagParm;
}

jssip.DialogID.prototype.getToTag = function() {
	return this.toTag;
}

jssip.DialogID.prototype.setToTag = function(toTagParm) {
	this.toTag = toTagParm;
}

jssip.DialogID.prototype.getDialog = function() {
	return this.dialog;
}

jssip.DialogID.prototype.setDialog = function(dialogParm) {
	this.dialog = dialogParm;
}

jssip.DialogID.prototype.getDialogMessage = function() {
	return this.dialogMessage;
}

jssip.DialogID.prototype.setResponse = function(response) {
	this.isResponseMsg = response;
}

jssip.DialogID.prototype.isResponse = function() {
	return this.isResponseMsg;
}
/**
 * DialogManager is responsible for SIP dialog handling. DialogManager
 * instance is normally created by the SipStack instance.
 * @constructor
 * @param uactmParm UacTransactionManager instance
 * @param uastmParm UasTransactionManager instance
 */
jssip.DialogManager = function(uactmParm,uastmParm) {
	this.uactm = uactmParm;
	this.uastm = uastmParm;
	this.defaultMethodHandler = new Array();
	if( this.uactm != null )
		this.uactm.setUser(this);
	if( this.uastm != null )
		this.uastm.setUser(this);
	this.dialogs = new Array();
}

jssip.DialogManager.prototype.class = "DialogManager";
jssip.DialogManager.prototype.uactm = null;
jssip.DialogManager.prototype.uastm = null;
jssip.DialogManager.prototype.defaultMethodHandler = null;
jssip.DialogManager.prototype.dialogs = null;

/**
 * @private
 * @returns {String}
 */
jssip.DialogManager.generateCallID = function() {
	var timestamp = new Date().getTime();
	var rand = 	( Math.floor( Math.random() * 65536 ) *
			Math.floor( Math.random() * 65536 ) ) +
			4294967296;
	return timestamp.toString() + "_" + rand.toString() +
			"@localhost";
}

/**
 * @private
 * @returns
 */
jssip.DialogManager.generateTag = function() {
	var rand = 	( Math.floor( Math.random() * 65536 ) *
			Math.floor( Math.random() * 65536 ) *
			Math.floor( Math.random() * 65536 ) )
			+
			281474976710656;
	return rand.toString();
}

/**
 * @private
 */
jssip.DialogManager.prototype.registerDefaultMethodHandler = function(method,handlerObj) {
	this.defaultMethodHandler[method] = handlerObj;
}

/**
 * Creates a request that belongs to a dialog. If the From address does
 * not yet have tag parameter, it is generated.
 * @param method Method ID (properties of jssip.SipMsg.method object)
 * @param reqUri Uri instance representing the request URI.
 * @param to To address
 * @param from From address
 * @returns {jssip.SipMsg} SipMsg instance representing the request.
 */
jssip.DialogManager.prototype.createRequest = function(method,reqUri,to,from) {
	var callid = jssip.DialogManager.generateCallID();
	var sipmsg = new jssip.SipMsg();
	var fromAddr = new jssip.Address();
	fromAddr.set(from);
	if( fromAddr.getTag() == null )
		fromAddr.setTag( jssip.DialogManager.generateTag());
	sipmsg.setRequest(method,reqUri,to,fromAddr,callid);
	return sipmsg;
}


/**
 * Creates a request that belongs to an established dialog.
 * @param method Method ID (properties of jssip.SipMsg.method object)
 * @param id DialogID instance
 * @param toTag To tag of the early dialog or null if the dialog is already established.
 * @param reverse Reverses To and From address fields related to the message that established the dialog.
 *	This is needed for requests sent in the scope of incoming dialogs because the From and To
 *	headers are in the order of our response that established the dialog and
 *  reflect the To and From headers of the calling party.
 * @returns {jssip.SipMsg} Request message instance.
 */
jssip.DialogManager.prototype.createDialogRequest = function(method, id,toTag,reverse) {
	var dialogRsp = id.getDialogMessage();
	if( dialogRsp == null ) {		
		var dialogState = id.findEarlyDialog(toTag);
		dialogRsp = dialogState.msg;
	}
	var cseq = 0;
	if( method == jssip.SipMsg.method.ACK)
		cseq = id.getCSeq();
	else
		cseq = id.stepCSeq(toTag);
	var callid = dialogRsp.getCallId();
	var sipmsg = new jssip.SipMsg();
	var fromAddr = dialogRsp.getFrom().clone();
	var toAddr = dialogRsp.getTo().clone();
	if( reverse ) {
		var tmp = fromAddr;
		fromAddr = toAddr;
		toAddr = tmp;
	}
	var contactStr = dialogRsp.findHeader( jssip.SipMsg.headers.CONTACT);
	var dialogTargetURI = new jssip.Uri();
	dialogTargetURI.set( contactStr );
	sipmsg.setRequest(method, dialogTargetURI, toAddr, fromAddr, callid, cseq);
	var rrHdr = dialogRsp.findHeader( jssip.SipMsg.headers.RECORD_ROUTE );
	if( rrHdr != null ) {
		var rrHdrObj = new jssip.RecordRouteHeader();
		rrHdrObj.set( rrHdr );
		sipmsg.setRoutes( rrHdrObj.reverseFormat());
	}
	return sipmsg;
}

/**
 * @private
 * @param sipmsg
 * @returns
 */
jssip.DialogManager.prototype.findDialog = function(sipmsg) {
	var fid = new jssip.DialogID();
	fid.set( sipmsg );
	for( var i = 0 ; i < this.dialogs.length ; ++i ) {
		var cid = this.dialogs[i];
		if( cid.equals( fid))
			return cid;
	}
	return null;
}

/**
 * @private
 * @param dialogID
 * @param rspmsg
 */
jssip.DialogManager.prototype.setToTag = function(rspmsg) {
	if( rspmsg.getTo().getTag() == null ) {
		var toTag = jssip.DialogManager.generateTag();
		rspmsg.getTo().setTag( toTag );
	}
}

/**
 * @private
 * @param dialogID
 * @param id
 * @param sipmsg
 * @param uac
 * @param error
 */
jssip.DialogManager.prototype.sendDialogError = function(id,sipmsg,uac,error) {
	if(sipmsg.isResponse())
		return;
	if(sipmsg.getMethod() == jssip.SipMsg.method.ACK)
		return;
	var rsp = sipmsg.createResponse(
			error,
			jssip.SipMsg.rspText[error]);
	this.setToTag(rsp);
	if(uac)
		this.uactm.send(rsp);
	else
		this.uastm.sendResponse(id,rsp);
}

/**
 * @private
 */
jssip.DialogManager.prototype.insertDialog = function(dialog,sipmsg) {
	var id = new jssip.DialogID();
	id.set(sipmsg);
	id.setDialog(dialog);
	this.dialogs.push(id);
	return id;
}

/**
 * @private
 * @param id
 * @returns {Boolean}
 */
jssip.DialogManager.prototype.removeDialog = function(id) {
	var i;
	for( i = 0 ; i < this.dialogs.length ; ++i ) {
		var cid = this.dialogs[i];
		if( cid.simpleEquals( id)) {
			this.dialogs.splice(i,1);
			return true;
		}
	}
	return false;
}

/**
 * @private
 * @param id
 * @param sipmsg
 * @param uac
 */
jssip.DialogManager.prototype.incomingCommon = function(id,sipmsg,uac) {
	if( sipmsg.isInsideDialog()) {
		var existingDialogID = this.findDialog(sipmsg);
		if( existingDialogID == null )
			this.sendDialogError(
					id,
					sipmsg,
					uac,
					jssip.SipMsg.respCode.CALL_TRANSACTION_DOES_NOT_EXIST);
		else {
			var dialog = existingDialogID.getDialog();
			if( dialog != null) {
				dialog.incoming(existingDialogID,id,sipmsg);
			} else
				this.sendDialogError(
						id,
						sipmsg,
						uac,
						jssip.SipMsg.respCode.SERVER_INTERNAL_ERROR);
		}
	} else {	// incoming request, not yet in dialog
		if(sipmsg.isRequest()) {
			var handlerObj = this.defaultMethodHandler[sipmsg.getMethod()];
			if( typeof handlerObj != "undefined") {
				handlerObj.handler(id,sipmsg);
			} else
				this.sendDialogError(
						id,
						sipmsg,
						uac,
						jssip.SipMsg.respCode.NOT_IMPLEMENTED);				
		}
	}
}

/**
 * @private
 * @param id
 * @param sipmsg
 */
jssip.DialogManager.prototype.incomingUac = function(id,sipmsg) {
	this.incomingCommon(id,sipmsg,true);
}

/**
 * @private
 * @param id
 * @param sipmsg
 */
jssip.DialogManager.prototype.incomingUas = function(id,sipmsg) {
	this.incomingCommon(id,sipmsg,false);
}

/**
 * Creates a SipStack instance. Transport object needs to be added
 * before the object can be used.
 * @constructor
 */
jssip.SipStack = function() {
	this.transportManager = new jssip.TransportManager();
	this.uacTM = new jssip.UacTransactionManager(this.transportManager,null);
	this.uasTM = new jssip.UasTransactionManager(this.transportManager,null);
	this.dialogManager = new jssip.DialogManager(this.uacTM,this.uasTM);	
}

jssip.SipStack.prototype.class = "SipStack";
jssip.SipStack.prototype.transportManager = null;
jssip.SipStack.prototype.uacTM = null;
jssip.SipStack.prototype.uasTM = null;
jssip.SipStack.prototype.dialogManager = null;

/**
 * Adds a transport to the SipStack instance.
 * @param transport The transport object to be added.
 */
jssip.SipStack.prototype.addTransport = function(transport) {
	this.transportManager.addTransport(transport);
}

/**
 * Returns the UacTransactionManager instance created by
 * the SipStack instance. 
 * @returns {jssip.UacTransactionManager}
 */
jssip.SipStack.prototype.getUacTM = function() {
	return this.uacTM;
}

/**
 * Returns the UasTransactionManager instance created by
 * the SipStack instance.
 * @returns {jssip.UasTransactionManager}
 */
jssip.SipStack.prototype.getUasTM = function() {
	return this.uasTM;
}

/**
 * Returns the DialogManager instance created by the SipStack
 * instance.
 * @returns {jssip.DialogManager}
 */
jssip.SipStack.prototype.getDialogManager = function() {
	return this.dialogManager;
}
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

jssip.md5 = new Object();

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
jssip.md5.hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
jssip.md5.b64pad  = "";  /* base-64 pad character. "=" for strict RFC compliance   */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
jssip.md5.hex_md5 = function(s)    
	{ return jssip.md5.rstr2hex(jssip.md5.rstr_md5(jssip.md5.str2rstr_utf8(s))); }
jssip.md5.b64_md5 = function(s)
	{ return jssip.md5.rstr2b64(jssip.md5.rstr_md5(jssip.md5.str2rstr_utf8(s))); }
jssip.md5.any_md5 = function(s, e) { return jssip.md5.rstr2any(jssip.md5.rstr_md5(jssip.md5.str2rstr_utf8(s)), e); }
jssip.md5.hex_hmac_md5 = function(k, d)
  { return jssip.md5.rstr2hex(jssip.md5.rstr_hmac_md5(jssip.md5.str2rstr_utf8(k), str2rstr_utf8(d))); }
jssip.md5.b64_hmac_md5 = function(k, d)
  { return jssip.md5.rstr2b64(jssip.md5.rstr_hmac_md5(jssip.md5.str2rstr_utf8(k), str2rstr_utf8(d))); }
jssip.md5.any_hmac_md5 = function(k, d, e)
  { return jssip.md5.rstr2any(jssip.md5.rstr_hmac_md5(jssip.md5.str2rstr_utf8(k), str2rstr_utf8(d)), e); }

/*
 * Calculate the MD5 of a raw string
 */
jssip.md5.rstr_md5 = function(s)
{
  var r = jssip.md5.binl2rstr(jssip.md5.binl_md5(jssip.md5.rstr2binl(s), s.length * 8));
  return r;
}

/*
 * Calculate the HMAC-MD5, of a key and some data (raw strings)
 */
jssip.md5.rstr_hmac_md5 = function(key, data)
{
  var bkey = jssip.md5.rstr2binl(key);
  if(bkey.length > 16) bkey = jssip.md5.binl_md5(bkey, key.length * 8);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = jssip.md5.binl_md5(ipad.concat(jssip.md5.rstr2binl(data)), 512 + data.length * 8);
  return jssip.md5.binl2rstr(jssip.md5.binl_md5(opad.concat(hash), 512 + 128));
}

/*
 * Convert a raw string to a hex string
 */
jssip.md5.rstr2hex = function(input)
{
  try { jssip.md5.hexcase } catch(e) { jssip.md5.hexcase=0; }
  var hex_tab = jssip.md5.hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var output = "";
  var x;
  for(var i = 0; i < input.length; i++)
  {
    x = input.charCodeAt(i);
    output += hex_tab.charAt((x >>> 4) & 0x0F)
           +  hex_tab.charAt( x        & 0x0F);
  }
  return output;
}

/*
 * Convert a raw string to a base-64 string
 */
jssip.md5.rstr2b64 = function(input)
{
  try { jssip.md5.b64pad } catch(e) { jssip.md5.b64pad=''; }
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var len = input.length;
  for(var i = 0; i < len; i += 3)
  {
    var triplet = (input.charCodeAt(i) << 16)
                | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
                | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > input.length * 8) output += jssip.md5.b64pad;
      else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
    }
  }
  return output;
}

/*
 * Convert a raw string to an arbitrary string encoding
 */
jssip.md5.rstr2any = function(input, encoding)
{
  var divisor = encoding.length;
  var i, j, q, x, quotient;

  /* Convert to an array of 16-bit big-endian values, forming the dividend */
  var dividend = Array(Math.ceil(input.length / 2));
  for(i = 0; i < dividend.length; i++)
  {
    dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
  }

  /*
   * Repeatedly perform a long division. The binary array forms the dividend,
   * the length of the encoding is the divisor. Once computed, the quotient
   * forms the dividend for the next step. All remainders are stored for later
   * use.
   */
  var full_length = Math.ceil(input.length * 8 /
                                    (Math.log(encoding.length) / Math.log(2)));
  var remainders = Array(full_length);
  for(j = 0; j < full_length; j++)
  {
    quotient = Array();
    x = 0;
    for(i = 0; i < dividend.length; i++)
    {
      x = (x << 16) + dividend[i];
      q = Math.floor(x / divisor);
      x -= q * divisor;
      if(quotient.length > 0 || q > 0)
        quotient[quotient.length] = q;
    }
    remainders[j] = x;
    dividend = quotient;
  }

  /* Convert the remainders to the output string */
  var output = "";
  for(i = remainders.length - 1; i >= 0; i--)
    output += encoding.charAt(remainders[i]);

  return output;
}

/*
 * Encode a string as utf-8.
 * For efficiency, this assumes the input is valid utf-16.
 */
jssip.md5.str2rstr_utf8 = function(input)
{
  var output = "";
  var i = -1;
  var x, y;

  while(++i < input.length)
  {
    /* Decode utf-16 surrogate pairs */
    x = input.charCodeAt(i);
    y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
    if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
    {
      x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
      i++;
    }

    /* Encode output as utf-8 */
    if(x <= 0x7F)
      output += String.fromCharCode(x);
    else if(x <= 0x7FF)
      output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0xFFFF)
      output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0x1FFFFF)
      output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                    0x80 | ((x >>> 12) & 0x3F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
  }
  return output;
}

/*
 * Encode a string as utf-16
 */
jssip.md5.str2rstr_utf16le = function(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
                                  (input.charCodeAt(i) >>> 8) & 0xFF);
  return output;
}

jssip.md5.str2rstr_utf16be = function(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                                   input.charCodeAt(i)        & 0xFF);
  return output;
}

/*
 * Convert a raw string to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */
jssip.md5.rstr2binl = function(input)
{
  var output = Array(input.length >> 2);
  for(var i = 0; i < output.length; i++)
    output[i] = 0;
  for(var i = 0; i < input.length * 8; i += 8)
    output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
  return output;
}

/*
 * Convert an array of little-endian words to a string
 */
jssip.md5.binl2rstr = function(input)
{
  var output = "";
  for(var i = 0; i < input.length * 32; i += 8) {
	var code = (input[i>>5] >>> (i % 32)) & 0xFF;
	output += String.fromCharCode(code);
  }
  return output;
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */
jssip.md5.binl_md5 = function(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = jssip.md5.md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = jssip.md5.md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = jssip.md5.md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = jssip.md5.md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = jssip.md5.md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = jssip.md5.md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = jssip.md5.md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = jssip.md5.md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = jssip.md5.md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = jssip.md5.md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = jssip.md5.md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = jssip.md5.md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = jssip.md5.md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = jssip.md5.md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = jssip.md5.md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = jssip.md5.md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = jssip.md5.md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = jssip.md5.md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = jssip.md5.md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = jssip.md5.md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = jssip.md5.md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = jssip.md5.md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = jssip.md5.md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = jssip.md5.md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = jssip.md5.md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = jssip.md5.md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = jssip.md5.md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = jssip.md5.md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = jssip.md5.md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = jssip.md5.md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = jssip.md5.md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = jssip.md5.md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = jssip.md5.md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = jssip.md5.md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = jssip.md5.md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = jssip.md5.md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = jssip.md5.md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = jssip.md5.md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = jssip.md5.md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = jssip.md5.md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = jssip.md5.md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = jssip.md5.md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = jssip.md5.md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = jssip.md5.md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = jssip.md5.md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = jssip.md5.md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = jssip.md5.md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = jssip.md5.md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = jssip.md5.md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = jssip.md5.md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = jssip.md5.md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = jssip.md5.md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = jssip.md5.md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = jssip.md5.md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = jssip.md5.md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = jssip.md5.md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = jssip.md5.md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = jssip.md5.md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = jssip.md5.md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = jssip.md5.md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = jssip.md5.md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = jssip.md5.md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = jssip.md5.md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = jssip.md5.md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = jssip.md5.safe_add(a, olda);
    b = jssip.md5.safe_add(b, oldb);
    c = jssip.md5.safe_add(c, oldc);
    d = jssip.md5.safe_add(d, oldd);
  }
  return Array(a, b, c, d);
}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
jssip.md5.md5_cmn = function(q, a, b, x, s, t)
{
  return jssip.md5.safe_add(jssip.md5.bit_rol(jssip.md5.safe_add(jssip.md5.safe_add(a, q), jssip.md5.safe_add(x, t)), s),b);
}
jssip.md5.md5_ff = function(a, b, c, d, x, s, t)
{
  return jssip.md5.md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
jssip.md5.md5_gg = function(a, b, c, d, x, s, t)
{
  return jssip.md5.md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
jssip.md5.md5_hh = function(a, b, c, d, x, s, t)
{
  return jssip.md5.md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
jssip.md5.md5_ii = function(a, b, c, d, x, s, t)
{
  return jssip.md5.md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
jssip.md5.safe_add = function(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
jssip.md5.bit_rol = function(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}
/**
 * Creates a Registration instance. Registration covers
 * the whole registration functionality, e.g. initial REGISTER,
 * authentication processing, registration refresh.
 * @constructor
 * @param stackParm A SipStack instance providing lower level
 * services for the Registration function.
 * @param onLoggedInParm Function parameter. If not null,
 * 		it is called at the first successful registration.
 * @param onLoggedOutParm Function parameter. If not null,
 * 		it is called at the successful unregistration.
 * @param onLoginErrorParm Function parameter. If not null,
 * 		it is called in case of registration failure with one integer
 *      parameter. The parameter is the SIP error code.
 */
jssip.Registration = function(stackParm,onLoggedInParm,onLoggedOutParm,onLoginErrorParm) {
	this.stack = stackParm;
	this.onLoggedIn = onLoggedInParm;
	this.onLoggedOut = onLoggedOutParm;
	this.onLoginError = onLoginErrorParm;
	this.state = jssip.Registration.states.Idle;
}

jssip.Registration.states = {
		Idle: 0,
		InitialSent: 1,
		Challenged: 2, 
		Registered: 3,
		Unregistering: 4,
		UnregisteringChallenged: 5,
		Unregistered: 6
}

jssip.Registration.prototype.class = "Registration";
jssip.Registration.prototype.stack = null;
jssip.Registration.prototype.onLoggedIn = null;
jssip.Registration.prototype.onLoggedOut = null;
jssip.Registration.prototype.onLoginError = null;
jssip.Registration.prototype.registrarURI = null;
jssip.Registration.prototype.publicUIAddress = null;
jssip.Registration.prototype.privateUIAddress = null;
jssip.Registration.prototype.secret = null;
jssip.Registration.prototype.contactURI = null;
jssip.Registration.prototype.prevCSeq = 0;
jssip.Registration.prototype.callId = 0;
jssip.Registration.prototype.state = jssip.Registration.states.Idle;
jssip.Registration.prototype.dialogID = 0;
jssip.Registration.DEFAULT_REGISTRATION_TIME = 3600;

/**
 * Starts the registration procedure. 
 * @param registrar Uri instance representing the registrar address
 * @param publicUI String representing the public user identity.
 * @param privateUI String representing the private user identity
 * @param secret Secret used for authentication.
 * @returns true if the registration procedure was successfully started. Success/failure
 * of the entire procedure will be communicated via callbacks.
 */
jssip.Registration.prototype.register = function(registrar,publicUI,privateUI,secret) {
	this.setupAddresses(registrar,publicUI,privateUI,secret);
	var dm = this.stack.getDialogManager();
	var uactm = this.stack.getUacTM();
	var regMsg = this.createRegisterMsg(jssip.Registration.DEFAULT_REGISTRATION_TIME);
	this.prevCSeq = regMsg.getCSeq();
	this.dialogID = dm.insertDialog(this,regMsg);
	this.state = jssip.Registration.states.InitialSent;
	this.callId = regMsg.getCallId();
	uactm.sendRequest(regMsg);
	return true;
}

/**
 * Unregisters a previously registered user.
 */
jssip.Registration.prototype.unregister = function() {
	var dm = this.stack.getDialogManager();
	var uactm = this.stack.getUacTM();
	var regMsg = this.createRegisterMsg(0);
	this.prevCSeq = regMsg.getCSeq();
	this.dialogID = dm.insertDialog(this,regMsg);
	this.state = jssip.Registration.states.Unregistering;
	this.callId = regMsg.getCallId();
	uactm.sendRequest(regMsg);
	return true;
}

/**
 * @private
 */
jssip.Registration.prototype.setupAddresses = function(registrar,publicUI,privateUI,secret) {
	this.registrarURI = new jssip.Uri();
	this.registrarURI.set(registrar);
	this.publicUIAddress = new jssip.Address();
	this.publicUIAddress.set(publicUI);
	this.privateUIAddress = new jssip.Address();
	this.privateUIAddress.set(privateUI);
	this.secret = secret;	
	var username = this.publicUIAddress.getNameAddr().getUri().getUserName();
	this.contactURI = new jssip.Uri();
	this.contactURI.empty();
	this.contactURI.setUserName(username);
	this.contactURI.setHost("localhost");
}

/**
 * @private
 * @returns
 */
jssip.Registration.prototype.createRegisterMsg = function(expires) {
	var dm = this.stack.getDialogManager();
	var regMsg = dm.createRequest( 
			jssip.SipMsg.method.REGISTER, 
			this.registrarURI,
			this.publicUIAddress,
			this.publicUIAddress);
	regMsg.addHeader(jssip.SipMsg.headers.CONTACT,"<"+this.contactURI.format()+">;expires="+expires+";audio;+g.3gpp.icsi-ref=\"urn%3Aurn-7%3A3gpp-application.ims.iari.gsma-vs\"" );
	regMsg.addHeader(jssip.SipMsg.headers.PPI,this.publicUIAddress.format());
	regMsg.addHeader(jssip.SipMsg.headers.SUPPORTED,"path");
	regMsg.addHeader(jssip.SipMsg.headers.ALLOW,"INVITE, ACK, CANCEL, BYE, MESSAGE, OPTIONS, NOTIFY, PRACK, UPDATE, REFER");
	return regMsg;
}

/**
 * @private
 * @param id
 * @param transid
 * @param sipmsg
 */
jssip.Registration.prototype.incoming = function(id,transid,sipmsg) {
	var respCode = sipmsg.getResponseCode();
	switch(respCode) {
	case 200:
		if( ( this.state == jssip.Registration.states.InitialSent ) ||
			( this.state == jssip.Registration.states.Challenged ) ) {
			this.onLoggedIn();
			this.state = jssip.Registration.states.Registered;
			this.scheduleRegistrationRefresh(sipmsg);
		} else
		if( ( this.state == jssip.Registration.states.Unregistering ) ||
			( this.state == jssip.Registration.states.UnregisteringChallenged ) ) {
			this.onLoggedOut();
			this.state = jssip.Registration.states.Unregistered;
		}
		break;
		
	case 401:
		if( this.state == jssip.Registration.states.InitialSent ) {
			this.state = jssip.Registration.states.Challenged;
			this.handleChallenge(sipmsg,jssip.Registration.DEFAULT_REGISTRATION_TIME);
		} else
		if( this.state == jssip.Registration.states.Unregistering ) {
			this.state = jssip.Registration.states.UnregisteringChallenged;
			this.handleChallenge(sipmsg,0);
		} else
		if( ( this.state == jssip.Registration.states.Challenged ) ||
			( this.state == jssip.Registration.states.UnregisteringChallenged )	)
			this.onLoginError(sipmsg);
		break;
		
	default:
		this.onLoginError(sipmsg);
		break;
	}
	var dm = this.stack.getDialogManager();
	dm.removeDialog(id);
}

/**
 * @private
 * @param sipmsg
 */
jssip.Registration.prototype.scheduleRegistrationRefresh = function(sipmsg) {
	
}

/**
 * @private
 * @param sipmsg
 */
jssip.Registration.prototype.handleChallenge = function(sipmsg,expires) {
	var paValue = sipmsg.findHeader(jssip.SipMsg.headers.WWWAUTHENTICATE);
	if( paValue == null )
		return;
	var hdrobj = new jssip.WWWAuthenticateHeader();
	hdrobj.set( paValue );
	if( hdrobj.getAuth() == jssip.WWWAuthenticateHeader.authmethods.DIGEST ) {
		var regMsg = this.createRegisterMsg(expires);
		regMsg.setCSeq( this.prevCSeq+1);
		regMsg.setCallId( this.callId );
		var nc = "00000001";
		var cnonce = ( Math.floor( Math.random() * 65536 ) *
				Math.floor( Math.random() * 65536 ) ) +
				4294967296;
		cnonce = jssip.md5.hex_md5( cnonce.toString(16));
		var username = this.privateUIAddress.getNameAddr().getUri().format();
		if( username.substr(0,4) == "sip:")
			username = username.substr(4);
		var response = this.getResponse(hdrobj,regMsg,username,nc,cnonce);
		var authHdr = new jssip.AuthorizationHeader();
		authHdr.setAuth( jssip.AuthorizationHeader.authmethods.DIGEST );
		authHdr.setUsername( username );
		authHdr.setRealm( hdrobj.getRealm());
		authHdr.setAlgorithm( "MD5");
		authHdr.setNonce( hdrobj.getNonce());
		authHdr.setNC(nc);
		authHdr.setCnonce( cnonce );
		authHdr.setUri( regMsg.getReqUri().format() );
		authHdr.setQop( hdrobj.getQop());
		authHdr.setResponse( response );
		regMsg.addHeader( jssip.SipMsg.headers.AUTHORIZATION, authHdr.format());
		var dm = this.stack.getDialogManager();
		dm.insertDialog(this,regMsg);
		var uactm = this.stack.getUacTM();
		uactm.sendRequest(regMsg);
	} else
		this.onLoginError(sipmsg);
}

/**
 * @private
 * @param whdr
 * @param sipreq
 * @returns
 */
jssip.Registration.prototype.getResponse = function(whdr,sipreq,username,nc,cnonce) {
	var realm = whdr.getRealm();
	var password = this.secret;
	var nonce = whdr.getNonce();
	var qop = whdr.getQop();
	var secret = jssip.md5.hex_md5(
			this.A1(
					username,
					realm,
					password,
					nonce,
					cnonce
				)
		);
    var inp = "";
    if (nonce!=null) 
    	inp = inp + nonce;
    inp = inp + ":";
    if (qop!=null) {  
    	if (nc!=null)
    		inp = inp + nc;
    	inp = inp + ":";
    	if (cnonce!=null) 
    		inp = inp + cnonce;
    	inp = inp + ":";
    	inp = inp + qop;
    	inp = inp + ":"
    }
    inp = inp + jssip.md5.hex_md5(
    		this.A2(
    				sipreq.getMethod(),
    				sipreq.getReqUri().format(),
    				qop,
    				sipreq.getBody()
    		)
    	);
    return this.KD(secret,inp);
}

/**
 * @private
 * @param username
 * @param realm
 * @param password
 * @param nonce
 * @param cnonce
 * @returns {String}
 */
jssip.Registration.prototype.A1 = function(username,realm,password,nonce,cnonce) {
	var inp = "";
    if( username!=null ) inp = inp + username;
    inp = inp + ":";
    if ( realm!=null ) inp = inp + realm;
    inp = inp + ":";
    if ( password!=null ) inp = inp + password; 
    return inp; 
}

/**
 * @private
 * @param method
 * @param uri
 * @param qop
 * @param body
 * @returns
 */
jssip.Registration.prototype.A2 = function(method,uri,qop,body) {
	inp = "";
	inp = inp + jssip.SipMsg.methodNames[method];
    inp = inp + ":";
    if (uri!=null) 
    	inp = inp + uri;
    
    if( qop!=null && ( qop.toLowerCase() == "auth-int")) {  
       inp = inp + ":";
     if(body==null || body == "") 
    	  inp = inp + jssip.md5.hex_md5("");
      else 
    	  inp = inp + jssip.md5.hex_md5(body);
    }
    return inp;
}

/**
 * @private
 * @param secret
 * @param data
 * @returns
 */
jssip.Registration.prototype.KD = function(secret,data) {
	var inp = secret + ":" + data;
	return jssip.md5.hex_md5(inp);
}

/**
 * Returns the state of the Registration instance. See jssip.Registration.states
 * for possible registration states.
 * @returns The state of the Registration.
 */
jssip.Registration.prototype.getState = function() {
	return this.state;
}

/**
 * Returns the public UI this Registration instance is registered with
 * as an Address instance.
 * @returns The public UI as an Address instance.
 */
jssip.Registration.prototype.getPublicUI = function() {
	return this.publicUIAddress;
}

/**
 * Sets the public UI this Registration instance uses.
 * @param ui Public UI as an Address instance.
 */
jssip.Registration.prototype.setPublicUI = function(ui) {
	this.publicUIAddress = ui;
} 

/**
 * Returns the contact URI of this Registration instance 
 * as an Uri instance
 * @returns {jssip.Uri} The contact URI as an Uri instance.
 */
jssip.Registration.prototype.getContactURI = function() {
	return this.contactURI;
}

/**
 * Sets the contact URI of this Registration instance.
 * @param contactURI
 */
jssip.Registration.prototype.setContactURI = function(contactURI) {
	this.contactURI = contactURI;
}/**
 * OutgoingCall covers the whole outgoing INVITE session
 * functionality, including session creation, dialog setup
 * (early and final), session cancellation or termination.
 * @param stackParm SipStack instance that will be used to 
 * communicate with the other party.
 * @param registrationParm Registration instance that will
 * be used to retrieve the caller preferences.
 * @param earlyDialogEstablishedParm callback method 
 * notifying the user that the early dialog was established.
 * The callback gets the DialogID and the SipMsg instances that 
 * created the given early dialog
 * @param dialogEstablished callback method 
 * notifying the user that the dialog was established.
 * The callback gets the DialogID and the SipMsg instances that 
 * created the given dialog.
 * @param failed callback method notifying the user that the dialog
 * establishment failed. The callback gets the DialogID and
 * the SipMsg instances of the failed dialog.
 * @param terminated callback method notifying the user that the 
 * called party terminated the call
 * @constructor
 */

jssip.OutgoingCall = function(stackParm,registrationParm,earlyDialogEstablishedParm,dialogEstablishedParm,failedParm,terminatedParm) {
	this.stack = stackParm;
	this.registration = registrationParm;
	this.earlyDialogEstablished = earlyDialogEstablishedParm;
	this.dialogEstablished = dialogEstablishedParm;
	this.failed = failedParm;
	this.terminated = terminatedParm;
	this.state = jssip.OutgoingCall.states.Idle;
}

jssip.OutgoingCall.prototype.class = "OutgoingCall";
jssip.OutgoingCall.prototype.stack = null;
jssip.OutgoingCall.prototype.registration = null;
jssip.OutgoingCall.prototype.calledParty = null;
jssip.OutgoingCall.prototype.initialInvite = null;
jssip.OutgoingCall.prototype.dialogID = null;
jssip.OutgoingCall.prototype.earlyDialogEstablished = null;
jssip.OutgoingCall.prototype.dialogEstablished = null;
jssip.OutgoingCall.prototype.failed = null;
jssip.OutgoingCall.prototype.terminated = null;
jssip.OutgoingCall.prototype.state = -1;
jssip.OutgoingCall.prototype.reliable = false;
jssip.OutgoingCall.prototype.baseCSeq = 0;

jssip.OutgoingCall.states = {
		Idle: 0,
		InitialInviteSent: 1,
		Established: 10,
		Failed: 50,
		Terminating: 100,
		Terminated: 101,
		Cancelling: 200,
		Cancelled: 201
}

/**
 * Starts an outgoing INVITE dialog
 * @param calledParty Address instance of the called party
 * @param sdp Offer SDP in the INVITE
 */
jssip.OutgoingCall.prototype.invite = function(calledParty,sdp) {
	var calledPartyAddress = new jssip.Address();
	calledPartyAddress.set( calledParty );
	var callingPartyAddress = this.registration.getPublicUI();
	var dm = this.stack.getDialogManager();
	var inviteMsg = dm.createRequest( 
			jssip.SipMsg.method.INVITE, 
			calledPartyAddress.getNameAddr().getUri(),
			calledPartyAddress,
			callingPartyAddress);
	this.initialInvite = inviteMsg;
	inviteMsg.addHeader(jssip.SipMsg.headers.CONTENT_TYPE,"application/sdp");
	if( this.reliable )
		inviteMsg.addHeader(jssip.SipMsg.headers.SUPPORTED,"100rel" );
	inviteMsg.setBody( sdp );
	var contactHdrValue = "<"+this.registration.getContactURI().format()+">";
	inviteMsg.addHeader(jssip.SipMsg.headers.CONTACT,contactHdrValue);
	this.dialogID = dm.insertDialog(this,inviteMsg);
	this.baseCSeq = inviteMsg.getCSeq();
	var uactm = this.stack.getUacTM();
	this.state = jssip.OutgoingCall.states.InitialInviteSent;
	uactm.sendRequest(inviteMsg);
}

/**
 * Terminates an already established session.
 */
jssip.OutgoingCall.prototype.bye = function() {
	if( this.state == jssip.OutgoingCall.states.Established) {
		var dm = this.stack.getDialogManager();
		var byeMsg = dm.createDialogRequest(jssip.SipMsg.method.BYE,this.dialogID,null,false);
		var uactm = this.stack.getUacTM();
		this.state = jssip.OutgoingCall.states.Terminating;
		uactm.sendRequest(byeMsg);		
	}
}

/**
 * Cancels a session which is in InitialInviteSent state.
 */
jssip.OutgoingCall.prototype.cancel = function() {
	if( this.state == jssip.OutgoingCall.states.InitialInviteSent) {
		var dm = this.stack.getDialogManager();
		var cancelMsg = new jssip.SipMsg();
		cancelMsg.setRequest(
				jssip.SipMsg.method.CANCEL,
				this.initialInvite.getReqUri(),
				this.initialInvite.getTo(),
				this.initialInvite.getFrom(),
				this.initialInvite.getCallId(),
				this.initialInvite.getCSeq(),
				jssip.SipMsg.method.CANCEL
		);
		var vias = this.initialInvite.getVias();
		var viahdr = vias[0];
		var newVia = viahdr.clone();
		cancelMsg.setVias( [ newVia ] );
		cancelMsg.setRoutes( this.initialInvite.getRoutes());
		var uactm = this.stack.getUacTM();
		this.state = jssip.OutgoingCall.states.Cancelling;
		uactm.sendRequest(cancelMsg);		
	}
}

/**
 * Sets whether the dialog supports 100rel. Must be issued before
 * the invite() invocation.
 * @param rel Boolean parameter, true if the dialog supports 100rel in the 
 * initial INVITE.
 */
jssip.OutgoingCall.prototype.setReliable = function(rel) {
	this.reliable = rel;
}

/**
 * Gets the state of the dialog. 
 * @returns The state of the dialog. See jssip.OutgoingCall.states for 
 * further information on dialog states.
 */
jssip.OutgoingCall.prototype.getState = function() {
	return this.state;
}

/**
 * @private
 * @param id
 * @param transid
 * @param sipmsg
 */
jssip.OutgoingCall.prototype.incoming = function(id,transid,sipmsg) {
	if( sipmsg.isResponse()) {
		var respCode = sipmsg.getResponseCode();
		if( respCode >= 300 ) {
			this.failed(id,sipmsg);
			this.state = jssip.OutgoingCall.states.Failed;
		} else {
			switch(respCode) {
			case jssip.SipMsg.respCode.SESSION_PROGRESS:
				var dialogState = id.createEarlyDialog(sipmsg,this.baseCSeq);
				if( dialogState != null ) {
					this.process100Rel(id,transid,sipmsg);
					this.checkEarlyDialog(id,transid,sipmsg,dialogState);
				}
				break;

			case jssip.SipMsg.respCode.RINGING:
				var dialogState = id.createEarlyDialog(sipmsg,this.baseCSeq);
				if( dialogState != null ) {
					this.process100Rel(id,transid,sipmsg);
					this.checkEarlyDialog(id,transid,sipmsg,dialogState);
				}
				break;

			case jssip.SipMsg.respCode.OK:
				var method = sipmsg.getCSeqMethod();
				if( method == jssip.SipMsg.method.PRACK)
					return;	
				if( method == jssip.SipMsg.method.CANCEL) {
					this.state = jssip.OutgoingCall.states.Cancelled;
				} else
				if( method == jssip.SipMsg.method.BYE) {
					this.state = jssip.OutgoingCall.states.Terminated;
					var dm = this.stack.getDialogManager();
					dm.removeDialog(id);
				} else
				if( method == jssip.SipMsg.method.INVITE) {
						id.establishFinalDialog(sipmsg);
						var dm = this.stack.getDialogManager();
						var ackMsg = dm.createDialogRequest(jssip.SipMsg.method.ACK,id,null,false);
						ackMsg.setCSeq( this.baseCSeq );
						ackMsg.setCSeqMethod( jssip.SipMsg.method.ACK );
						var contactHdrValue = "<"+this.registration.getContactURI().format()+">";
						ackMsg.addHeader(jssip.SipMsg.headers.CONTACT,contactHdrValue);
						var uactm = this.stack.getUacTM();
						uactm.sendRequest(ackMsg);
						this.state = jssip.OutgoingCall.states.Established;
						this.dialogEstablished(id,sipmsg);
				}
				break;
			}
		}
	} else {
		if( sipmsg.getMethod() == jssip.SipMsg.method.BYE ) {
			var okByeRsp = sipmsg.createResponse(jssip.SipMsg.respCode.OK,jssip.SipMsg.rspText[jssip.SipMsg.respCode.OK]);
			var uastm = this.stack.getUasTM();
			uastm.sendResponse(transid,okByeRsp);
			this.terminated(id,sipmsg);
		}
	}
}

/**
 * @private
 * @param id
 * @param transid
 * @param sipmsg
 */
jssip.OutgoingCall.prototype.process100Rel = function(id,transid,sipmsg) {
	if( this.reliable) {
		var reqHdr = sipmsg.findHeader(jssip.SipMsg.headers.REQUIRE);
		if( reqHdr != null ) {
			var reqHdrObj = new jssip.OptionHeader();
			reqHdrObj.set( reqHdr );
			if( reqHdrObj.isOptionPresent("100rel")) {
				var dm = this.stack.getDialogManager();
				var toTag = sipmsg.getTo().getTag();
				var prackMsg = dm.createDialogRequest(jssip.SipMsg.method.PRACK,id,toTag,false);
				var rseq = sipmsg.findHeader(jssip.SipMsg.headers.RSEQ);
				if( rseq != null ) {
					var rack = rseq + " " + sipmsg.getCSeq() + " " + jssip.SipMsg.methodNames[sipmsg.getCSeqMethod()];
					prackMsg.addHeader( jssip.SipMsg.headers.RACK,rack);
				}
				var uactm = this.stack.getUacTM();
				uactm.sendRequest(prackMsg);
			}
		}
	}
}

/**
 * @private
 * @param id
 * @param transid
 * @param sipmsg
 * @param dialogState
 */
jssip.OutgoingCall.prototype.checkEarlyDialog = function(id,transid,sipmsg,dialogState) {
	if( !dialogState.early ) {
		dialogState.early = true;
		this.earlyDialogEstablished(id,sipmsg);
	}
}
/**
 * IncomingCall covers the whole incoming INVITE session
 * functionality, including session creation, dialog setup
 * (early and final) and session termination.
 * @param stackParm SipStack instance that will be used to 
 * communicate with the other party.
 * @param incomingParm Callback for incoming calls. The callback has
 * the following parameters: 
 * UAS transaction ID (string instance) for the INVITE transaction
 * and a SipMsg instance of the INVITE message.
 * @param establishedParm Callback for established events. DialogID instance
 * is the parameter for the calback.
 * @param indialogParm Callback for requests inside the dialog.
 * Callback parameters are DialogID instance, InviteUasTransaction instance 
 * and SipMsg instance.
 * @param terminatedParm Callback for incoming session termination
 * requests.  Callback parameters are DialogID instance and the SipMsg instance
 * of the incoming session termination message.
 * @constructor
 */

jssip.IncomingCall = function(stackParm,incomingParm,establishedParm,indialogParm,terminatedParm) {
	this.stack = stackParm;
	this.incomingRequest = incomingParm;
	this.established = establishedParm;
	this.indialog = indialogParm;
	this.terminated = terminatedParm;
	var dm = this.stack.getDialogManager();
	dm.registerDefaultMethodHandler(jssip.SipMsg.method.INVITE,this);
}

jssip.IncomingCall.prototype.class = "IncomingCall";
jssip.IncomingCall.prototype.stack = null;
jssip.IncomingCall.prototype.incomingRequest = null;
jssip.IncomingCall.prototype.established = null;
jssip.IncomingCall.prototype.indialog = null;
jssip.IncomingCall.prototype.terminated = null;
jssip.IncomingCall.prototype.state = -1;


/**
 * Terminates the session identified by DialogID
 * @param id DialogID instance.
 */
jssip.IncomingCall.prototype.bye = function(id) {
	var dm = this.stack.getDialogManager();
	var byeMsg = dm.createDialogRequest(jssip.SipMsg.method.BYE,id,null,true);
	var uactm = this.stack.getUacTM();
	uactm.sendRequest(byeMsg);		
}

/**
 * @private
 * @param transid
 * @param sipmsg
 */
jssip.IncomingCall.prototype.handler = function(transid,sipmsg) {
	this.incomingRequest(transid,sipmsg);
}

/**
 * @private
 * @param id
 * @param transid
 * @param sipmsg
 */
jssip.IncomingCall.prototype.incoming = function(id,transid,sipmsg) {
	if( sipmsg.isRequest()) {
		var handled = false;
		if( sipmsg.getMethod() == jssip.SipMsg.method.PRACK) {
			var okPrackRsp = sipmsg.createResponse(jssip.SipMsg.respCode.OK,jssip.SipMsg.rspText[jssip.SipMsg.respCode.OK]);
			var uastm = this.stack.getUasTM();
			uastm.sendResponse(transid,okPrackRsp);			
			handled = true;
		} else
		if( sipmsg.getMethod() == jssip.SipMsg.method.ACK ) {
			id.establishFinalDialog(sipmsg);
			this.established(id);
			handled = true;
		} else
		if( sipmsg.getMethod() == jssip.SipMsg.method.BYE ) {			
			var okByeRsp = sipmsg.createResponse(jssip.SipMsg.respCode.OK,jssip.SipMsg.rspText[jssip.SipMsg.respCode.OK]);
			var uastm = this.stack.getUasTM();
			uastm.sendResponse(transid,okByeRsp);
			this.terminated(id,sipmsg);
			var dm = this.stack.getDialogManager();
			dm.removeDialog(id);
			handled = true;
		}
		if( !handled && sipmsg.isInsideDialog())
			this.indialog(id,transid,sipmsg);
	} else {
		if( sipmsg.getCSeqMethod() == jssip.SipMsg.method.BYE) {
			this.terminated(id,sipmsg);
		}
	}
}

