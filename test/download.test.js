var assert = require('assert');
var fs = require('fs');
var path = require('path');
var filter = require('gulp-filter');
var buffer = require('gulp-buffer');
var es = require('event-stream');
var download = require('../src/download');

describe('download', function () {
	this.timeout(1000 * 60 * 5);

	it('should work', function(cb) {
		var didSeeInfoPList = false;

		download({ version: '0.24.0', platform: 'darwin', token: process.env['GITHUB_TOKEN'] })
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
	});
	
	it('should replace ffmpeg', function(cb) {
		var ffmpegSeen = false;

		var originalFile = null;
		var original = download({ version: '0.37.5', platform: 'darwin', token: process.env['GITHUB_TOKEN'] })
			.pipe(filter("**/libffmpeg.dylib"))
			.pipe(buffer())
			.pipe(es.through(function (f) { originalFile = f; }))
			.on("end", function () {
				var modifiedFile = null;
				var modified = download({ version: '0.37.5', platform: 'darwin', token: process.env['GITHUB_TOKEN'], ffmpegChromium: true })
					.pipe(filter("**/libffmpeg.dylib"))
					.pipe(buffer())
					.pipe(es.through(function (f) { modifiedFile = f; }))
					.on("end", function () {
						assert(originalFile);
						assert(modifiedFile);
						assert(originalFile.contents.length !== modifiedFile.contents.length);
						cb();
					});
			});
	});
});
