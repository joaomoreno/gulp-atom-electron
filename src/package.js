'use strict';

var os = require('os');
var fs = require('fs');
var path = require('path');
var File = require('vinyl');
var es = require('event-stream');
var rename = require('gulp-rename');
var rcedit = require('rcedit');
var download = require('./download');

function patchExecutable(name, version) {
	return es.map(function(file, cb) {
		if (path.basename(file.path) === 'atom.exe') {
			var tempPath = path.join(os.tmpdir(), 'atom.exe');
			
			fs.writeFile(tempPath, file.contents, function (err) {
				if (err) { return cb(err); }
				
				return rcedit(tempPath, {
					'version-string': {
						CompanyName: 'GitHub, Inc.',
						FileDescription: name,
						LegalCopyright: 'Copyright (C) 2014 GitHub, Inc. All rights reserved',
						ProductName: name,
						ProductVersion: version
					}
				}, function (err) {
					if (err) { return cb(err); }
					
					fs.readFile(tempPath, function (err, data) {
						if (err) { return cb(err); }
						
						cb(null, new File({
							cwd: file.cwd,
							base: path.dirname(tempPath),
							path: tempPath,
							contents: data
						}));
					});
				});
			});
		} else {
			cb(null, file);
		}
	});
}

module.exports = function(opts) {
	if (!opts.version) {
		throw new Error('Missing atom-shell option: version.');
	}
	
	if (!opts.productName) {
		throw new Error('Missing atom-shell option: productName.');
	}
	
	if (!opts.productVersion) {
		throw new Error('Missing atom-shell option: productVersion.');
	}

	if (opts.platform === 'win32' && !process.platform !== opts.platform) {
		throw new Error('Can\'t build win32 build on a non-win32 machine.');	
	}
	
	var downloadOpts = {
		cachePath: opts.cachePath || path.join(os.tmpdir(), 'atom-shell-cache'),
		version: opts.version,
		platform: opts.platform || process.platform,
		excludeDefaultApp: true
	};

	var atomshell = download(downloadOpts);

	if (opts.platform === 'win32') {
		atomshell = atomshell
			.pipe(patchExecutable(opts.productName, opts.productVersion))
			.pipe(rename(function (path) {
				if (path.basename === 'atom' && path.extname === '.exe') {
					path.basename = opts.productName;
				}
			}));
	}

	var appPath = (function() {
		switch (opts.platform) {
			case 'win32': return 'resources/app/';
			case 'darwin': return 'Atom.app/Contents/Resources/app/';
			return 'resources/app/';
		}
	})();
	
	var pass = es.through();
	var src = pass.pipe(rename(function (path) { path.dirname = appPath + path.dirname; }));

	return es.duplex(pass, es.merge(atomshell, src));
};
