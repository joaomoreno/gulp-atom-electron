var assert = require('assert');
var fs = require('fs');
var path = require('path');
var electron = require('..');
var download = require('../src/download');

describe('download', function () {
	this.timeout(1000 * 60 * 5);

	it('should work', function(cb) {
		download({ version: '0.19.5', platform: 'darwin' }, function (err, assetPath) {
			assert(!err);
			assert(fs.existsSync(assetPath));
			cb();
		});
	});
});

describe('electron', function () {
	this.timeout(1000 * 60 * 5);

	it('should expose download', function(cb) {
		var didSeeInfoPList = false;

		electron
			.download({ version: '0.19.5', platform: 'darwin' })
			.on('data', function (f) {
				if (f.relative === path.join('Atom.app', 'Contents', 'Info.plist')) {
					didSeeInfoPList = true;
				}
			})
			.on('error', cb)
			.on('end', function () {
				assert(didSeeInfoPList);
				cb();
			});
	});
	
	it('should download electron', function(cb) {
		var didSeeInfoPList = false;

		electron
			.download({ version: '0.24.0', platform: 'darwin' })
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
});
