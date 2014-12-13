'use strict';

var es = require('event-stream');
var rename = require('gulp-rename');

exports.getAppPath = function(opts) {
	return 'resources/app';
};

function removeDefaultApp() {
	var regexp = /^resources\/default_app/;
	return es.through(function (f) {
		if (!regexp.test(f.relative)) {
			this.emit('data', f);
		}
	});
}

function renameApp(opts) {
	return rename(function (path) {
		if (path.dirname === '.' && path.basename === 'atom' && path.extname === '') {
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
