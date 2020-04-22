'use strict';

var path = require('path');
const { downloadArtifact } = require('@electron/get');
var semver = require('semver');
var rename = require('gulp-rename');
var es = require('event-stream');
var zfs = require('gulp-vinyl-zip');
var filter = require('gulp-filter');
var assign = require('object-assign');

function download(opts, cb) {
	if (!opts.version) {
		return cb(new Error('Missing version'));
	}

	if (!opts.platform) {
		return cb(new Error('Missing platform'));
	}

	let arch = opts.arch;
	if (!arch) {
		switch (opts.platform) {
			case 'darwin': arch = 'x64'; break;
			case 'win32': arch = 'ia32'; break;
			case 'linux': arch = 'ia32'; break;
		}
	}

	const downloadOptions = {
		version: opts.version,
		platform: opts.platform,
		arch,
		artifactName: opts.assetName,
	};

	(opts.repo ? getDownloadUrl(opts.repo, downloadOptions) : Promise.resolve({})).then(({
		err, downloadURL
	}) => {
		if (err) return cb(err)

		if (downloadURL) {
			downloadOptions['mirrorOptions'] = { mirror: downloadUrl }
		}

		downloadArtifact(downloadOptions).then(zipFilePath => {
			return cb(null, zipFilePath)
		}).catch(err => {
			return cb(err); 
		});
	});
}

function getDarwinLibFFMpegPath(opts) {
	return path.join('Electron.app', 'Contents', 'Frameworks', 'Electron Framework.framework', 'Versions', 'A', 'Libraries', 'libffmpeg.dylib');
}

module.exports = function (opts) {
	var electron = es.through();
	var ffmpeg = es.through();

	var downloadOpts = {
		version: opts.version,
		platform: opts.platform,
		arch: ( opts.arch === 'arm' ? 'armv7l' : opts.arch ),
		assetName: semver.gte(opts.version, '0.24.0') ? 'electron' : 'atom-shell',
		token: opts.token,
		quiet: opts.quiet,
		repo: opts.repo
	};

	download(downloadOpts, function (err, vanilla) {
		if (err) { return electron.emit('error', err); }
		zfs.src(vanilla)
			.pipe(opts.ffmpegChromium ? filter(['**', '!**/*ffmpeg.*']) : es.through())
			.pipe(electron);
	});

	if (opts.ffmpegChromium) {
		download(assign({}, downloadOpts, { assetName: 'ffmpeg' }), function (err, vanilla) {
			if (err) { return ffmpeg.emit('error', err); }

			zfs.src(vanilla)
				.pipe(filter('**/*ffmpeg.*'))
				.pipe(opts.platform === 'darwin' ? rename(getDarwinLibFFMpegPath(opts)) : es.through())
				.pipe(ffmpeg);
		});
	} else {
		ffmpeg = es.readArray([]);
	}

	return es.merge(electron, ffmpeg);
};
