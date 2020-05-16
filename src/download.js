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

async function downloadAssets(opts) {
	let bar;

	if (!opts.version) {
		throw new Error('Missing version');
	}

	if (!opts.platform) {
		throw new Error('Missing platform');
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
		const { downloadUrl, assetName } = await getDownloadUrl(opts.repo, downloadOpts);

		downloadOpts['mirrorOptions'] = {
			resolveAssetURL: () => downloadUrl
		};

		downloadOpts.artifactName = assetName;
		downloadOpts.unsafelyDisableChecksums = true;
	}

	const start = new Date();
	bar.start = start;

	const zipFilePath = await downloadArtifact(downloadOpts);
	return zipFilePath;
}

function getDarwinLibFFMpegPath() {
	return path.join('Electron.app', 'Contents', 'Frameworks', 'Electron Framework.framework', 'Versions', 'A', 'Libraries', 'libffmpeg.dylib');
}

async function download(opts) {
	const electron = es.through();
	const ffmpeg = es.through();

	const downloadOpts = {
		version: opts.version,
		platform: opts.platform,
		arch: ( opts.arch === 'arm' ? 'armv7l' : opts.arch ),
		assetName: semver.gte(opts.version, '0.24.0') ? 'electron' : 'atom-shell',
		token: opts.token,
		quiet: opts.quiet,
		repo: opts.repo
	};

	try {
		const electronAssets = await downloadAssets(downloadOpts);
		zfs.src(electronAssets)
			.pipe(opts.ffmpegChromium ? filter(['**', '!**/*ffmpeg.*']) : es.through())
			.pipe(electron);
		
		if (opts.ffmpegChromium) {
			const ffmpegAsset = await downloadAssets(assign({}, downloadOpts, {
				assetName: 'ffmpeg'
			}));

			zfs.src(ffmpegAsset)
				.pipe(filter('**/*ffmpeg.*'))
				.pipe(opts.platform === 'darwin' ? rename(getDarwinLibFFMpegPath()) : es.through())
				.pipe(ffmpeg);
		} else {
			ffmpeg = es.readArray([]);
		}
	
		return es.merge(electron, ffmpeg);
	} catch(error) {
		return electron.emit('error', error);
	}
}

module.exports = download;
