'use strict';

var fs = require('fs');
var rimraf = require('rimraf');

exports.getAppPath = function(productName) {
	return 'resources/app';
};

exports.patchAtom = function(opts, cb) {
	var p = function (path) { return opts.outputPath + '/' + path; };

	rimraf(p('resources/default_app'), function (err) {
		if (err) { return cb(err); }

		fs.rename(p('atom'), p(opts.productName), cb);
	});
};
