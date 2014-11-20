'use strict';

var assert = require('assert');
var es = require('event-stream');
var path = require('path');
var rimraf = require('rimraf');
var File = require('vinyl');
var atomshell = require('../');

var cachePath = path.join(__dirname, 'cache');

describe('package', function () {
	before(function(cb) {
		this.timeout(1000 * 60 * 10); // 10 minute timeout

		es.merge(
			atomshell.download({
				version: '0.19.2',
				platform: 'win32',
				cachePath: cachePath
			}),
			atomshell.download({
				version: '0.19.2',
				platform: 'darwin',
				cachePath: cachePath
			}),
			atomshell.download({
				version: '0.19.2',
				platform: 'linux-ia32',
				cachePath: cachePath
			}),
			atomshell.download({
				version: '0.19.2',
				platform: 'linux-x64',
				cachePath: cachePath
			})
		).pipe(es.through(null, cb));
	});

	it('should warn about missing options', function() {
		assert.throws(function () {
			atomshell.package();
		});

		assert.throws(function () {
			atomshell.package({
				productName: 'TestApp',
				productVersion: '0.0.1'
			});
		});

		assert.throws(function () {
			atomshell.package({
				version: '0.19.2',
				productVersion: '0.0.1'
			});
		});

		assert.throws(function () {
			atomshell.package({
				version: '0.19.2',
				productName: 'TestApp'
			});
		});
	});

	it('cant build win32 on non win32', function() {
		if (process.platform !== 'win32') {
			return;
		}

		assert.throws(function () {
			atomshell.package({
				version: '0.19.2',
				productName: 'TestApp',
				productVersion: '0.0.1',
				platform: 'win32',
				cachePath: cachePath
			});
		});
	});

	it('[win32] should move input files into the app directory', function(cb) {
		if (process.platform !== 'win32') {
			return cb();
		}

		var foundIt = false;

		es.readArray([new File({ path: 'foo/bar', base: '' })])
			.pipe(atomshell.package({
				version: '0.19.2',
				productName: 'TestApp',
				productVersion: '0.0.1',
				platform: 'win32',
				cachePath: cachePath
			}))
			.pipe(es.through(function (f) {
				if (/resources\/app\/foo\/bar$/.test(f.path)) {
					foundIt = true;
				}
			}, function () {
				assert.ok(foundIt);
				cb();
			}));
	});

	it('[darwin] should move input files into the app directory', function(cb) {
		var foundIt = false;

		es.readArray([new File({ path: 'foo/bar', base: '' })])
			.pipe(atomshell.package({
				version: '0.19.2',
				productName: 'TestApp',
				productVersion: '0.0.1',
				platform: 'darwin',
				cachePath: cachePath
			}))
			.pipe(es.through(function (f) {
				if (/Atom.app\/Contents\/Resources\/app\/foo\/bar$/.test(f.path)) {
					foundIt = true;
				}
			}, function () {
				assert.ok(foundIt);
				cb();
			}));
	});

	it('[linux-ia32] should move input files into the app directory', function(cb) {
		if (process.platform !== 'win32') {
			return cb();
		}

		var foundIt = false;

		es.readArray([new File({ path: 'foo/bar', base: '' })])
			.pipe(atomshell.package({
				version: '0.19.2',
				productName: 'TestApp',
				productVersion: '0.0.1',
				platform: 'linux-ia32',
				cachePath: cachePath
			}))
			.pipe(es.through(function (f) {
				if (/resources\/app\/foo\/bar$/.test(f.path)) {
					foundIt = true;
				}
			}, function () {
				assert.ok(foundIt);
				cb();
			}));
	});
});
