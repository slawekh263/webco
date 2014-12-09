'use strict';
var localVideo;
var miniVideo;
var remoteVideo;
var hasLocalStream;
var localStream;
var remoteStream;
var pc;
var socket;
var xmlhttp;
var started = false;
var turnDone = false;
var channelReady = false;
var signalingReady = false;
var msgQueue = [];
var card;
var containerDiv;
var sdpConstraints = {
	'mandatory' : {
		'OfferToReceiveAudio' : true,
		'OfferToReceiveVideo' : true
	},
	'optional' : [{
		'VoiceActivityDetection' : false
	}]
};
var isVideoMuted = false;
var isAudioMuted = false;
var startTime, endTime;
var gatheredIceCandidateTypes = {
	Local : {},
	Remote : {}
};
var infoDivErrors = [];
var stats;
var getStatsTimer;
function initialize() {
	if (errorMessages.length > 0) {
		for (var i = 0; i < errorMessages.length; ++i) {
			window.alert(errorMessages[i]);
		}
		return;
	}
	trace('Initializing; room=' + roomKey + '.');
	card = document.getElementById('card');
	containerDiv = document.getElementById('container');
	localVideo = document.getElementById('localVideo');
	localVideo.addEventListener('loadedmetadata', function() {
		window.onresize();
	});
	miniVideo = document.getElementById('miniVideo');
	remoteVideo = document.getElementById('remoteVideo');
	resetStatus();
	openChannel();
	maybeRequestTurn();
	signalingReady = initiator;
	if (mediaConstraints.audio === false && mediaConstraints.video === false) {
		hasLocalStream = false;
		maybeStart();
	} else {
		hasLocalStream = true;
		doGetUserMedia();
	}
}

function openChannel() {
	trace('Opening channel.');
	var channel = new goog.appengine.Channel(channelToken);
	var handler = {
		'onopen' : onChannelOpened,
		'onmessage' : onChannelMessage,
		'onerror' : onChannelError,
		'onclose' : onChannelClosed
	};
	socket = channel.open(handler);
}

function maybeRequestTurn() {
	if (turnUrl === '') {
		turnDone = true;
		return;
	}
	for (var i = 0, len = pcConfig.iceServers.length; i < len; i++) {
		if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
			turnDone = true;
			return;
		}
	}
	var currentDomain = document.domain;
	if (currentDomain.search('localhost') === -1 && currentDomain.search('apprtc') === -1) {
		turnDone = true;
		return;
	}
	xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = onTurnResult;
	xmlhttp.open('GET', turnUrl, true);
	xmlhttp.send();
}

function onTurnResult() {
	if (xmlhttp.readyState !== 4) {
		return;
	}
	if (xmlhttp.status === 200) {
		var turnServer = JSON.parse(xmlhttp.responseText);
		var iceServers = createIceServers(turnServer.uris, turnServer.username, turnServer.password);
		if (iceServers !== null) {
			pcConfig.iceServers = pcConfig.iceServers.concat(iceServers);
		}
	} else {
		messageError('No TURN server; unlikely that media will traverse networks. ' + 'If this persists please report it to ' + 'discuss-webrtc@googlegroups.com.');
	}
	turnDone = true;
	maybeStart();
}

function resetStatus() {
	if (!initiator) {
		setStatus('Waiting for someone to join: <a href=' + roomLink + '>' + roomLink + '</a>');
	} else {
		setStatus('Initializing...');
	}
}

function doGetUserMedia() {
	try {
		getUserMedia(mediaConstraints, onUserMediaSuccess, onUserMediaError);
		trace('Requested access to local media with mediaConstraints:\n' + '  \'' + JSON.stringify(mediaConstraints) + '\'');
	} catch(e) {
		alert('getUserMedia() failed. Is this a WebRTC capable browser?');
		messageError('getUserMedia failed with exception: ' + e.message);
	}
}

