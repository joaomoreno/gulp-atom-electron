'use strict';

var path = require('path');
var plist = require('plist');
var es = require('event-stream');
var vfs = require('vinyl-fs');
var rename = require('gulp-rename');
var semver = require('semver');
var util = require('./util');

function getOriginalAppName(opts) {
	return semver.gte(opts.version, '0.24.0') ? 'Electron' : 'Atom';
}

function getOriginalAppFullName(opts) {
	return getOriginalAppName(opts) + '.app';
}

function getAppName(opts) {
	return (opts.productAppName || opts.productName) + '.app';
}

exports.getAppPath = function(opts) {
	return getAppName(opts) + '/Contents/Resources/app';
};

function removeDefaultApp(opts) {
	var defaultAppPath = path.join(getOriginalAppFullName(opts), 'Contents', 'Resources', 'default_app');

	return es.mapSync(function (f) {
		if (!util.startsWith(f.relative, defaultAppPath)) {
			return f;
		}
	});
}

function patchIcon(opts) {
	if (!opts.darwinIcon) {
		return es.through();
	}

	var resourcesPath = path.join(getOriginalAppFullName(opts), 'Contents', 'Resources');
	var originalIconPath = path.join(resourcesPath, 'atom.icns');
	var iconPath = path.join(resourcesPath, opts.productName + '.icns');
	var pass = es.through();

	// filter out original icon
	var src = pass.pipe(es.mapSync(function (f) {
		if (f.relative !== originalIconPath) {
			return f;
		}
	}));

	// add custom icon
	var icon = vfs.src(opts.darwinIcon).pipe(rename(iconPath));

	return es.duplex(pass, es.merge(src, icon));
}

function patchInfoPlist(opts) {
	var infoPlistPath = path.join(getOriginalAppFullName(opts), 'Contents', 'Info.plist');

	return es.map(function (f, cb) {
		if (f.relative !== infoPlistPath) {
			return cb(null, f);
		}

		var contents = '';
		f.contents.on('data', function (d) { contents += d; });

		f.contents.on('end', function () {
			var infoPlist = plist.parse(contents.toString('utf8'));

			opts.darwinBundleIdentifier && (infoPlist['CFBundleIdentifier'] = opts.darwinBundleIdentifier);
			opts.darwinApplicationCategoryType && (infoPlist['LSApplicationCategoryType'] = opts.darwinApplicationCategoryType);
			infoPlist['CFBundleName'] = opts.productName;
			infoPlist['CFBundleDisplayName'] = opts.productDisplayName || opts.productName;
			infoPlist['CFBundleVersion'] = opts.productVersion;
			infoPlist['CFBundleShortVersionString'] = opts.productVersion;
			opts.copyright && (infoPlist['NSHumanReadableCopyright'] = opts.copyright);
			infoPlist['CFBundleIconFile'] = opts.productName + '.icns';

			if (opts.darwinBundleDocumentTypes) {
				infoPlist['CFBundleDocumentTypes'] = (infoPlist['CFBundleDocumentTypes'] || [])
					.concat(opts.darwinBundleDocumentTypes.map(function (type) {
						return {
							CFBundleTypeName: type.name,
							CFBundleTypeRole: type.role,
							CFBundleTypeOSTypes: type.ostypes,
							CFBundleTypeExtensions: type.extensions,
							CFBundleTypeIconFile: type.iconFile
						};
					}));
			}

			f.contents = new Buffer(plist.build(infoPlist), 'utf8');
			cb(null, f);
		});
	});
}

function renameApp(opts) {
	var originalAppName = getOriginalAppName(opts);
	var originalAppNameRegexp = new RegExp('^' + getOriginalAppFullName(opts));
	var appName = getAppName(opts);

	return rename(function (path) {
		// The app folder itself looks like a file
		if (path.dirname === '.' && path.basename === originalAppName && path.extname === '.app') {
			path.basename = opts.productAppName || opts.productName;
		} else {
			path.dirname = path.dirname.replace(originalAppNameRegexp, appName);
		}
	});
}

exports.patch = function(opts) {
	var pass = es.through();

	var src = pass
		.pipe(removeDefaultApp(opts))
		.pipe(patchIcon(opts))
		.pipe(patchInfoPlist(opts))
		.pipe(renameApp(opts));

	return es.duplex(pass, src);
};
