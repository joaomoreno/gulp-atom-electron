'use strict';

var assert = require('assert');
var path = require('path');
var vfs = require('vinyl-fs');
var electron = require('../');
var util = require('../src/util');

describe('electron', function () {
	it('should warn about missing options', function() {
		assert.throws(function () {
			electron();
		});

		assert.throws(function () {
			electron({
				productName: 'TestApp',
				productVersion: '0.0.1'
			});
		});

		assert.throws(function () {
			electron({
				version: '0.19.2',
				productVersion: '0.0.1'
			});
		});

		assert.throws(function () {
			electron({
				version: '0.19.2',
				productName: 'TestApp'
			});
		});
	});

	describe('darwin', function () {
		it('should copy app files and patch Electron', function(cb) {
			this.timeout(1000 * 60 * 5 /* 5 minutes */);

			var files = {};
			process.chdir(__dirname);

			vfs.src('src/**/*')
				.pipe(electron({
					version: '0.26.0',
					platform: 'darwin',
					darwinIcon: path.join(__dirname, 'resources', 'myapp.icns'),
					darwinBundleIdentifier: 'com.github.joaomoreno.gulpatomelectron.faketemplateapp',
					token: process.env['GITHUB_TOKEN']
				}))
				.on('data', function (f) {
					assert(!files[f.relative]);
					files[f.relative] = f;
				})
				.on('error', cb)
				.on('end', function () {
					assert(files[path.join('FakeTemplateApp.app', 'Contents', 'Resources', 'app', 'main.js')]);
					assert(!Object.keys(files).some(function (k) { return util.startsWith(k, path.join('FakeTemplateApp.app', 'Contents', 'Resources', 'default_app')); }));

					var packageJsonPath = path.join('FakeTemplateApp.app', 'Contents', 'Resources', 'app', 'package.json');
					assert(files[packageJsonPath]);
					var packageJson = JSON.parse(files[packageJsonPath].contents.toString('utf8'));
					assert.equal('FakeTemplateApp', packageJson.name);
					assert.equal('0.0.1', packageJson.version);

					cb();
				});
		});
	});

	describe('linux', function () {
		it('should copy app files and patch Electron', function(cb) {
			this.timeout(1000 * 60 * 5 /* 5 minutes */);

			var files = {};
			process.chdir(__dirname);

			vfs.src('src/**/*')
				.pipe(electron({
					version: '0.26.0',
					platform: 'linux',
					token: process.env['GITHUB_TOKEN']
				}))
				.on('data', function (f) {
					assert(!files[f.relative]);
					files[f.relative] = f;
				})
				.on('error', cb)
				.on('end', function () {

					assert(files[path.join('resources', 'app', 'main.js')]);
					assert(!Object.keys(files).some(function (k) { return util.startsWith(k, path.join('resources', 'default_app')); }));

					var packageJsonPath = path.join('resources', 'app', 'package.json');
					assert(files[packageJsonPath]);
					var packageJson = JSON.parse(files[packageJsonPath].contents.toString('utf8'));
					assert.equal('FakeTemplateApp', packageJson.name);
					assert.equal('0.0.1', packageJson.version);

					// executable exists
					assert(files['FakeTemplateApp']);

					cb();
				});
		});
	});

	describe('win32', function () {
		it('should copy app files and patch Electron', function(cb) {
			this.timeout(1000 * 60 * 5 /* 5 minutes */);

			var files = {};
			process.chdir(__dirname);

			vfs.src('src/**/*')
				.pipe(electron({
					version: '0.26.0',
					platform: 'win32',
					token: process.env['GITHUB_TOKEN']
				}))
				.on('data', function (f) {
					assert(!files[f.relative]);
					files[f.relative] = f;
				})
				.on('error', cb)
				.on('end', function () {
					assert(files[path.join('resources', 'app', 'main.js')]);
					assert(!Object.keys(files).some(function (k) { return util.startsWith(k, path.join('resources', 'default_app')); }));

					var packageJsonPath = path.join('resources', 'app', 'package.json');
					assert(files[packageJsonPath]);
					var packageJson = JSON.parse(files[packageJsonPath].contents.toString('utf8'));
					assert.equal('FakeTemplateApp', packageJson.name);
					assert.equal('0.0.1', packageJson.version);

					assert(files['FakeTemplateApp.exe']);

					cb();
				});
		});
	});
});
