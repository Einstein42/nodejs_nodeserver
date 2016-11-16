/*
Parse and respond to Polyglot Interface using STDIN and STDOUT or MQTT
*/

var logger = require('./logger.js')
var yaml = require('js-yaml')
var fs = require('fs')
var path = require('path')

function NodeServer(poly, shortpoll = 1, longpoll = 30) {
	this.poly = poly
	this.config = {}
	this.running = false
	this.shortpoll = shortpoll
	this.longpoll = longpoll
	this._is_node_server = true
	this._seq = 1000
	this._seq_cb = {}
	var self = this
	
	
	this.poly.listen('config', self.on_config)
	this.poly.listen('install', self.on_install)
	this.poly.listen('query', self.on_query)
	this.poly.listen('status', self.on_status)
	this.poly.listen('add_all', self.on_add_all)
	this.poly.listen('added', self.on_added)
	this.poly.listen('removed', self.on_removed)
	this.poly.listen('renamed', self.on_renamed)
	this.poly.listen('enabled', self.on_enabled)
	this.poly.listen('disabled', self.on_disabled)
	this.poly.listen('cmd', self.on_cmd)
	this.poly.listen('exit', self.on_exit)
	this.poly.listen('result', self.on_result)
	this.poly.listen('statistics', self.on_statistics)
	
	NodeServer.prototype.setup = function() {
	}

	NodeServer.prototype.smsg = function (str) {
		self.poly.send_error(str)
	}

	NodeServer.prototype.on_config = function (data) {
		self.config = data
		return true
	}

	NodeServer.prototype.on_install = function (data) {
		return false
	}
	
	NodeServer.prototype.on_query = function (node_address, request_id=null) {
		return false
	}
	
	NodeServer.prototype.on_status = function(node_address, request_id=null) {
		return false
	}

	NodeServer.prototype.on_add_all = function(request_id=null) {
		return false
	}

	NodeServer.prototype.on_added = function(node_address, node_def_id, primary_node_address, name) {
		return false
	}

	NodeServer.prototype.on_removed = function(node_address) {
		return false
	}

	NodeServer.prototype.on_renamed = function(node_address, name) {
		return false
	}

	NodeServer.prototype.on_enabled = function(node_address) {
		return false
	}

	NodeServer.prototype.on_disabled = function(node_address) {
		return false
	}

	NodeServer.prototype.on_cmd = function(node_address, command, value=null, uom=null, request_id=null) {
		return false
	}

	NodeServer.prototype.on_statistics = function() {
		return true
	}

	NodeServer.prototype.on_exit = function() {
		self.running = false
		return true
	}

	NodeServer.prototype.on_result = function(seq, status_code, elapsed, text, retries) {
		if (!seq in self._seq_cb) {
			self.smsg('**ERROR: on_result: missing callback for seq='+seq)
			return false
		}
		
		data = {
			seq: seq,
			status_code: status_code,
			elapsed: elapsed,
			text: text,
			retries: retries
		}
		var result = (self._seq_cb[seq][0])(data, self._seq_cb[seq][1])
		self._seq_cb[seq] = null
		delete self._seq_cb[seq]
		return result
	}

	NodeServer.prototype.register_result_cb = function(func, data={}) {
		self._seq++
		s = self._seq
		self._seq_cb[s] = [func, data]
		return s
	}
	
	NodeServer.prototype.add_node = function(node_address, node_def_id, node_primary_addr,
									node_name, callback=null, timeout=null, data={}) {
		var seq = null
		if (callback !== null) {
			seq = self.register_result_cb(callback, data={})
		}
		self.poly.add_node(node_address, node_def_id, node_primary_addr, node_name, timeout, seq)
		return true
	}
	
	NodeServer.prototype.report_status = function(node_address, driver_control, value, uom,
										callback=null, timeout=null, data={}) {
		seq = null
		if (callback !== null) {
			seq = self.register_result_cb(callback, data)
		}
		self.poly.report_status(node_address, driver_control, value, uom, timeout, seq)
		return true
	}
	
	NodeServer.prototype.restcall = function(api, callback=null, timeout=null, data={}) {
		if (callback !== null) {
			seq = self.register_result_cb(callback, data)
		}
		self.poly.restcall(api, timeout, seq)
		return seq
	}
	
	NodeServer.prototype.tock = function() {	
	}

	NodeServer.prototype.poll = function() {
	}

	NodeServer.prototype.long_poll = function() {
	}

	NodeServer.prototype.run = function() {
		self.running = true
		var scounter = 0
		var lcounter = 0 
		var tcounter = 0
		var interval = setInterval(function () {
			if(!self.running) {
				clearInterval(interval)
				logger.info('self.running turned false exiting.')
				self.poly.exit()
			}
			scounter++
			lcounter++
			tcounter++
			if(scounter >= self.shortpoll) {
				self.poll()
				scounter = 0
			}
			if(lcounter >= self.longpoll) {
				self.long_poll()
				lcounter = 0
			}
			if(tcounter >= 7) {
				self.tock()
				tcounter = 0
			}
		},1000)
	}
}

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

	Connector.prototype.connect = function(data) {
		//Todo integrate the readline functions here
	}

	Connector.prototype.disconnect = function(data) {
		//Todo integrate the readline disconnect functions here
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
												uom, timeout=null, seq=null)  {
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
module.exports.NodeServer = NodeServer
