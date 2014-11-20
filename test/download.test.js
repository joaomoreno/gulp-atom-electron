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

	it('should successfully download the first time', function(cb) {
		this.timeout(1000 * 60 * 5); // 5 minute timeout
		atomshell.download({
			version: '0.15.8',
			platform: 'win32',
			cachePath: cachePath
		}).pipe(es.through(null, cb));
	});

	it('should use the cache the second time', function(cb) {
		this.timeout(1000 * 10); // 10 second timeout
		atomshell.download({
			version: '0.15.8',
			platform: 'win32',
			cachePath: cachePath
		}).pipe(es.through(null, cb));
	});

	it('should download a valid version', function(cb) {
		this.timeout(1000 * 60 * 5); // 5 minute timeout
		atomshell.download({
			version: '0.15.9',
			platform: 'win32',
			cachePath: cachePath
		}).pipe(es.through(null, cb));
	});

	it('but provide an unknown version error', function(cb) {
		this.timeout(1000 * 30); // 30 second timeout
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

	it('should download win32 builds', function(cb) {
		this.timeout(1000 * 60 * 5); // 5 minute timeout
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

	it('should download darwin builds', function(cb) {
		this.timeout(1000 * 60 * 5); // 5 minute timeout
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

	it('should download linux-ia32 builds', function(cb) {
		this.timeout(1000 * 60 * 5); // 5 minute timeout
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

	it('should download linux-x64 builds', function(cb) {
		this.timeout(1000 * 60 * 5); // 5 minute timeout
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
