'use strict';

var assert = require('assert');
var es = require('event-stream');
var path = require('path');
var rimraf = require('rimraf');
var atomshell = require('../');

var cachePath = path.join(__dirname, 'cache');

describe('download', function () {
	before(function(cb) {
	  rimraf(cachePath, cb);
	});

	it('should warn about missing options', function() {
		assert.throws(function () {
			atomshell.download();
		});

		assert.throws(function () {
			atomshell.download({
				platform: 'win32',
				cachePath: cachePath
			});
		});

		assert.throws(function () {
			atomshell.download({
				version: '0.19.3',
				cachePath: cachePath
			});
		});

		assert.throws(function () {
			atomshell.download({
				version: '0.19.3',
				platform: 'win32'
			});
		});
	});

	describe('cache', function () {
		this.timeout(1000 * 60 * 5); // 5 minute timeout

		it('should download the first time', function(cb) {
			atomshell.download({
				version: '0.15.8',
				platform: 'win32',
				cachePath: cachePath
			}).pipe(es.through(null, cb));
		});

		it('should just use the cache the second time', function(cb) {
			this.timeout(1000 * 10); // 10 second timeout
			atomshell.download({
				version: '0.15.8',
				platform: 'win32',
				cachePath: cachePath
			}).pipe(es.through(null, cb));
		});
	});

	describe('versions', function () {
		this.timeout(1000 * 60 * 5); // 5 minute timeout

		it('should download a valid version', function(cb) {
			atomshell.download({
				version: '0.15.9',
				platform: 'win32',
				cachePath: cachePath
			}).pipe(es.through(null, cb));
		});

		it('should provide an unknown version error', function(cb) {
			var stream = atomshell.download({
				version: '0.15.10',
				platform: 'win32',
				cachePath: cachePath
			});

			stream.on('error', function (err) {
				assert.ok(!!err);
				cb();
			});

			stream.pipe(es.through(null, function() {
				cb(new Error('should not be here'));
			}));
		});
	});

	describe('platforms', function () {
		this.timeout(1000 * 60 * 5); // 5 minute timeout

		it('win32', function(cb) {
			var foundIt = false;
			atomshell.download({
				version: '0.19.2',
				platform: 'win32',
				cachePath: cachePath
			}).pipe(es.through(function (file) {
				if (/^atom.exe$/.test(file.path)) {
					foundIt = true;
				}
				return file;
			}, function() {
				assert.ok(foundIt);
				cb();
			}));
		});

		it('darwin', function(cb) {
			var foundIt = false;
			atomshell.download({
				version: '0.19.2',
				platform: 'darwin',
				cachePath: cachePath
			}).pipe(es.through(function (file) {
				if (/^Atom.app\/Contents\/MacOS\/Atom$/.test(file.path)) {
					foundIt = true;
				}
				return file;
			}, function() {
				assert.ok(foundIt);
				cb();
			}));
		});

		it('linux-ia32', function(cb) {
			var foundIt = false;
			atomshell.download({
				version: '0.19.2',
				platform: 'linux-ia32',
				cachePath: cachePath
			}).pipe(es.through(function (file) {
				if (/^atom$/.test(file.path)) {
					foundIt = true;
				}
				return file;
			}, function() {
				assert.ok(foundIt);
				cb();
			}));
		});

		it('linux-x64', function(cb) {
			var foundIt = false;
			atomshell.download({
				version: '0.19.2',
				platform: 'linux-x64',
				cachePath: cachePath
			}).pipe(es.through(function (file) {
				if (/^atom$/.test(file.path)) {
					foundIt = true;
				}
				return file;
			}, function() {
				assert.ok(foundIt);
				cb();
			}));
		});
	});
});
