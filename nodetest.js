#!/usr/bin/env node

/*
Polyglot NodeServer Node.JS wrapper by Einstein.42(James Milne) milne.james@gmail.com
This is the first Node.JS(or javascript) I've ever written so cut me a break.
*/

// Instantiate Global logger
var logger = require('./logger.js');
// Import polyglot interface handlers
var Polyglot = require('./polyglot_interface.js')

// Create Polyglot Interface object


new Polyglot.Connector(function (poly) {
	var nserver = new Polyglot.NodeServer(poly)
	poly.connect()
	logger.info('Ran connect')
	nserver.setup()
	logger.info('Ran setup')
	nserver.run()
	logger.info('Ran run')
})