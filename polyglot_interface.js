/*
Parse and respond to Polyglot Interface using STDIN and STDOUT or MQTT
*/

var logger = require('./logger.js')
var yaml = require('js-yaml')
var fs = require('fs')
var path = require('path')

function Interface(callback) {
    this.commands = ['config', 'install', 'query', 'status', 'add_all', 'added',
                'removed', 'renamed', 'enabled', 'disabled', 'cmd', 'ping',
                'exit', 'params', 'result', 'statistics']
	this.callback = callback
	this.nodename
	this.localpath
	this.nodeserver_config
	this.configfile
	this.apiver
	this.pgver
	this.pgapiver
	this.isyver
	this.profile
	this.sandbox
	this._handlers = {}
	this._started = Math.round((new Date()).getTime() / 1000)
	this.mqttc
	this.mqtt_server
	this.mqtt_port
	this.Message = Message
	self = this

	Interface.prototype._init = function () {
	}

	Interface.prototype.enableMqtt = function() {
		var mqtt = require('./mqtt_interface.js')
		return new mqtt.Subsystem(self, nodename, mqtt_server, mqtt_port)
	}

	Interface.prototype.uptime = function() {
		return Math.round((new Date()).getTime() / 1000) - self._started
	}

	Interface.prototype.smsg = function(str) {
		console.error(str)
	}
	
	Interface.prototype._read_nodeserver_config = function() {
		if (configfile === 'null') {
			self.smsg('**INFO: No custom "configfile" found in server.json. Trying the default of config.yaml.')
			configfile = 'config.yaml'
		} else {
			self.smsg('**INFO: Custom config file option found in server.json: '+configfile)
		}
		try {
			nodeserver_config = yaml.safeLoad(fs.readFileSync(path.join(localpath,configfile), 'utf8'))
			self.smsg('**INFO: Config file loaded as dictionary to Interface.nodeserver_config - '+configfile)
		} catch (e) { self.smsg('**ERROR: '+e) }
	}

	Interface.prototype.listen = function(event, callback) {
		if (!event in self.commands) { return false}
		if (typeof callback === 'function') { return false }
		if (!self._handlers[event]) { self._handlers[event] = []}
		self._handlers[event].push(callback)
		return true
	}
	
	Interface.prototype._recv = function(cmd) {
	}
	
// Message Constructor to parse inbound and format outbound communications to Polyglot	
	function Message(usemqtt) {
		this.usemqtt = usemqtt
		messageConstructor = this
	}

	Message.prototype.parseIn = function(json) {
		try {
			json = JSON.parse(json)
			for (var prop in json) {
				if (json.hasOwnProperty(prop)) {
					(this[prop] || this['notfound'])(json[prop], prop)
				}
				else {
					logger.debug('Property not found in input: ' + json)
				}
			}				
		} catch (e) {
				console.error('Received badly formatted command (not json):'+e)
		}
	}

	Message.prototype._mk_cmd = function(msg) {
		msg = JSON.stringify(msg)
		if (!this.usemqtt) {
			logger.debug('STDOUT: ' + msg)
			console.log(msg)
		} else {
			logger.debug('MQTT: ' + msg)
			mqttc.client.publish('udi/polyglot/'+nodename+'/poly', msg, { retain: false })
		}
	}

	Message.prototype.connected = function(data, prop) {
		logger.info('Got connected')
	}

	Message.prototype.disconnected = function(data, prop)  {
		logger.info('Got disconnected')
	}

	Message.prototype.ping = function(data, prop) {
		var response = {'pong': {}}
		messageConstructor._mk_cmd(response)
	}

	Message.prototype.params = function(data, prop) {
			logger.transports.file.filename = data.sandbox + '/debug.log';
			if (data.interface === "mqtt"){
				nodename = data.name
				isyver = data.isyver
				sandbox = data.sandbox
				pgver = data.pgver
				pgapiver = data.pgapiver
				profile = data.profile
				configfile = data.configfile
				localpath = data.path
				mqtt_server = data.mqtt_server
				mqtt_port = data.mqtt_port
				mqttc = self.enableMqtt()
			}
			logger.info('Received Params from Polyglot: ', data)
	}

	Message.prototype.exit = function(data, prop) {
		logger.info('Shutting down per Polyglot Request');
		var response = {'exit': {}}
		messageConstructor._mk_cmd(response)
		if (mqttc.client.connected) {
			mqttc.client.publish('udi/polyglot/'+nodename+'/poly', JSON.stringify({'disconnected': {}}), { retain: true })
			mqttc.client.end();		
		}
		process.exitCode = 0;
	}

	Message.prototype.config = function(data) {
		logger.info('Received config from Polyglot')
		self._read_nodeserver_config()
	}

	Message.prototype.install = function(data) {
		logger.info('Did install');
	}

	Message.prototype.query = function(data) {
		logger.info('Did Query');
	}

	Message.prototype.status = function(data) {
		logger.info('Did Status');
	}

	Message.prototype.add_all = function(data) {
		logger.info('Did AddAll');
	}

	Message.prototype.added = function(data) {
		logger.info('Did Added');
	}

	Message.prototype.removed = function(data) {
		logger.info('Did Removed');
	}

	Message.prototype.renamed = function(data) {
		logger.info('Did Renamed');
	}

	Message.prototype.enabled = function(data) {
		logger.info('Did Enabled');
	}

	Message.prototype.disabled = function(data) {
		logger.info('Did Disabled');
	}

	Message.prototype.cmd = function(data) {
		logger.info('Did Cmd');
	}

	Message.prototype.result = function(data) {
		logger.info('Did Result');
	}

	Message.prototype.statistics = function(data) {
		logger.info('Did Statistics');
	}

	Message.prototype.notfound = function(data, command) {
		logger.info("Command not found: " + command, data);
	}
}

module.exports.Interface = Interface
