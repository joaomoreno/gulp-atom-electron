'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var vfs = require('vinyl-fs');
var atomshell = require('../');
var platform = require('../src/platform');

process.chdir(__dirname);
rimraf.sync(path.join(__dirname, 'out'));

describe('atomshell', function () {
	it('should warn about missing options', function() {
		assert.throws(function () {
			atomshell();
		});

		assert.throws(function () {
			atomshell({
				outputPath: 'out',
				productName: 'TestApp',
				productVersion: '0.0.1'
			});
		});

		assert.throws(function () {
			atomshell({
				version: '0.19.2',
				productName: 'TestApp',
				productVersion: '0.0.1'
			});
		});

		assert.throws(function () {
			atomshell({
				version: '0.19.2',
				outputPath: 'out',
				productVersion: '0.0.1'
			});
		});

		assert.throws(function () {
			atomshell({
				version: '0.19.2',
				outputPath: 'out',
				productName: 'TestApp'
			});
		});
	});

	it('should copy app files and patch package.json', function(cb) {
		this.timeout(1000 * 60 * 5 /* 5 minutes */);

		vfs.src('src/**/*')
			.pipe(atomshell({
					version: '0.19.2',
					outputPath: 'out',
					productName: 'TestApp',
					productVersion: '0.0.42'
			}))
			.on('error', cb)
			.on('end', function () {
				var packageJsonPath = path.join('out', platform.getAppPath('TestApp'), 'package.json');
				assert(fs.existsSync(packageJsonPath));
				
				var packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
				assert.equal(packageJson.name, 'TestApp');
				assert.equal(packageJson.version, '0.0.42');

				cb();
			});
	});
});
