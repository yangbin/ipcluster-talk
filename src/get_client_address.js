function attach(http_server) {
	// cache and clean up listeners
	var old_listeners = http_server.listeners('connection'),
	length = old_listeners.length, self = this;

	http_server.removeAllListeners('connection');
	http_server.on('connection', function(connection) {
		connection.on('close', clean);
		connection.on('error', function() { connection.destroy(); clean() });
		connection.on('data', intercept_IP);

		function intercept_IP(buffer) {
			if (!buffer.length) return;

			var family = buffer[0], f_length = FAMILY_LENGTH[family], remoteIP;

			if (!f_length) return;

			remoteIP = Array.prototype.slice.call(buffer, 1, 1 + f_length);
			connection.studRemoteAddress = stringifyIP(remoteIP);
			connection.__defineGetter__('remoteAddress', returnStudRemoteAddress);
			connection.encrypted = true;

			if (buffer.length > f_length + 1)
				pass_through(buffer.slice(1 + f_length));
			else
				connection.on('data', pass_through);
		}

		function pass_through(residue) {
			clean();

			for (var i = 0; i < length; i++)
				old_listeners[i].call(http_server, connection);

			connection.on('error', function self(e) {
				connection.removeListener('error', self);
				console.log(e.stack);
			});

			connection.emit('data', residue);
		}

		function clean() { connection.removeAllListeners() }
	});
}

function returnStudRemoteAddress() { return this.studRemoteAddress }
