/*
Parse and respond to Polyglot Interface using STDIN and STDOUT
*/

var logger = require('./logger.js');

var parseIn = function(json, mqtt, name) {
	var input = {
		'params': doParams,
		'exit': doExit,
		'ping': doPing,
		'config': doConfig,
		'install': doInstall,
		'query': doQuery,
		'status': doStatus,
		'add_all': doAddAll,
		'added': doAdded,
		'removed': doRemoved,
		'renamed': doRenamed,
		'enabled': doEnabled,
		'disabled': doDisabled,
		'cmd': doCmd,
		'result': doResult,
		'statistics': doStatistics,
		'notfound': doNotFound,
	}
	var json = JSON.parse(json);
	for (var prop in json) {
		if (json.hasOwnProperty(prop)) {
				(input[prop] || input['notfound'])(json[prop], mqtt, name, prop);
		}
		else {
			logger.debug('Property not found in input: ' + json);
		}
	};
};

function doParams(params, mqtt, name) {
		logger.transports.file.filename = params.sandbox + '/debug.log';
		logger.info('Received Params from Polyglot: ', params);
}

function _mk_cmd(json, mqtt, name) {
	if (!mqtt) {
		console.log(JSON.stringify(json))
	} else {
		mqtt.publish('udi/polyglot/'+name+'/poly', JSON.stringify(json), { retain: false })
	}
}

function doExit(json, mqtt, name) {
	logger.info('Shutting down per Polyglot Request');
	mqtt.end();
	process.exit();
}

function doPing(json, mqtt, name) {
	var output = {'pong' : {}};
	_mk_cmd(output, mqtt, name)
}

function doConfig(json, mqtt, name) {
	logger.info('Did config');
}

function doInstall(json, mqtt, name) {
	logger.info('Did install');
}

function doQuery(json, mqtt, name) {
	logger.info('Did Query');
}

function doStatus(json, mqtt, name) {
	logger.info('Did Status');
}

function doAddAll(json, mqtt, name) {
	logger.info('Did AddAll');
}

function doAdded(json, mqtt, name) {
	logger.info('Did Added');
}

function doRemoved(json, mqtt, name) {
	logger.info('Did Removed');
}

function doRenamed(json, mqtt, name) {
	logger.info('Did Renamed');
}

function doEnabled(json, mqtt, name) {
	logger.info('Did Enabled');
}

function doDisabled(json, mqtt, name) {
	logger.info('Did Disabled');
}

function doCmd(json, mqtt, name) {
	logger.info('Did Cmd');
}

function doResult(json, mqtt, name) {
	logger.info('Did Result');
}

function doStatistics(json, mqtt, name) {
	logger.info('Did Statistics');
}

function doNotFound(json, mqtt, name, prop) {
	logger.info("Command not found: " + prop, json);
}

module.exports.parseIn = parseIn;