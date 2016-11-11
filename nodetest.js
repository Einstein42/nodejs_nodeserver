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
	var options = {
		keepalive: 60,
		clean: true,
		clientId: servername,
		reconnectPeriod: 5000,
		will: {retain: true}
	}
	/* 
	Set the Last Will and Testament for the Nodeserver. Allows Polyglot to restart in case
	of catastrophic failure. This message is automatically store and sent by the broker 
	automatically if ungraceful disconnection occurs or the keepalive is exceeded. If 
	Polyglot is still connected to the broker and able to receive the Will message, it 
	will automatically restart the nodeserver. 
	*/
	options['will']['topic'] = 'udi/polyglot/'+servername+'/poly'
	options['will']['payload'] = new Buffer(JSON.stringify({'disconnected': {}}))
	var client = mqtt.connect('mqtt://'+mqtt_server+':'+mqtt_port, options)

	client.on('connect', () => {
		client.subscribe('udi/polyglot/'+servername+'/node', (err, granted) => {
			if (err) { logger.info('Error: ' + err.toString()); return }
			logger.info('MQTT Subscribe Successful: ' + granted[0]['topic'] + " QoS: " + granted[0]['qos'])
		})
		client.publish('udi/polyglot/'+servername+'/poly', JSON.stringify({'connected': {}}), { retain: true })
	})
	client.on('message', (topic, message) => {
		logger.info('MQTT Message: ' + topic + ": " + message.toString())
		polyInt.parseIn(message.toString(), client, servername)
	})
	client.on('reconnect', () => {
		logger.info('MQTT attempting reconnection to broker...')
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


