'use strict';

var path = require('path');
var es = require('event-stream');
var rename = require('gulp-rename');
var util = require('./util');

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
		if (path.dirname === '.' && path.basename === 'electron' && path.extname === '') {
			path.basename = opts.productName;
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
