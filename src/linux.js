'use strict';

var path = require('path');
var es = require('event-stream');
var rename = require('gulp-rename');
var semver = require('semver');
var util = require('./util');

function getOriginalAppName(opts) {
	return semver.gte(opts.version, '0.24.0') ? 'electron' : 'atom';
}

exports.getAppPath = function(opts) {
	return 'resources/app';
};

function removeDefaultApp() {
	var defaultAppPath = path.join('resources', 'default_app');

	return es.mapSync(function (f) {
		if (!util.startsWith(f.relative, defaultAppPath)) {
			return f;
		}
	});
}

function renameApp(opts) {
	return rename(function (path) {
		if (path.dirname === '.' && path.basename === getOriginalAppName(opts) && path.extname === '') {
			path.basename = opts.linuxExecutableName || opts.productName;
		}
	});
}

exports.patch = function(opts) {
	var pass = es.through();

	var src = pass
		.pipe(removeDefaultApp())
		.pipe(renameApp(opts));

	return es.duplex(pass, src);
};