function createPeerConnection() {
	try {
		pc = new RTCPeerConnection(pcConfig, pcConstraints);
		pc.onicecandidate = onIceCandidate;
		trace('Created RTCPeerConnnection with:\n' + '  config: \'' + JSON.stringify(pcConfig) + '\';\n' + '  constraints: \'' + JSON.stringify(pcConstraints) + '\'.');
	} catch(e) {
		messageError('Failed to create PeerConnection, exception: ' + e.message);
		alert('Cannot create RTCPeerConnection object; ' + 'WebRTC is not supported by this browser.');
		return;
	}
	pc.onaddstream = onRemoteStreamAdded;
	pc.onremovestream = onRemoteStreamRemoved;
	pc.onsignalingstatechange = onSignalingStateChanged;
	pc.oniceconnectionstatechange = onIceConnectionStateChanged;
}

function maybeStart() {
	if (!started && signalingReady && channelReady && turnDone && (localStream || !hasLocalStream)) {
		startTime = window.performance.now();
		setStatus('Connecting...');
		trace('Creating PeerConnection.');
		createPeerConnection();
		if (hasLocalStream) {
			trace('Adding local stream.');
			pc.addStream(localStream);
		} else {
			trace('Not sending any stream.');
		}
		started = true;
		if (initiator) {
			doCall();
		} else {
			calleeStart();
		}
	}
}

function setStatus(state) {
	document.getElementById('status').innerHTML = state;
}

function doCall() {
	var constraints = mergeConstraints(offerConstraints, sdpConstraints);
	trace('Sending offer to peer, with constraints: \n' + '  \'' + JSON.stringify(constraints) + '\'.');
	pc.createOffer(setLocalAndSendMessage, onCreateSessionDescriptionError, constraints);
}

function calleeStart() {
	while (msgQueue.length > 0) {
		processSignalingMessage(msgQueue.shift());
	}
}

function doAnswer() {
	trace('Sending answer to peer.');
	pc.createAnswer(setLocalAndSendMessage, onCreateSessionDescriptionError, sdpConstraints);
}

function mergeConstraints(cons1, cons2) {
	var merged = cons1;
	for (var name in cons2.mandatory) {
		merged.mandatory[name] = cons2.mandatory[name];
	}
	merged.optional = merged.optional.concat(cons2.optional);
	return merged;
}

function setLocalAndSendMessage(sessionDescription) {
	sessionDescription.sdp = maybePreferAudioReceiveCodec(sessionDescription.sdp);
	sessionDescription.sdp = maybeSetAudioReceiveBitRate(sessionDescription.sdp);
	sessionDescription.sdp = maybeSetVideoReceiveBitRate(sessionDescription.sdp);
	pc.setLocalDescription(sessionDescription, onSetSessionDescriptionSuccess, onSetSessionDescriptionError);
	sendMessage(sessionDescription);
}

function setRemote(message) {
	if (stereo) {
		message.sdp = addStereo(message.sdp);
	}
	message.sdp = maybePreferAudioSendCodec(message.sdp);
	message.sdp = maybeSetAudioSendBitRate(message.sdp);
	message.sdp = maybeSetVideoSendBitRate(message.sdp);
	message.sdp = maybeSetVideoSendInitialBitRate(message.sdp);
	pc.setRemoteDescription(new RTCSessionDescription(message), onSetRemoteDescriptionSuccess, onSetSessionDescriptionError);
	function onSetRemoteDescriptionSuccess() {
		trace('Set remote session description success.');
		var remoteStreams = pc.getRemoteStreams();
		if (remoteStreams.length > 0 && remoteStreams[0].getVideoTracks().length > 0) {
			trace('Waiting for remote video.');
			waitForRemoteVideo();
		} else {
			trace('No remote video stream; not waiting for media to arrive.');
			transitionToActive();
		}
	}

}

function sendMessage(message) {
	var msgString = JSON.stringify(message);
	trace('C->S: ' + msgString);
	var path = '/message?r=' + roomKey + '&u=' + me;
	var xhr = new XMLHttpRequest();
	xhr.open('POST', path, true);
	xhr.send(msgString);
}

