/*
Parse and respond to Polyglot Interface using STDIN and STDOUT or MQTT
*/

var logger = require('./logger.js');

var poly = function() {}
poly.prototype.parseIn = function(json, mqtt, name) {
	this.json = JSON.parse(json)
	this.mqtt = mqtt
	this.name = name
	for (var prop in this.json) {
		if (this.json.hasOwnProperty(prop)) {
			(this[prop] || this['notfound'])(this, this.json[prop], prop)
		}
		else {
			logger.debug('Property not found in input: ' + json)
		}
	}
}

poly.prototype.connected = function(self, data, prop) {
	logger.info('Got connected')
}

poly.prototype.disconnected = function(self, data, prop)  {
	logger.info('Got disconnected')
}

poly.prototype.params = function(self, data, prop) {
		logger.transports.file.filename = data.sandbox + '/debug.log';
		logger.info('Received Params from Polyglot: ', data)
}

poly.prototype._mk_cmd = function(msg) {
	if (!this.mqtt) {
		console.log(JSON.stringify(msg))
	} else {
		this.mqtt.publish('udi/polyglot/'+this.name+'/poly', JSON.stringify(msg), { retain: false })
	}
}

poly.prototype.exit = function(self, data, prop) {
	logger.info('Shutting down per Polyglot Request');
	if (!self.mqtt) {
		self.mqtt.end();		
	}
	process.exit();
}

poly.prototype.config = function(self, data) {
	logger.info('Did config');
}

poly.prototype.install = function(self, data) {
	logger.info('Did install');
}

poly.prototype.query = function(self, data) {
	logger.info('Did Query');
}

poly.prototype.status = function(self, data) {
	logger.info('Did Status');
}

poly.prototype.add_all = function(self, data) {
	logger.info('Did AddAll');
}

poly.prototype.added = function(self, data) {
	logger.info('Did Added');
}

poly.prototype.removed = function(self, data) {
	logger.info('Did Removed');
}

poly.prototype.renamed = function(self, data) {
	logger.info('Did Renamed');
}

poly.prototype.enabled = function(self, data) {
	logger.info('Did Enabled');
}

poly.prototype.disabled = function(self, data) {
	logger.info('Did Disabled');
}

poly.prototype.cmd = function(self, data) {
	logger.info('Did Cmd');
}

poly.prototype.result = function(self, data) {
	logger.info('Did Result');
}

poly.prototype.statistics = function(self, data) {
	logger.info('Did Statistics');
}

poly.prototype.notfound = function(self, data, command) {
	logger.info("Command not found: " + command, data);
}

poly.prototype.ping = function(self, data, prop) {
	var response = {'pong': {}}
	self._mk_cmd(response)
}

module.exports.poly = poly
