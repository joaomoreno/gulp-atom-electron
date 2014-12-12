var assert = require('assert');
var fs = require('fs');
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
