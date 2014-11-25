'use strict';

var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var plist = require('plist');
var es = require('event-stream');
var vinyl = require('vinyl-fs');
var rename = require('gulp-rename');

exports.getAppPath = function(productName) {
	return productName + '.app/Contents/Resources/app';
};

function patchInfoPlist(infoPlistPath, productName) {
	return vinyl.src(infoPlistPath)
		.pipe(es.through(function (f) {
			var infoPlist = plist.parse(f.contents.toString('utf8'));
			infoPlist['CFBundleName'] = productName;
			f.contents = new Buffer(plist.build(infoPlist), 'utf8');
			this.emit('data', f);
		}))
		.pipe(vinyl.dest(path.dirname(infoPlistPath)));
}

function patchIcon(sourceIconPath, targetIconPath) {
	return vinyl.src(sourceIconPath)
		.pipe(rename(path.basename(targetIconPath)))
		.pipe(vinyl.dest(path.dirname(targetIconPath)));
}

exports.patchAtom = function(opts, cb) {
	var p = function (path) { return opts.outputPath + '/' + path; };
	var appName = opts.productName + '.app';

	rimraf(p('Atom.app/Contents/Resources/default_app'), function (err) {
		if (err) { return cb(err); }

		fs.rename(p('Atom.app'), p(appName), function (err) {
			if (err) { return cb(err); }

			var tasks = [
				patchInfoPlist(p(appName + '/Contents/Info.plist'), opts.productName)
			];

			if (opts.darwinIcon) {
				tasks.push(patchIcon(opts.darwinIcon, p(appName + '/Contents/Resources/atom.icns')));
			}

			es.merge.apply(null, tasks).on('error', cb).on('end', function () { cb(); });
		});
	});
};
