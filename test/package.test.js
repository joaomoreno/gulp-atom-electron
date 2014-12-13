'use strict';

var assert = require('assert');
var path = require('path');
var vfs = require('vinyl-fs');
var atomshell = require('../');
var util = require('../src/util');

describe('atomshell', function () {
	it('should warn about missing options', function() {
		assert.throws(function () {
			atomshell();
		});

		assert.throws(function () {
			atomshell({
				productName: 'TestApp',
				productVersion: '0.0.1'
			});
		});

		assert.throws(function () {
			atomshell({
				version: '0.19.2',
				productVersion: '0.0.1'
			});
		});

		assert.throws(function () {
			atomshell({
				version: '0.19.2',
				productName: 'TestApp'
			});
		});
	});

	describe('darwin', function () {
		it('should copy app files and patch Atom', function(cb) {
			this.timeout(1000 * 60 * 5 /* 5 minutes */);

			var files = {};
			process.chdir(__dirname);

			vfs.src('src/**/*')
				.pipe(atomshell({
						version: '0.19.2',
						platform: 'darwin',
						productName: 'TestApp',
						productVersion: '0.0.42'
				}))
				.on('data', function (f) {
					files[f.relative] = f;
				})
				.on('error', cb)
				.on('end', function () {
					assert(files['TestApp.app']);
					assert(files[path.join('TestApp.app', 'Contents', 'Resources', 'app', 'main.js')]);
					assert(!Object.keys(files).some(function (k) { return util.startsWith(k, path.join('TestApp.app', 'Contents', 'Resources', 'default_app')); }));

					var packageJsonPath = path.join('TestApp.app', 'Contents', 'Resources', 'app', 'package.json');
					assert(files[packageJsonPath]);
					var packageJson = JSON.parse(files[packageJsonPath].contents.toString('utf8'));
					assert.equal('TestApp', packageJson.name);
					assert.equal('0.0.42', packageJson.version);

					cb();
				});
		});
	});

	describe('linux', function () {
		it('should copy app files and patch Atom', function(cb) {
			this.timeout(1000 * 60 * 5 /* 5 minutes */);

			var files = {};
			process.chdir(__dirname);

			vfs.src('src/**/*')
				.pipe(atomshell({
						version: '0.19.2',
						platform: 'linux',
						productName: 'TestApp',
						productVersion: '0.0.42'
				}))
				.on('data', function (f) {
					files[f.relative] = f;
				})
				.on('error', cb)
				.on('end', function () {
					assert(files[path.join('resources', 'app', 'main.js')]);
					assert(!Object.keys(files).some(function (k) { return util.startsWith(k, path.join('resources', 'default_app')); }));

					var packageJsonPath = path.join('resources', 'app', 'package.json');
					assert(files[packageJsonPath]);
					var packageJson = JSON.parse(files[packageJsonPath].contents.toString('utf8'));
					assert.equal('TestApp', packageJson.name);
					assert.equal('0.0.42', packageJson.version);

					// executable exists
					assert(files['TestApp']);
					assert(files['TestApp'].stat.mode & 100);

					cb();
				});
		});
	});

	describe('win32', function () {
		it('should copy app files and patch Atom', function(cb) {
			this.timeout(1000 * 60 * 5 /* 5 minutes */);

			var files = {};
			process.chdir(__dirname);

			vfs.src('src/**/*')
				.pipe(atomshell({
						version: '0.19.2',
						platform: 'win32',
						productName: 'TestApp',
						productVersion: '0.0.42'
				}))
				.on('data', function (f) {
					files[f.relative] = f;
				})
				.on('error', cb)
				.on('end', function () {
					assert(files[path.join('resources', 'app', 'main.js')]);
					assert(!Object.keys(files).some(function (k) { return util.startsWith(k, path.join('resources', 'default_app')); }));

					var packageJsonPath = path.join('resources', 'app', 'package.json');
					assert(files[packageJsonPath]);
					var packageJson = JSON.parse(files[packageJsonPath].contents.toString('utf8'));
					assert.equal('TestApp', packageJson.name);
					assert.equal('0.0.42', packageJson.version);

					assert(files['TestApp.exe']);

					cb();
				});
		});
	});
});
