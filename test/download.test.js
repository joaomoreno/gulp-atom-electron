var assert = require('assert');
var fs = require('fs');
var path = require('path');
var atomshell = require('..');
var download = require('../src/download');

describe('download', function () {
	this.timeout(1000 * 60 * 5);

	it('should work', function(cb) {
		download({ version: '0.25.1', platform: 'darwin', token: process.env.ATOMSHELL_GITHUB_TOKEN }, function (err, assetPath) {
			assert(!err);
			assert(fs.existsSync(assetPath));
			cb();
		});
	});
});

describe('atomshell', function () {
	this.timeout(1000 * 60 * 5);

	it('should expose download', function(cb) {
		var didSeeInfoPList = false;

		atomshell
			.download({ version: '0.25.1', platform: 'darwin', token: process.env.ATOMSHELL_GITHUB_TOKEN })
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
