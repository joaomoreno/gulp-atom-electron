'use strict';

var fs = require('fs');
var path = require('path');
var es = require('event-stream');
var rename = require('gulp-rename');
var temp = require('temp').track();
var rcedit = require('rcedit');
var semver = require('semver');
var util = require('./util');

function getOriginalAppName(opts) {
	return semver.gte(opts.version, '0.24.0') ? 'electron' : 'atom';
}

function getOriginalAppFullName(opts) {
	return getOriginalAppName(opts) + '.exe';
}

exports.getAppPath = function(opts) {
	return 'resources/app';
};

function patchExecutable(opts) {
	return es.map(function (f, cb) {
		if (f.relative !== getOriginalAppFullName(opts) || process.platform !== 'win32') {
			return cb(null, f);
		}

		var patch = {
			'version-string': {
				CompanyName: opts.companyName || 'GitHub, Inc.',
				FileDescription: opts.productAppName || opts.productName,
				LegalCopyright: opts.copyright || 'Copyright (C) 2014 GitHub, Inc. All rights reserved',
				ProductName: opts.productAppName || opts.productName,
				ProductVersion: opts.productVersion
			},
			'file-version': opts.productVersion,
			'product-version': opts.productVersion
		};

		if (opts.winIcon) {
			patch.icon = opts.winIcon;
		}

		var tempPath = temp.path();
		var ostream = fs.createWriteStream(tempPath);

		f.contents.pipe(ostream);
		ostream.on('finish', function () {
			rcedit(tempPath, patch, function (err) {
				if (err) { return cb(err); }

				fs.readFile(tempPath, function (err, data) {
					if (err) { return cb(err); }

					f.contents = data;

					fs.unlink(tempPath, function (err) {
						if (err) { return cb(err); }

						cb(null, f);
					})
				});
			});
		});
	});
}

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
		if (path.dirname === '.' && path.basename === getOriginalAppName(opts) && path.extname === '.exe') {
			path.basename = opts.productName;
		}
	});
}

exports.patch = function(opts) {
	var pass = es.through();

	var src = pass
		.pipe(removeDefaultApp())
		.pipe(patchExecutable(opts))
		.pipe(renameApp(opts));

	return es.duplex(pass, src);
};