function processSignalingMessage(message) {
	if (!started) {
		messageError('peerConnection has not been created yet!');
		return;
	}
	if (message.type === 'offer') {
		setRemote(message);
		doAnswer();
	} else if (message.type === 'answer') {
		setRemote(message);
	} else if (message.type === 'candidate') {
		var candidate = new RTCIceCandidate({
			sdpMLineIndex : message.label,
			candidate : message.candidate
		});
		noteIceCandidate('Remote', iceCandidateType(message.candidate));
		pc.addIceCandidate(candidate, onAddIceCandidateSuccess, onAddIceCandidateError);
	} else if (message.type === 'bye') {
		onRemoteHangup();
	}
}

function onAddIceCandidateSuccess() {
	trace('Remote candidate added successfully.');
}

function onAddIceCandidateError(error) {
	messageError('Failed to add remote candidate: ' + error.toString());
}

function onChannelOpened() {
	trace('Channel opened.');
	channelReady = true;
	maybeStart();
}

function onChannelMessage(message) {
	trace('S->C: ' + message.data);
	var msg = JSON.parse(message.data);
	if (!initiator && !started) {
		if (msg.type === 'offer') {
			msgQueue.unshift(msg);
			signalingReady = true;
			maybeStart();
		} else {
			msgQueue.push(msg);
		}
	} else {
		processSignalingMessage(msg);
	}
}

function onChannelError() {
	messageError('Channel error.');
}

function onChannelClosed() {
	trace('Channel closed.');
}

function messageError(msg) {
	trace(msg);
	infoDivErrors.push(msg);
	updateInfoDiv();
	showInfoDiv();
}

function onUserMediaSuccess(stream) {
	trace('User has granted access to local media.');
	attachMediaStream(localVideo, stream);
	localVideo.style.opacity = 1;
	localStream = stream;
	maybeStart();
}

function onUserMediaError(error) {
	var errorMessage = 'Failed to get access to local media. Error name was ' + error.name + '. Continuing without sending a stream.';
	messageError(errorMessage);
	alert(errorMessage);
	hasLocalStream = false;
	maybeStart();
}

function onCreateSessionDescriptionError(error) {
	messageError('Failed to create session description: ' + error.toString());
}

function onSetSessionDescriptionSuccess() {
	trace('Set session description success.');
}

function onSetSessionDescriptionError(error) {
	messageError('Failed to set session description: ' + error.toString());
}

function iceCandidateType(candidateSDP) {
	switch(candidateSDP.split(' ')[7]) {
		case'host':
			return 'HOST';
		case'srflx':
			return 'STUN';
		case'relay':
			return 'TURN';
		default:
			return 'UNKNOWN';
	}
}

function onIceCandidate(event) {
	if (event.candidate) {
		if (pcConfig.iceTransports === 'relay') {
			if (event.candidate.candidate.search('relay') === -1) {
				return;
			}
		}
		sendMessage({
			type : 'candidate',
			label : event.candidate.sdpMLineIndex,
			id : event.candidate.sdpMid,
			candidate : event.candidate.candidate
		});
		noteIceCandidate('Local', iceCandidateType(event.candidate.candidate));
	} else {
		trace('End of candidates.');
	}
}

function onRemoteStreamAdded(event) {
	trace('Remote stream added.');
	attachMediaStream(remoteVideo, event.stream);
	remoteStream = event.stream;
}

function refreshStats() {
	if (pc) {
		pc.getStats(function(response) {
			stats = response.result();
			updateInfoDiv();
		});
	}
}

function extractStatAsInt(stats, statObj, statName) {
	var str = extractStat(stats, statObj, statName);
	if (str) {
		var val = parseInt(str);
		if (val !== -1) {
			return val;
		}
	}
	return null;
}

function extractStat(stats, statObj, statName) {
	var report = getStatsReport(stats, statObj, statName);
	if (report && report.names().indexOf(statName) !== -1) {
		return report.stat(statName);
	}
	return null;
}

