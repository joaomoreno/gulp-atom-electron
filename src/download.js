'use strict';

var os = require('os');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var GitHub = require('github-releases');
var ProgressBar = require('progress');
var semver = require('semver');
var es = require('event-stream');
var zfs = require('gulp-vinyl-zip');

var cachePath = path.join(os.tmpdir(), 'gulp-electron-cache');
mkdirp.sync(cachePath);

function cache(assetName, onMiss, cb) {
	var assetPath = path.join(cachePath, assetName);

	fs.exists(assetPath, function (exists) {
		if (exists) { return cb(null, assetPath); }

		var tempAssetPath = assetPath + '.tmp';
		onMiss(tempAssetPath, function (err) {
			if (err) { return cb(err); }

			fs.rename(tempAssetPath, assetPath, function (err) {
				if (err) { return cb(err); }

				cb(null, assetPath);
			});
		});
	});
}

function getAssetName(opts) {
	return semver.gte(opts.version, '0.24.0') ? 'electron' : 'atom-shell';
}

function download(opts, cb) {
	var github = new GitHub({ repo: 'atom/electron', token: opts.token });

	if (!opts.version) {
		return cb(new Error('Missing version'));
	}

	var platform = opts.platform;
	if (!platform) {
		return cb(new Error('Missing platform'));
	}

	var arch = opts.arch;

	if (!arch) {
		switch (platform) {
			case 'darwin': arch = 'x64'; break;
			case 'win32': arch = 'ia32'; break;
			case 'linux': arch = 'ia32'; break;
		}
	}

	var version = 'v' + opts.version;
	var assetName = [getAssetName(opts), version, platform, arch].join('-') + '.zip';

	function download(assetPath, cb) {
		github.getReleases({ tag_name: version }, function (err, releases) {
			if (err) { return cb(err); }

			var release = releases[0];

			if (!release) {
				return cb(new Error('No release ' + opts.version + ' found'));
			}

			var asset = release.assets.filter(function (asset) {
				return asset.name === assetName;
			})[0];

			if (!asset) {
				return cb(new Error('No asset for version ' + opts.version + ', platform ' + platform + ' and arch ' + arch + ' found'));
			}

			github.downloadAsset(asset, function (error, istream) {
				if (process.stdout.isTTY && !opts.quiet) {
					var bar = new ProgressBar('↓ ' + asset.name + ' [:bar] :percent', {
						total: asset.size,
						width: 20
					});

					istream.on('data', function (chunk) { bar.tick(chunk.length); });
				} else {
					console.log('Downloading ' + asset.name + '...');
				}

				var ostream = fs.createWriteStream(assetPath);
				istream.pipe(ostream);
				istream.on('error', cb);
				ostream.on('error', cb);
				ostream.on('close', function () { cb(); });
			});
		});
	}

	cache(assetName, download, cb);
}

module.exports = function (opts) {
	var stream = es.through();

	download({
		version: opts.version,
		platform: opts.platform,
		arch: opts.arch,
		token: opts.token,
		quiet: opts.quiet
	}, function(err, vanilla) {
		if (err) { return stream.emit('error', err); }
		zfs.src(vanilla).pipe(stream);
	});

	return stream;
};