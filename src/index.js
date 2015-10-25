'use strict';

var util = require('util');
var path = require('path');
var es = require('event-stream');
var fs = require('fs');
var rename = require('gulp-rename');
var rimraf = require('rimraf');
var symdest = require('gulp-symdest');
var download = require('./download');

function moveApp(platform, opts) {
	var appPath = platform.getAppPath(opts);
	
	return rename(function (path) {
		path.dirname = appPath + (path.dirname === '.' ? '' : '/' + path.dirname);
	});
}

function _electron(opts) {
	var pass = es.through();
	var result = es.through();

	var buffer = [];

	var src = pass.pipe(es.through(function (f) {
		if (!buffer) {
			return;
		}

		buffer.push(f);

		if (f.relative !== 'package.json') {
			return;
		}

		var json = JSON.parse(f.contents.toString('utf8'));
		opts = util._extend({}, opts);

		// We need to extract the application's name and version
		// in order to feed it to the various platforms build
		// process.
		opts.productName = json.name;
		opts.productVersion = json.version;

		var platform = require('./' + opts.platform);

		var sources = es.merge(es.readArray(buffer), pass)
			.pipe(moveApp(platform, opts));

		var electron = download(opts)
			.pipe(platform.patch(opts));

		es.merge(sources, electron).pipe(result);

		buffer = null;
	}));

	return es.duplex(pass, es.merge(src, result));
}

function electron(opts) {
	if (!opts.version) {
		throw new Error('Missing Electron option: version.');
	}

	if (!opts.platform) {
		throw new Error('Missing Electron option: platform.');
	}

	if (opts.productName) {
		console.warn('productName is deprecated. The application\'s name will be picked up automatically from package.json.');
	}

	if (opts.productVersion) {
		console.warn('productVersion is deprecated. The application\'s version will be picked up automatically from package.json.');
	}

	return _electron(opts);
}

function dest(destination, opts) {
	if (!destination) {
		throw new Error('Missing destination.');
	}
	
	opts = opts || {};
	opts.platform = opts.platform || process.platform;
	opts.arch = opts.arch || process.arch;
	
	var shouldUpdate = false;

	try {
		var version = fs.readFileSync(path.join(destination, 'version'), 'utf8');
		shouldUpdate = version !== 'v' + opts.version;
	} catch (e) {
		shouldUpdate = true;
	}
	
	if (!shouldUpdate) {
		return;
	}

	var result = es.through();

	rimraf(destination, function (err) {
		if (err) { return result.emit('error', err); }

		var stream = download(opts);

		if (opts.platform === 'win32' && opts.win32ExeBasename) {
			stream = stream.pipe(rename(function (path) {
				if (path.dirname === '.' && path.basename === 'electron' && path.extname === '.exe') {
					path.basename = opts.win32ExeBasename;
				}
			}));
		}
		
		stream
			.pipe(symdest(destination))
			.pipe(result);
	});

	return result;
}

electron.dest = dest;
module.exports = electron;