function getStatsReport(stats, statObj, statName, statVal) {
	if (stats) {
		for (var i = 0; i < stats.length; ++i) {
			var report = stats[i];
			if (report.type === statObj) {
				var found = true;
				if (statName) {
					var val = report.stat(statName);
					found = statVal !== undefined ? val === statVal : val;
				}
				if (found) {
					return report;
				}
			}
		}
	}
}

function computeE2EDelay(captureStart, remoteVideoCurrentTime) {
	if (captureStart) {
		var nowNTP = Date.now() + 2208988800000;
		var e2eDelay = nowNTP - captureStart - remoteVideoCurrentTime * 1000;
		return e2eDelay.toFixed(0);
	}
	return null;
}

function onRemoteStreamRemoved() {
	trace('Remote stream removed.');
}

function onSignalingStateChanged() {
	if (pc) {
		trace('Signaling state changed to: ' + pc.signalingState);
	}
	updateInfoDiv();
}

function onIceConnectionStateChanged() {
	if (pc) {
		trace('ICE connection state changed to: ' + pc.iceConnectionState);
	}
	updateInfoDiv();
}

function onHangup() {
	trace('Hanging up.');
	transitionToDone();
	localStream.stop();
	stop();
	socket.close();
}

function onRemoteHangup() {
	trace('Session terminated.');
	initiator = 0;
	transitionToWaiting();
	stop();
}

function stop() {
	started = false;
	signalingReady = false;
	isAudioMuted = false;
	isVideoMuted = false;
	pc.close();
	pc = null;
	remoteStream = null;
	msgQueue.length = 0;
}

function waitForRemoteVideo() {
	if (remoteVideo.currentTime > 0) {
		transitionToActive();
	} else {
		setTimeout(waitForRemoteVideo, 10);
	}
}

function transitionToActive() {
	endTime = window.performance.now();
	trace('Call setup time: ' + (endTime - startTime).toFixed(0) + 'ms.');
	updateInfoDiv();
	if (stereoscopic) {
		setupStereoscopic(remoteVideo, document.getElementById('remoteCanvas'));
	} else {
		reattachMediaStream(miniVideo, localVideo);
	}
	miniVideo.style.opacity = 1;
	remoteVideo.style.opacity = 1;
	card.style.webkitTransform = 'rotateY(180deg)';
	setTimeout(function() {
		localVideo.src = '';
	}, 800);
	window.onresize();
	setStatus('<input type=\'button\' id=\'hangup\' value=\'Hang up\' ' + 'onclick=\'onHangup()\' />');
}

function transitionToWaiting() {
	startTime = endTime = null;
	reattachMediaStream(localVideo, miniVideo);
	miniVideo.style.opacity = 0;
	remoteVideo.style.opacity = 0;
	card.style.webkitTransform = 'rotateY(0deg)';
	setTimeout(function() {
		miniVideo.src = '';
		remoteVideo.src = '';
	}, 800);
	resetStatus();
}

function transitionToDone() {
	localVideo.style.opacity = 0;
	remoteVideo.style.opacity = 0;
	miniVideo.style.opacity = 0;
	setStatus('You have left the call. <a href=' + roomLink + '>Click here</a> to rejoin.');
}

function enterFullScreen() {
	var element = event.target.id === 'remoteCanvas' ? event.target : containerDiv;
	element.webkitRequestFullScreen();
}

function noteIceCandidate(location, type) {
	var types = gatheredIceCandidateTypes[location];
	if (!types[type]) {
		types[type] = 1;
	} else {++
		types[type];
	}
	updateInfoDiv();
}

function getInfoDiv() {
	return document.getElementById('infoDiv');
}

function buildLine(label, value) {
	var columnWidth = 12;
	var line = '';
	if (label) {
		line += label + ':';
		while (line.length < columnWidth) {
			line += ' ';
		}
		if (value) {
			line += value;
		}
	}
	line += '\n';
	return line;
}

