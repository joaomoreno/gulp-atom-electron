'use strict';

var es = require('event-stream');
var fs = require('vinyl-fs');
var downloadAtomShell = require('gulp-download-atom-shell');
var rimraf = require('rimraf');
var platform = require('./platform');

function patchPackageJson(fn) {
	return es.through(function (f) {
		if (f.relative === 'package.json') {
			var json = JSON.parse(f.contents.toString('utf8'));
			fn(json);
			f.contents = new Buffer(JSON.stringify(json), 'utf8');
		}

		this.emit('data', f);
	});
}

module.exports = function(opts) {
	if (!opts.version) {
		throw new Error('Missing atom-shell option: version.');
	}
	
	if (!opts.outputPath) {
		throw new Error('Missing atom-shell option: outputPath.');
	}
	
	if (!opts.productName) {
		throw new Error('Missing atom-shell option: productName.');
	}
	
	if (!opts.productVersion) {
		throw new Error('Missing atom-shell option: productVersion.');
	}

	var pass = es.through();
	var src = pass;
	src.pause();

	var atomshell = es.readable(function (_, cb) {
		var that = this;

		rimraf(opts.outputPath, function (err) {
			if (err) { return cb(err); }

			downloadAtomShell({
				version: opts.version,
				outputDir: opts.outputPath
			}, function() {
				platform.patchAtom(opts, function (err) {
					if (err) { return cb(err); }

					src
						.pipe(patchPackageJson(function (json) {
							json.name = opts.productName;
							json.version = opts.productVersion;
						}))
						.pipe(fs.dest(opts.outputPath + '/' + platform.getAppPath(opts.productName)))
						.on('end', function () { setTimeout(function () { that.emit('end'); }, 2000); });

					src.resume();
				});
			});
		});
	});

	return es.duplex(pass, atomshell);
};
