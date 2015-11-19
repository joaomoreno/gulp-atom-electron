var assert = require('assert');
var fs = require('fs');
var path = require('path');
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
});
