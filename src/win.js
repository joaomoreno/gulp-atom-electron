'use strict';

var fs = require('fs');
var rimraf = require('rimraf');
var rcedit = require('rcedit');

exports.getAppPath = function(productName) {
	return 'resources/app';
};

function patchExecutable(executablePath, productName, productVersion, cb) {
	var versionString = {
		CompanyName: 'GitHub, Inc.',
		FileDescription: 'Atom',
		LegalCopyright: 'Copyright (C) 2014 GitHub, Inc. All rights reserved',
		ProductName: productName,
		ProductVersion: productVersion
	};
	
	rcedit(executablePath, { 'version-string': versionString }, cb);
}

exports.patchAtom = function(opts, cb) {
	var p = function (path) { return opts.outputPath + '/' + path; };

	rimraf(p('resources/default_app'), function (err) {
		if (err) { return cb(err); }

		patchExecutable(p('atom.exe'), opts.productName, opts.productVersion, function (err) {
			if (err) { return cb(err); }

			fs.rename(p('atom.exe'), p(opts.productName + '.exe'), cb);
		});
	});
};
