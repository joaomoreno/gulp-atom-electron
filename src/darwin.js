'use strict';

var plist = require('plist');
var es = require('event-stream');
var vfs = require('vinyl-fs');
var rename = require('gulp-rename');

function getAppName(opts) {
	return opts.productName + '.app';
};

exports.getAppPath = function(opts) {
	return getAppName(opts) + '/Contents/Resources/app';
};

function removeDefaultApp() {
	var regexp = new RegExp('^Atom.app/Contents/Resources/default_app');
	return es.through(function (f) {
		if (!regexp.test(f.relative)) {
			this.emit('data', f);
		}
	});
}

function renameApp(opts) {
	var appName = getAppName(opts);

	return rename(function (path) {
		// The app folder itself looks like a file
		if (path.dirname === '.' && path.basename === 'Atom' && path.extname === '.app') {
			path.basename = opts.productName;
		} else {
			path.dirname = path.dirname.replace(/^Atom.app/, appName);
		}
	});
}

function patchIcon(opts) {
	if (!opts.darwinIcon) {
		return es.through();
	}

	var iconPath = getAppName(opts) + '/Contents/Resources/atom.icns';
	var pass = es.through();

	// filter out original icon
	var src = pass.pipe(es.through(function (f) {
		if (f.relative !== iconPath) {
			this.emit('data', f);
		}
	}));

	// add custom icon
	var icon = vfs.src(opts.darwinIcon).pipe(rename(iconPath));

	return es.duplex(pass, es.merge(src, icon));
}

function patchInfoPlist(opts) {
	var infoPlistPath = getAppName(opts) + '/Contents/Info.plist';

	return es.through(function (f) {
		if (f.relative === infoPlistPath) {
			var infoPlist = plist.parse(f.contents.toString('utf8'));

			infoPlist['CFBundleName'] = opts.productName;
			infoPlist['CFBundleVersion'] = opts.productVersion;

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
		}

		this.emit('data', f);
	});
}

exports.patch = function(opts) {
	var pass = es.through();

	var src = pass
		.pipe(removeDefaultApp())
		.pipe(renameApp(opts))
		.pipe(patchIcon(opts))
		.pipe(patchInfoPlist(opts));

	return es.duplex(pass, src);
}
