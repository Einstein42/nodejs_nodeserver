#!/usr/bin/env node

/*
Polyglot NodeServer Node.JS wrapper by Einstein.42(James Milne) milne.james@gmail.com
This is the first Node.JS(or javascript) I've ever written so cut me a break.
*/

// Set this to the nodeserver name you specified when you created the nodeserver in polyglot
var servername = 'test4'

// Use MQTT?
var MQTT = true

// If using MQTT set this to the server
var mqtt_server = 'pi3'

// If using MQTT set this to the port
var mqtt_port = '1883'

// Instantiate Global logger
var logger = require('./logger.js');
// Import polyglot interface handlers
var polyInt = require('./polyglot_interface.js')

if (MQTT) {
	var mqtt = require('mqtt')

	var client = mqtt.connect('mqtt://'+mqtt_server+':'+mqtt_port, {
		keepalive: 10,
		clean: true,
		clientId: servername
	})

	client.on('connect', () => {
		client.subscribe('udi/polyglot/'+servername+'/node', (err, granted) => {
			if (err) { logger.info('Error: ' + err.toString()); return }
			logger.info('MQTT Subscribe Successful: ' + granted[0]['topic'] + " QoS: " + granted[0]['qos'])
		})
		client.publish('udi/polyglot/'+servername+'/poly', JSON.stringify({'connected': {}}))
	})
	client.on('message', (topic, message) => {
		logger.info('MQTT Message: ' + topic + ": " + message.toString())
		polyInt.parseIn(message.toString(), client, servername)
	})
} else {
	// STDIN/STDOUT Interface
	var readline = require('readline');

	var rl = readline.createInterface({
	  input: process.stdin,
	  output: process.stdout,
	  terminal: false
	});

	rl.on('line', function(line){
		polyInt.parseIn(line, MQTT, servername);
	})	
}


