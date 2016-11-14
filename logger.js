/*
Instantiate the logger for all modules
*/

var logLevel = 'info';
var winston = require('winston');
var tsFormat = () => (new Date()).toLocaleString();
var winston = new (winston.Logger)({
	transports: [
		new (winston.transports.File)({
			filename: 'debug.log',
			timestamp: tsFormat,
			level: logLevel,
			maxsize: 1000*1024,
			maxFiles: 2,
			handleExceptions: true,
			humanReadableUnhandledException: true,
			exitOnError: true,
			json: false
		})
	]
});
module.exports = winston;