'use strict';

var util = require('util');
var es = require('event-stream');
var fs = require('vinyl-fs');
var zfs = require('gulp-vinyl-zip');
var rename = require('gulp-rename');
var download = require('./download');

function moveApp(platform, opts) {
	var appPath = platform.getAppPath(opts);
	
	return rename(function (path) {
		path.dirname = appPath + (path.dirname === '.' ? '' : '/' + path.dirname);
	});
}

function downloadAtomshell(opts) {
	var stream = es.through();

	download({
		version: opts.version,
		platform: opts.platform,
		arch: opts.arch
	}, function(err, vanilla) {
		if (err) { return stream.emit('error', err); }
		zfs.src(vanilla).pipe(stream);
	});

	return stream;
}

function _atomshell(opts) {
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

		var atomshell = downloadAtomshell(opts)
			.pipe(platform.patch(opts));

		es.merge(sources, atomshell).pipe(result);

		buffer = null;
	}));

	return es.duplex(pass, es.merge(src, result));
}

function atomshell(opts) {
	if (!opts.version) {
		throw new Error('Missing atom-shell option: version.');
	}

	if (!opts.platform) {
		throw new Error('Missing atom-shell option: platform.');
	}

	if (opts.productName) {
		console.warn('productName is deprecated. The application\'s name will be picked up automatically from package.json.');
	}

	if (opts.productVersion) {
		console.warn('productVersion is deprecated. The application\'s version will be picked up automatically from package.json.');
	}

	return _atomshell(opts);
}

atomshell.zfsdest = zfs.dest;
atomshell.download = downloadAtomshell;
module.exports = atomshell;
