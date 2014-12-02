'use strict';

var fs = require('fs');
var rimraf = require('rimraf');

function setExecutableBit(path, cb) {
	fs.stat(path, function (err, stats) {
		if (err) { return cb(err); }
		fs.chmod(path, stats.mode | 100, cb);
	});
}

exports.getAppPath = function(productName) {
	return 'resources/app';
};

exports.patchAtom = function(opts, cb) {
	var p = function (path) { return opts.outputPath + '/' + path; };

	rimraf(p('resources/default_app'), function (err) {
		if (err) { return cb(err); }

		fs.rename(p('atom'), p(opts.productName), function (err) {
			if (err) { return cb(err); }

			setExecutableBit(p(opts.productName), cb);
		});
	});
};