function updateInfoDiv() {
	var contents = '<pre>';
	if (pc) {
		var rtt = extractStatAsInt(stats, 'ssrc', 'googRtt');
		var captureStart = extractStatAsInt(stats, 'ssrc', 'googCaptureStartNtpTimeMs');
		var e2eDelay = computeE2EDelay(captureStart, remoteVideo.currentTime);
		var activeCandPair = getStatsReport(stats, 'googCandidatePair', 'googActiveConnection', 'true');
		var localAddr, remoteAddr;
		if (activeCandPair) {
			localAddr = activeCandPair.stat('googLocalAddress');
			remoteAddr = activeCandPair.stat('googRemoteAddress');
		}
		contents += buildLine('States');
		contents += buildLine('Signaling', pc.signalingState);
		contents += buildLine('Gathering', pc.iceGatheringState);
		contents += buildLine('Connection', pc.iceConnectionState);
		for (var endpoint in gatheredIceCandidateTypes) {
			var types = [];
			for (var type in gatheredIceCandidateTypes[endpoint]) {
				types.push(type + ':' + gatheredIceCandidateTypes[endpoint][type]);
			}
			types.sort();
			contents += buildLine(endpoint, types.join(' '));
		}
		if (localAddr && remoteAddr) {
			contents += buildLine('LocalAddr', localAddr);
			contents += buildLine('RemoteAddr', remoteAddr);
		}
		contents += buildLine();
		contents += buildLine('Stats');
		if (endTime !== null) {
			contents += buildLine('Setup time', (endTime - startTime).toFixed(0).toString() + 'ms');
		}
		if (rtt !== null) {
			contents += buildLine('RTT', rtt.toString() + 'ms');
		}
		if (e2eDelay !== null) {
			contents += buildLine('End to end', e2eDelay.toString() + 'ms');
		}
	}
	contents += '</pre>';
	var div = getInfoDiv();
	div.innerHTML = contents;
	for (var msg in infoDivErrors) {
		div.innerHTML += '<p style="background-color: red; color: yellow;">' + infoDivErrors[msg] + '</p>';
	}
}

function isInfoDivVisible() {
	return getInfoDiv().style.display === 'block';
}

function showInfoDiv() {
	if (getStatsTimer) {
		throw 'Inconsistent infodiv state';
	}
	var div = getInfoDiv();
	div.style.display = 'block';
	refreshStats();
	getStatsTimer = setInterval(refreshStats, 1000);
}

function hideInfoDiv() {
	var div = getInfoDiv();
	div.style.display = 'none';
	clearInterval(getStatsTimer);
}

function toggleInfoDiv() {
	if (isInfoDivVisible()) {
		hideInfoDiv();
	} else {
		showInfoDiv();
	}
}

function toggleVideoMute() {
	var videoTracks = localStream.getVideoTracks();
	if (videoTracks.length === 0) {
		trace('No local video available.');
		return;
	}
	trace('Toggling video mute state.');
	var i;
	if (isVideoMuted) {
		for ( i = 0; i < videoTracks.length; i++) {
			videoTracks[i].enabled = true;
		}
		trace('Video unmuted.');
	} else {
		for ( i = 0; i < videoTracks.length; i++) {
			videoTracks[i].enabled = false;
		}
		trace('Video muted.');
	}
	isVideoMuted = !isVideoMuted;
}

function toggleAudioMute() {
	var audioTracks = localStream.getAudioTracks();
	if (audioTracks.length === 0) {
		trace('No local audio available.');
		return;
	}
	trace('Toggling audio mute state.');
	var i;
	if (isAudioMuted) {
		for ( i = 0; i < audioTracks.length; i++) {
			audioTracks[i].enabled = true;
		}
		trace('Audio unmuted.');
	} else {
		for ( i = 0; i < audioTracks.length; i++) {
			audioTracks[i].enabled = false;
		}
		trace('Audio muted.');
	}
	isAudioMuted = !isAudioMuted;
}
document.onkeydown = function(event) {
	var hotkey = event.ctrlKey;
	if (navigator.appVersion.indexOf('Mac') !== -1) {
		hotkey = event.metaKey;
	}
	if (!hotkey) {
		return;
	}
	switch(event.keyCode) {
		case 68:
			toggleAudioMute();
			return false;
		case 69:
			toggleVideoMute();
			return false;
		case 73:
			toggleInfoDiv();
			return false;
		default:
			return;
	}
};
function maybeSetAudioSendBitRate(sdp) {
	if (!audioSendBitrate) {
		return sdp;
	}
	trace('Prefer audio send bitrate: ' + audioSendBitrate);
	return preferBitRate(sdp, audioSendBitrate, 'audio');
}

