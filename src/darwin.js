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

function patchInfoPlist(infoPlistPath, infoPlistTasks) {
	return vinyl.src(infoPlistPath)
		.pipe(es.through(function (f) {
			var infoPlist = plist.parse(f.contents.toString('utf8'));
			infoPlistTasks.forEach(function (f) { f(infoPlist); });
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

			var tasks = [];
			var infoPlistTasks = [];

			infoPlistTasks.push(function (d) { d['CFBundleName'] = opts.productName; });

			if (opts.darwinIcon) {
				tasks.push(patchIcon(opts.darwinIcon, p(appName + '/Contents/Resources/atom.icns')));
			}

			if (opts.darwinBundleDocumentTypes) {
				infoPlistTasks.push(function (d) {
					d['CFBundleDocumentTypes'] = (d['CFBundleDocumentTypes'] || [])
						.concat(opts.darwinBundleDocumentTypes.map(function (type) {
							return {
								CFBundleTypeName: type.name,
								CFBundleTypeRole: type.role,
								CFBundleTypeOSTypes: type.ostypes,
								CFBundleTypeExtensions: type.extensions,
								CFBundleTypeIconFile: type.iconFile
							};
						}));
				});
			}

			tasks.push(patchInfoPlist(p(appName + '/Contents/Info.plist'), infoPlistTasks));

			es.merge.apply(null, tasks).on('error', cb).on('end', function () { cb(); });
		});
	});
};
