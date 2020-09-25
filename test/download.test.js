var assert = require('assert');
var fs = require('fs');
var path = require('path');
var filter = require('gulp-filter');
var buffer = require('gulp-buffer');
var es = require('event-stream');
var download = require('../src/download');

describe('download', function () {
	this.timeout(1000 * 60 * 5);

	it('should work', function (cb) {
		var didSeeInfoPList = false;

		download({ version: '7.2.4', platform: 'darwin', token: process.env['GITHUB_TOKEN'] }).then((stream) => {
			stream
				.on('data', function (f) {
					if (f.relative === path.join('Electron.app', 'Contents', 'Info.plist')) {
						didSeeInfoPList = true;
					}
				})
				.on('error', cb)
				.on('end', function () {
					assert(didSeeInfoPList);
					cb();
				});
		}).catch(cb);
	});

	it('should replace ffmpeg', function (cb) {
		var ffmpegSeen = false;

		var originalFile = null;
		download({ version: '7.2.4', platform: 'darwin', token: process.env['GITHUB_TOKEN'] }).then(original => {
			original
				.pipe(filter("**/libffmpeg.dylib"))
				.pipe(buffer())
				.pipe(es.through(function (f) { originalFile = f; }))
				.on("end", function () {
					var modifiedFile = null;
					download({ version: '7.2.4', platform: 'darwin', token: process.env['GITHUB_TOKEN'], ffmpegChromium: true }).then(modified => {
						modified.pipe(filter("**/libffmpeg.dylib"))
							.pipe(buffer())
							.pipe(es.through(function (f) { modifiedFile = f; }))
							.on("end", function () {
								assert(originalFile);
								assert(modifiedFile);
								assert(originalFile.contents.length !== modifiedFile.contents.length);
								cb();
							});
					}).catch(cb);
				});
		}).catch(cb);
	});
});
