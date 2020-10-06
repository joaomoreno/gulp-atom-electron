'use strict';

var path = require('path');
const { downloadArtifact } = require('@electron/get');
const { getDownloadUrl } = require('./util');
const ProgressBar = require('progress');
var semver = require('semver');
var rename = require('gulp-rename');
var es = require('event-stream');
var zfs = require('gulp-vinyl-zip');
var filter = require('gulp-filter');
var assign = require('object-assign');

function download(opts, cb) {
	let bar;

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

	const artifactName = opts.assetName ? opts.assetName : 'electron'

	const downloadOpts = {
		version: opts.version,
		platform: opts.platform,
		arch,
		artifactName,
		artifactSuffix: opts.artifactSuffix,
		token: opts.token,
		downloadOptions: {
			getProgressCallback: (progress) => {
				if (bar) bar.update(progress.percent);
			},
		}
	};

	bar = new ProgressBar(
		`Downloading ${artifactName}: [:bar] :percent ETA: :eta seconds `,
		{
			curr: 0,
			total: 100,
		},
	);

	if (opts.repo) {
		getDownloadUrl(opts.repo, downloadOpts)
			.then(({ error, downloadUrl, assetName }) => {
				if (error) return cb(error)

				downloadOpts['mirrorOptions'] = {
					resolveAssetURL: () => downloadUrl
				};

				downloadOpts.artifactName = assetName;
				downloadOpts.unsafelyDisableChecksums = true;

				const start = new Date();
				bar.start = start;

				downloadArtifact(downloadOpts).then(zipFilePath => {
					return cb(null, zipFilePath)
				}).catch(error => {
					return cb(error);
				});
			})
			.catch(err => {
				return cb(err);
			});
	} else {
		const start = new Date();
		bar.start = start;

		downloadArtifact(downloadOpts).then(zipFilePath => {
			return cb(null, zipFilePath)
		}).catch(error => {
			return cb(error);
		});
	}
}

function getDarwinLibFFMpegPath(opts) {
	return path.join('Electron.app', 'Contents', 'Frameworks', 'Electron Framework.framework', 'Versions', 'A', 'Libraries', 'libffmpeg.dylib');
}

module.exports = function (opts) {
	var electron = es.readArray([]);
	var ffmpeg = es.readArray([]);
	var symbols = es.readArray([]);
	var pdbs = es.readArray([]);

	var downloadOpts = {
		version: opts.version,
		platform: opts.platform,
		arch: (opts.arch === 'arm' ? 'armv7l' : opts.arch),
		assetName: semver.gte(opts.version, '0.24.0') ? 'electron' : 'atom-shell',
		token: opts.token,
		quiet: opts.quiet,
		repo: opts.repo,
		symbols: opts.symbols,
		pdbs: opts.pdbs
	};

	if (opts.symbols) {
		symbols = es.through();

		download(assign({}, downloadOpts, { artifactSuffix: 'symbols' }), function (err, symbolsAssets) {
			if (err) { return symbols.emit('error', err); }
			
			zfs.src(symbolsAssets)
				.pipe(symbols);
		});
	} else if (opts.pdbs) {
		pdbs = es.through();

		download(assign({}, downloadOpts, { artifactSuffix: 'pdb' }), function (err, pdbAssets) {
			if (err) { return pdbs.emit('error', err); }

			zfs.src(pdbAssets)
				.pipe(pdbs);
		});
	} else {
		electron = es.through();

		download(downloadOpts, function (err, vanilla) {
			if (err) { return electron.emit('error', err); }
			zfs.src(vanilla)
				.pipe(opts.ffmpegChromium ? filter(['**', '!**/*ffmpeg.*']) : es.through())
				.pipe(electron);
		});
	
		if (opts.ffmpegChromium) {
			ffmpeg = es.through();
			download(assign({}, downloadOpts, { assetName: 'ffmpeg' }), function (err, vanilla) {
				if (err) { return ffmpeg.emit('error', err); }
	
				zfs.src(vanilla)
					.pipe(filter('**/*ffmpeg.*'))
					.pipe(opts.platform === 'darwin' ? rename(getDarwinLibFFMpegPath(opts)) : es.through())
					.pipe(ffmpeg);
			});
		}
	}
	
	return es.merge(electron, ffmpeg, symbols, pdbs);
};
