/*
Handle MQTT Subsystem
*/

var logger = require('./logger.js');

// MQTT SubSystem Interface
// , nodename, mqtt_server, mqtt_port
function mqttSubsystem(parent, nodename, mqtt_server, mqtt_port) {
	var mqtt = require('mqtt')
	var options = {
		keepalive: 60,
		clean: true,
		clientId: nodename,
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
	options['will']['topic'] = 'udi/polyglot/'+nodename+'/poly'
	options['will']['payload'] = new Buffer(JSON.stringify({'disconnected': {}}))
	this.client = mqtt.connect('mqtt://'+mqtt_server+':'+mqtt_port, options)
	this.client.on('connect', () => {
		this.client.subscribe('udi/polyglot/'+nodename+'/node', (err, granted) => {
			if (err) { logger.info('Error: ' + err.toString()); return }
			logger.info('MQTT Subscribe Successful: ' + granted[0]['topic'] + " QoS: " + granted[0]['qos'])
		})
		this.client.publish('udi/polyglot/'+nodename+'/poly', JSON.stringify({'connected': {}}), { retain: true })
	})
	this.client.on('message', (topic, message) => {
		logger.info('MQTT Message: ' + topic + ": " + message.toString())
		parent.parseIn(true, message.toString())
	})
	this.client.on('reconnect', () => {
		logger.info('MQTT attempting reconnection to broker...')
	})
} 

module.exports.Subsystem = mqttSubsystem