function maybeSetAudioReceiveBitRate(sdp) {
	if (!audioRecvBitrate) {
		return sdp;
	}
	trace('Prefer audio receive bitrate: ' + audioRecvBitrate);
	return preferBitRate(sdp, audioRecvBitrate, 'audio');
}

function maybeSetVideoSendBitRate(sdp) {
	if (!videoSendBitrate) {
		return sdp;
	}
	trace('Prefer video send bitrate: ' + videoSendBitrate);
	return preferBitRate(sdp, videoSendBitrate, 'video');
}

function maybeSetVideoReceiveBitRate(sdp) {
	if (!videoRecvBitrate) {
		return sdp;
	}
	trace('Prefer video receive bitrate: ' + videoRecvBitrate);
	return preferBitRate(sdp, videoRecvBitrate, 'video');
}

function preferBitRate(sdp, bitrate, mediaType) {
	var sdpLines = sdp.split('\r\n');
	var mLineIndex = findLine(sdpLines, 'm=', mediaType);
	if (mLineIndex === null) {
		messageError('Failed to add bandwidth line to sdp, as no m-line found');
		return sdp;
	}
	var nextMLineIndex = findLineInRange(sdpLines, mLineIndex + 1, -1, 'm=');
	if (nextMLineIndex === null) {
		nextMLineIndex = sdpLines.length;
	}
	var cLineIndex = findLineInRange(sdpLines, mLineIndex + 1, nextMLineIndex, 'c=');
	if (cLineIndex === null) {
		messageError('Failed to add bandwidth line to sdp, as no c-line found');
		return sdp;
	}
	var bLineIndex = findLineInRange(sdpLines, cLineIndex + 1, nextMLineIndex, 'b=AS');
	if (bLineIndex) {
		sdpLines.splice(bLineIndex, 1);
	}
	var bwLine = 'b=AS:' + bitrate;
	sdpLines.splice(cLineIndex + 1, 0, bwLine);
	sdp = sdpLines.join('\r\n');
	return sdp;
}

function maybeSetVideoSendInitialBitRate(sdp) {
	if (!videoSendInitialBitrate) {
		return sdp;
	}
	var maxBitrate = videoSendInitialBitrate;
	if (videoSendBitrate) {
		if (videoSendInitialBitrate > videoSendBitrate) {
			messageError('Clamping initial bitrate to max bitrate of ' + videoSendBitrate + ' kbps.');
			videoSendInitialBitrate = videoSendBitrate;
		}
		maxBitrate = videoSendBitrate;
	}
	var sdpLines = sdp.split('\r\n');
	var mLineIndex = findLine(sdpLines, 'm=', 'video');
	if (mLineIndex === null) {
		messageError('Failed to find video m-line');
		return sdp;
	}
	var vp8RtpmapIndex = findLine(sdpLines, 'a=rtpmap', 'VP8/90000');
	var vp8Payload = getCodecPayloadType(sdpLines[vp8RtpmapIndex]);
	var vp8Fmtp = 'a=fmtp:' + vp8Payload + ' x-google-min-bitrate=' + videoSendInitialBitrate.toString() + '; x-google-max-bitrate=' + maxBitrate.toString();
	sdpLines.splice(vp8RtpmapIndex + 1, 0, vp8Fmtp);
	return sdpLines.join('\r\n');
}

