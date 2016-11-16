/*
Parse and respond to Polyglot Interface using STDIN and STDOUT or MQTT
*/

var logger = require('./logger.js')
var yaml = require('js-yaml')
var fs = require('fs')
var path = require('path')

function Connector(callback) {
    this.commands = ['config', 'install', 'query', 'status', 'add_all', 'added',
                'removed', 'renamed', 'enabled', 'disabled', 'cmd', 'ping',
                'exit', 'params', 'result', 'statistics', 'connected', 'disconnected']
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
	this.polyglotconnected = false
	this.mqtt_server
	this.mqtt_port
	this.usemqtt = false
	var self = this
	stdioSubsystem(this)

	function init(){
		self.listen('ping', self.ping)
		self.listen('config', self.config)
		self.listen('params', self.params)
		self.listen('connected', self.connected)
		self.listen('disconnected', self.disconnected)
	}
	
	Connector.prototype.enableMqtt = function() {
		var mqtt = require('./mqtt_interface.js')
		logger.info('Enabling MQTT Subsystem')
		return new mqtt.Subsystem(self, self.nodename, self.mqtt_server, self.mqtt_port)
	}

	Connector.prototype.uptime = function() {
		return Math.round((new Date()).getTime() / 1000) - self._started
	}

	Connector.prototype.smsg = function(str) {
		console.error(str)
	}
	
	Connector.prototype._read_nodeserver_config = function() {
		if (self.configfile === null) {
			self.smsg('**INFO: No custom "configfile" found in server.json. Trying the default of config.yaml.')
			self.configfile = 'config.yaml'
		} else {
			self.smsg('**INFO: Custom config file option found in server.json: '+self.configfile)
		}
		try {
			self.nodeserver_config = yaml.safeLoad(fs.readFileSync(path.join(self.localpath,self.configfile), 'utf8'))
			self.smsg('**INFO: Config file loaded as dictionary to Interface.nodeserver_config - '+self.configfile)
		} catch (e) { self.smsg('**ERROR: '+e) }
		setTimeout(function() { self.callback(self) }, 2000)
	}

	Connector.prototype.listen = function(event, cb) {
		if (!event in self.commands) { return false}
		if (typeof self[event] !== 'function') { return false }
		if (!self._handlers[event]) { self._handlers[event] = []}
		self._handlers[event].push(cb)
		return true
	}
	
	Connector.prototype._recv = function(cmd) {
	}
	
	Connector.prototype.parseIn = function(useMQTT, json) {
		self.usemqtt = useMQTT
		success = []
		try {
			json = JSON.parse(json)
			for (var prop in json) {
				if (json.hasOwnProperty(prop)) {
					if (prop in self._handlers) {
						self._handlers[prop].forEach(function(fun){
							//logger.info(self._handlers[prop])
							success.push((fun || self['notfound'])(json[prop], prop))
						})
						//(self[prop] || self['notfound'])(json[prop], prop)
					} else {
						logger.error('Listener not found for '+prop)
					}
				}
				else {
					logger.debug('Property not found in input: ' + json)
				}
			}				
		} catch (e) {
				console.error('Received badly formatted command (not json):'+e)
		}
		return success.every(elem => true)
	}

	Connector.prototype._mk_cmd = function(cmd, data = {}) {
		//var args = Array.prototype.slice.call(arguments)
		var message = {}
		message[cmd] = data
		var msg = JSON.stringify(message)
		if (self.usemqtt && self.mqttc.client.connected) {
			logger.debug('MQTT: ' + msg)
			self.mqttc.client.publish('udi/polyglot/'+self.nodename+'/poly', msg, { retain: false })
		} else {
			logger.debug('STDOUT: ' + msg)
			console.log(msg)
		}
	}

	Connector.prototype.connected = function(data) {
		logger.info('Polyglot MQTT Status: Connected')
		self.polyglotconnected = true
		return true
	}

	Connector.prototype.disconnected = function(data)  {
		logger.info('Polyglot MQTT Status: Disconnected')
		self.polyglotconnected = false
		return true
	}

	Connector.prototype.ping = function(data) {
		//var response = {'pong': {}}
		self._mk_cmd('pong')
		return true
	}

	Connector.prototype.params = function(data) {
		logger.info('Received Params from Polyglot: ', data)
		logger.transports.file.filename = data.sandbox + '/debug.log';
		self.nodename = data.name
		self.isyver = data.isyver
		self.sandbox = data.sandbox
		self.pgver = data.pgver
		self.pgapiver = data.pgapiver
		self.profile = data.profile
		self.configfile = data.configfile
		self.localpath = data.path
		if (data.interface === "mqtt"){
			self.mqtt_server = data.mqtt_server
			self.mqtt_port = data.mqtt_port
			if (!self.mqttc){
				self.mqttc = self.enableMqtt()
			}
		}
		return true
	}

	Connector.prototype.exit = function(data) {
		logger.info('Shutting down per Polyglot Request');
		//var response = {'exit': {}}
		self._mk_cmd('exit')
		if (self.mqttc.client.connected) {
			self.mqttc.client.publish('udi/polyglot/'+self.nodename+'/poly', JSON.stringify({'disconnected': {}}), { retain: true })
			self.mqttc.client.end();		
		}
		process.exitCode = 0;
		return true
	}

	Connector.prototype.config = function(data) {
		logger.info('Received config from Polyglot')
		self._read_nodeserver_config()
	}

	Connector.prototype.query = function(data) {
		logger.info('Did Query');
	}

	Connector.prototype.status = function(data) {
		logger.info('Did Status');
	}

	Connector.prototype.add_all = function(data) {
		logger.info('Did AddAll');
	}

	Connector.prototype.added = function(data) {
		logger.info('Did Added');
	}

	Connector.prototype.removed = function(data) {
		logger.info('Did Removed');
	}

	Connector.prototype.renamed = function(data) {
		logger.info('Did Renamed');
	}

	Connector.prototype.enabled = function(data) {
		logger.info('Did Enabled');
	}

	Connector.prototype.disabled = function(data) {
		logger.info('Did Disabled');
	}

	Connector.prototype.cmd = function(data) {
		logger.info('Did Cmd');
	}

	Connector.prototype.result = function(data) {
		logger.info('Did Result');
	}

	Connector.prototype.statistics = function(data) {
		logger.info('Did Statistics');
	}

	Connector.prototype.notfound = function(data, command) {
		logger.info("Command not found: " + command, data);
	}

	Connector.prototype.install = function(data) {
		logger.error('Install command is currently not implemented.')
	}
	
	Connector.prototype.report_status = function(node_address, driver_control, value,
												uom, timeout=null, seq=null) {
		var data = {
			node_address: node_address,
			driver_control: driver_control,
			value: value,
			uom: uom,
			timeout: timeout,
			seq: seq
		}
		self._mk_cmd('status', data)
	}
	
	Connector.prototype.report_command= function(node_address, command, value=null, 
												uom=null, timeout=null, seq=null) {
		var data = {
			node_address: node_address,
			driver_control: driver_control
		}
		if (value !== null) { data['value'] = value }
		if (uom !== null) { data['uom'] = uom }
		if (timeout !== null) { data['timeout'] = timeout }
		if (seq !== null) { data['seq'] = seq }
		self._mk_cmd('command', data)
	}
	
	Connector.prototype.add_node = function(node_address, node_def_id, primary, name, 
											timeout=null, seq=null) {
		data = {
			node_address: node_address,
			node_def_id: node_def_id,
			primary: primary,
			name: name
		}
		if (timeout !== null) { data['timeout'] = timeout }
		if (seq !== null) { data['seq'] = seq }
		self._mk_cmd('add', data)
	}
	
	Connector.prototype.change_node = function(node_address, node_def_id, timeout=null, seq=null) {
		data = {
			node_address: node_address,
			node_def_id: node_def_id
		}
		if (timeout !== null) { data['timeout'] = timeout }
		if (seq !== null) { data['seq'] = seq }
		self._mk_cmd('change', data)
	}
	
	Connector.prototype.remove_node = function(node_address, timeout=null, seq=null) {
		data = {
			node_address: node_address
		}
		if (timeout !== null) { data['timeout'] = timeout }
		if (seq !== null) { data['seq'] = seq }
		self._mk_cmd('remove', data)
	}
	
	Connector.prototype.report_request_status = function(request_id, success, timeout=null, seq=null) {
		data = {
			request_id: request_id,
			success: success
		}
		if (timeout !== null) { data['timeout'] = timeout }
		if (seq !== null) { data['seq'] = seq }
		self._mk_cmd('request', data)
	}
	
	Connector.prototype.restcall = function(api, timeout=null, seq=null) {
		data = {
			api: api
		}
		if (timeout !== null) { data['timeout'] = timeout }
		if (seq !== null) { data['seq'] = seq }
		self._mk_cmd('restcall', data)
	}
	
	Connector.prototype.request_stats = function () {
		self._mk_cmd('statistics')
		return true
	}
	
init()
}

// STDIN/STDOUT Interface
function stdioSubsystem (poly) {
	var readline = require('readline');

	var rl = readline.createInterface({
	  input: process.stdin,
	  output: process.stdout,
	  terminal: false
	});

	rl.on('line', function(line){
		poly.parseIn(false, line.toString())
	})	
}

module.exports.Connector = Connector
