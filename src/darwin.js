'use strict';

var path = require('path');
var plist = require('plist');
var es = require('event-stream');
var vfs = require('vinyl-fs');
var File = require('vinyl');
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

exports.getAppPath = function (opts) {
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
	var iconName = semver.gte(opts.version, '0.24.0') ? 'electron.icns' : 'atom.icns';
	var originalIconPath = path.join(resourcesPath, iconName);
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
	var contentsPath = path.join(getOriginalAppFullName(opts), 'Contents');
	var resourcesPath = path.join(contentsPath, 'Resources');
	var infoPlistPath = path.join(contentsPath, 'Info.plist');
	var didCloseIcons = false;

	var icons = es.through();
	var input = es.through();
	var output = input.pipe(es.through(function (f) {
		if (f.relative !== infoPlistPath) {
			return this.emit('data', f);
		}

		var that = this;
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

			if (opts.darwinExecutable) {
				infoPlist['CFBundleExecutable'] = opts.darwinExecutable;
			}

			//Register the Application Help Book if it exists
			if (opts.darwinHelpBookFolder && opts.darwinHelpBookName) {
				infoPlist['CFBundleHelpBookFolder'] = opts.darwinHelpBookFolder;
				infoPlist['CFBundleHelpBookName'] = opts.darwinHelpBookName;
			}

			if (opts.darwinBundleDocumentTypes) {
				var iconsPaths = [];

				infoPlist['CFBundleDocumentTypes'] = (infoPlist['CFBundleDocumentTypes'] || [])
					.concat(opts.darwinBundleDocumentTypes.map(function (type) {
						iconsPaths.push(type.iconFile);

						var result = {
							CFBundleTypeName: type.name,
							CFBundleTypeRole: type.role,
							CFBundleTypeOSTypes: type.ostypes,
							CFBundleTypeExtensions: type.extensions,
							CFBundleTypeIconFile: path.basename(type.iconFile)
						};

						if (type.utis) {
							result['LSItemContentTypes'] = type.utis;
						}

						return result;
					}));

				if (iconsPaths.length) {
					didCloseIcons = true;
					es.merge(iconsPaths.map(function (iconPath) {
						return vfs.src(iconPath).pipe(rename(function (path) {
							path.dirname = resourcesPath;
						}));
					})).pipe(icons);
				}
			}

			if (opts.darwinBundleURLTypes) {
				infoPlist['CFBundleURLTypes'] = opts.darwinBundleURLTypes.map(function (type) {
					return {
						CFBundleTypeRole: type.role,
						CFBundleURLName: type.name,
						CFBundleURLSchemes: type.urlSchemes
					};
				})
			}

			if (opts.darwinForceDarkModeSupport) {
				infoPlist['NSRequiresAquaSystemAppearance'] = false
			}

			f.contents = Buffer.from(plist.build(infoPlist), 'utf8');
			that.emit('data', f);
		});
	}, function () {
		if (!didCloseIcons) {
			es.readArray([]).pipe(icons);
		}

		this.emit('end');
	}));

	return es.duplex(input, es.merge(output, icons));
}

function createEntitlementsPlist(opts) {
	var input = es.through();
	if (!opts.darwinEntitlements) {
		return input;
	}

	var contentsPath = path.join(getOriginalAppFullName(opts), 'Contents');
	var entitlementsPlistPath = path.join(contentsPath, 'Entitlements.plist');

	var result = {};
	opts.darwinEntitlements.forEach(element => {
		result[element] = true;
	});

	var entitlementsFile = new File({
		path: entitlementsPlistPath,
		contents: Buffer.from(plist.build(result))
	})

	return es.duplex(input, es.merge(input, es.readArray([entitlementsFile])))
}