function maybePreferAudioSendCodec(sdp) {
	if (audioSendCodec === '') {
		trace('No preference on audio send codec.');
		return sdp;
	}
	trace('Prefer audio send codec: ' + audioSendCodec);
	return preferAudioCodec(sdp, audioSendCodec);
}

function maybePreferAudioReceiveCodec(sdp) {
	if (audioRecvCodec === '') {
		trace('No preference on audio receive codec.');
		return sdp;
	}
	trace('Prefer audio receive codec: ' + audioRecvCodec);
	return preferAudioCodec(sdp, audioRecvCodec);
}

function preferAudioCodec(sdp, codec) {
	var sdpLines = sdp.split('\r\n');
	var mLineIndex = findLine(sdpLines, 'm=', 'audio');
	if (mLineIndex === null) {
		return sdp;
	}
	var codecIndex = findLine(sdpLines, 'a=rtpmap', codec);
	if (codecIndex) {
		var payload = getCodecPayloadType(sdpLines[codecIndex]);
		if (payload) {
			sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
		}
	}
	sdp = sdpLines.join('\r\n');
	return sdp;
}

function addStereo(sdp) {
	var sdpLines = sdp.split('\r\n');
	var opusIndex = findLine(sdpLines, 'a=rtpmap', 'opus/48000');
	var opusPayload;
	if (opusIndex) {
		opusPayload = getCodecPayloadType(sdpLines[opusIndex]);
	}
	var fmtpLineIndex = findLine(sdpLines, 'a=fmtp:' + opusPayload.toString());
	if (fmtpLineIndex === null) {
		return sdp;
	}
	sdpLines[fmtpLineIndex] = sdpLines[fmtpLineIndex].concat('; stereo=1');
	sdp = sdpLines.join('\r\n');
	return sdp;
}

function findLine(sdpLines, prefix, substr) {
	return findLineInRange(sdpLines, 0, -1, prefix, substr);
}

function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
	var realEndLine = endLine !== -1 ? endLine : sdpLines.length;
	for (var i = startLine; i < realEndLine; ++i) {
		if (sdpLines[i].indexOf(prefix) === 0) {
			if (!substr || sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
				return i;
			}
		}
	}
	return null;
}

function getCodecPayloadType(sdpLine) {
	var pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
	var result = sdpLine.match(pattern);
	return (result && result.length === 2) ? result[1] : null;
}

function setDefaultCodec(mLine, payload) {
	var elements = mLine.split(' ');
	var newLine = [];
	var index = 0;
	for (var i = 0; i < elements.length; i++) {
		if (index === 3) {
			newLine[index++] = payload;
		}
		if (elements[i] !== payload) {
			newLine[index++] = elements[i];
		}
	}
	return newLine.join(' ');
}
window.onbeforeunload = function() {
	sendMessage({
		type : 'bye'
	});
};
window.onresize = function() {
	if (document.webkitIsFullScreen) {
		containerDiv.style.cssText = 'top: 0px; left: 0px;';
		return;
	}
	var aspectRatio;
	if (remoteVideo && remoteVideo.style.opacity === '1') {
		aspectRatio = remoteVideo.videoWidth / remoteVideo.videoHeight;
	} else if (localVideo && localVideo.style.opacity === '1') {
		aspectRatio = localVideo.videoWidth / localVideo.videoHeight;
	} else {
		return;
	}
	var innerHeight = this.innerHeight;
	var innerWidth = this.innerWidth;
	var videoWidth = innerWidth < aspectRatio * window.innerHeight ? innerWidth : aspectRatio * window.innerHeight;
	var videoHeight = innerHeight < window.innerWidth / aspectRatio ? innerHeight : window.innerWidth / aspectRatio;
	containerDiv.style.width = videoWidth + 'px';
	containerDiv.style.height = videoHeight + 'px';
	containerDiv.style.left = (innerWidth - videoWidth) / 2 + 'px';
	containerDiv.style.top = (innerHeight - videoHeight) / 2 + 'px';
}; 