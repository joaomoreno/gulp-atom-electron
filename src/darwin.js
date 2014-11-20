'use strict';

var fs = require('fs');
var rimraf = require('rimraf');
var plist = require('plist');

exports.getAppPath = function(productName) {
	return productName + '.app/Contents/Resources/app';
};

function patchInfoPlist(infoPlistPath, productName, cb) {
	fs.readFile(infoPlistPath, 'utf8', function (err, rawInfoPlist) {
		if (err) { return cb(err); }

		var infoPlist = plist.parse(rawInfoPlist);
		infoPlist['CFBundleName'] = productName;

		fs.writeFile(infoPlistPath, plist.build(infoPlist), 'utf8', cb);
	});
}

exports.patchAtom = function(opts, cb) {
	var p = function (path) { return opts.outputPath + '/' + path; };

	rimraf(p('Atom.app/Contents/Resources/default_app'), function (err) {
		if (err) { return cb(err); }

		patchInfoPlist(p('Atom.app/Contents/Info.plist'), opts.productName, function (err) {
			if (err) { return cb(err); }

			fs.rename(p('Atom.app'), p(opts.productName + '.app'), cb);
		});
	});
};