function patchHelperInfoPlist(opts) {
	var contentsPath = path.join(getOriginalAppFullName(opts), 'Contents');
	var infoPlistPath = path.join(contentsPath, 'Info.plist');
	var didCloseIcons = false;

	var icons = es.through();
	var input = es.through();
	var output = input.pipe(es.through(function (f) {
		if (!/Contents\/Frameworks\/Electron\ Helper( \w+)?\.app\/Contents\/Info.plist$/i.test(f.relative)) {
			return this.emit('data', f);
		}

		var that = this;
		var contents = '';
		f.contents.on('data', function (d) { contents += d; });

		f.contents.on('end', function () {
			var infoPlist = plist.parse(contents.toString('utf8'));
			var match = /\.helper\.([^.]+)$/.exec(infoPlist['CFBundleIdentifier'] || '');
			var suffix = match ? match[1] : '';

			if (opts.darwinBundleIdentifier) {
				infoPlist['CFBundleIdentifier'] = opts.darwinBundleIdentifier + '.helper';

				if (suffix) {
					infoPlist['CFBundleIdentifier'] += '.' + suffix;
				}
			}

			infoPlist['CFBundleName'] = opts.productName + ' Helper';
			if (suffix) {
				infoPlist['CFBundleName'] += ' ' + suffix;
			}

			if (infoPlist['CFBundleDisplayName']) {
				infoPlist['CFBundleDisplayName'] = infoPlist['CFBundleName'];
			}

			if (infoPlist['CFBundleExecutable']) {
				infoPlist['CFBundleExecutable'] = infoPlist['CFBundleName'];
			}

			f.contents = Buffer.from(plist.build(infoPlist), 'utf8');
			that.emit('data', f);
		});
	}, function () {
		if (!didCloseIcons) {
			es.readArray([]).pipe(icons);
		}

		this.emit('end');
	}));

	return es.duplex(input, es.merge(output, icons));
}

function addCredits(opts) {
	if (!opts.darwinCredits) {
		return es.through();
	}

	var creditsPath = path.join(getOriginalAppFullName(opts), 'Contents', 'Resources', 'Credits.rtf');
	var input = es.through();
	var credits;

	if (typeof opts.darwinCredits === 'string') {
		credits = vfs.src(opts.darwinCredits).pipe(rename(creditsPath));
	} else if (opts.darwinCredits instanceof Buffer) {
		credits = es.readArray([new File({
			path: creditsPath,
			contents: opts.darwinCredits
		})]);
	} else {
		throw new Error('Unexpected value for darwinCredits');
	}

	return es.duplex(input, es.merge(input, credits));
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

		if (/Contents\/MacOS$/.test(path.dirname) && path.basename === 'Electron' && opts.darwinExecutable) {
			path.basename = opts.darwinExecutable;
		}
	});
}

function renameAppHelper(opts) {
	var originalAppName = getOriginalAppName(opts);
	var originalAppNameRegexp = new RegExp('^' + getOriginalAppFullName(opts));
	var appName = getAppName(opts);
	var name = opts.productName;

	return rename(function (path) {
		var basenameMatch = /^Electron Helper( \(\w+\))?$/.exec(path.basename);

		if (/Contents\/Frameworks/.test(path.dirname) && path.extname === '.app' && basenameMatch) {
			var suffix = basenameMatch[1] || '';
			path.basename = name + ' Helper' + suffix;
		} else if (/Contents\/Frameworks\/Electron\ Helper( \(\w+\))?\.app/.test(path.dirname)) {
			var isInMacOS = /Contents\/Frameworks\/Electron\ Helper( \(\w+\))?\.app\/Contents\/MacOS$/.test(path.dirname);
			path.dirname = path.dirname.replace(/Electron\ Helper( \(\w+\))?\.app/, name + ' Helper$1.app');

			if (isInMacOS && /^Electron Helper( \(\w+\))?$/.test(path.basename) && path.extname === '') {
				path.basename = path.basename.replace(/Electron\ Helper( \(\w+\))?$/, name + ' Helper$1');
			}
		}
	});
}

exports.patch = function (opts) {
	var pass = es.through();

	var src = pass
		.pipe(opts.keepDefaultApp ? es.through() : removeDefaultApp(opts))
		.pipe(patchIcon(opts))
		.pipe(patchInfoPlist(opts))
		.pipe(patchHelperInfoPlist(opts))
		.pipe(createEntitlementsPlist(opts))
		.pipe(addCredits(opts))
		.pipe(renameApp(opts))
		.pipe(renameAppHelper(opts));

	return es.duplex(pass, src);
};
