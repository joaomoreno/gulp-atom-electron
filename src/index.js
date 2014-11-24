'use strict';

var es = require('event-stream');
var fs = require('vinyl-fs');
var rename = require('gulp-rename');
var downloadAtomShell = require('gulp-download-atom-shell');
var json = require('gulp-json-editor');
var gulpif = require('gulp-if');
var rimraf = require('rimraf');

var platform = require('./' + (function (platform) {
	switch (platform) {
		case 'win32': return 'win';
		default: return platform;
	}
})(process.platform));

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
						.pipe(es.through(function (f) {
							if (f.relative === 'package.json') {
								var json = JSON.parse(f.contents.toString('utf8'));
								json.name = opts.productName;
								f.contents = new Buffer(JSON.stringify(json), 'utf8');
							}

							this.emit('data', f);
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
