'use strict';

var es = require('event-stream');
var fs = require('vinyl-fs');
try {
	var zfs = require('gulp-vinyl-zip');
} catch (e) {
	var zfs = require('gulp-vinyl-yazl');
}
var rename = require('gulp-rename');
var download = require('./download');

function patchPackageJson(opts) {
	return es.through(function (f) {
		var that = this;

		if (f.relative !== 'package.json') {
			this.emit('data', f);
			return;
		}

		var json = JSON.parse(f.contents.toString('utf8'));
		json.name = opts.productName;

		function onVersion(version) {
			json.version = opts.productVersion;
			f.contents = new Buffer(JSON.stringify(json), 'utf8');
			that.emit('data', f);
		}

		if (typeof opts.productVersion === 'function') {
			opts.productVersion(function (err, version) {
				if (err) { return that.emit('err'); }
				onVersion(version);
			});
		} else {
			onVersion(opts.productVersion);
		}
	});
}

function moveApp(platform, opts) {
	var appPath = platform.getAppPath(opts);

	return rename(function (path) {
		path.dirname = appPath + (path.dirname === '.' ? '' : '/' + path.dirname);
	});
}

function vanillaAtomshell(opts) {
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

function atomshell(opts) {
	console.log("options:", opts);
	if (!opts.version) {
		throw new Error('Missing atom-shell option: version.');
	}

	if (!opts.platform) {
		throw new Error('Missing atom-shell option: platform.');
	}

	if (!opts.productName) {
		throw new Error('Missing atom-shell option: productName.');
	}

	if (!opts.productVersion) {
		throw new Error('Missing atom-shell option: productVersion.');
	}

	var platform = require('./' + opts.platform);
	var pass = es.through();

	var src = pass
			.pipe(patchPackageJson(opts))
			.pipe(moveApp(platform, opts));

	var atomshell = vanillaAtomshell(opts)
		.pipe(platform.patch(opts));

	return es.duplex(pass, es.merge(src, atomshell));
}

atomshell.zfsdest = zfs.dest;
atomshell.download = vanillaAtomshell;
module.exports = atomshell;
