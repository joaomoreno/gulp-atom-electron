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

/**
 * For Electron versions that support the setuid sandbox on Linux, changes the permissions of
 * the `chrome-sandbox` executable as appropriate.
 *
 * The sandbox helper executable must have the setuid (`+s` / `0o4000`) bit set.
 *
 * See: https://github.com/electron/electron/pull/17269#issuecomment-470671914
 */
function updateSandboxHelperPermissions() {
	return es.mapSync(function (f) {
		if (!f.isNull() && !f.isDirectory() && f.path === "chrome-sandbox") {
			f.stat.mode = 0o4755;
		}
		return f;
	});
}

exports.patch = function(opts) {
	var pass = es.through();

	var src = pass
		.pipe(updateSandboxHelperPermissions())
		.pipe(opts.keepDefaultApp ? es.through() : removeDefaultApp())
		.pipe(renameApp(opts));

	return es.duplex(pass, src);
};
