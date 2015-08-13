var assert = require('assert');
var fs = require('fs');
var path = require('path');
var electron = require('..');
var download = require('../src/download');

describe('download', function () {
	this.timeout(1000 * 60 * 5);

	it('should work', function(cb) {
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
