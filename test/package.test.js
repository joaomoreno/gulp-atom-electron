'use strict';

var assert = require('assert');
var atomshell = require('../');

describe('atomshell', function () {
	it('should warn about missing options', function() {
		assert.throws(function () {
			atomshell.package();
		});

		assert.throws(function () {
			atomshell.package({
				outputPath: 'out',
				productName: 'TestApp',
				productVersion: '0.0.1'
			});
		});

		assert.throws(function () {
			atomshell.package({
				version: '0.19.2',
				productName: 'TestApp',
				productVersion: '0.0.1'
			});
		});

		assert.throws(function () {
			atomshell.package({
				version: '0.19.2',
				outputPath: 'out',
				productVersion: '0.0.1'
			});
		});

		assert.throws(function () {
			atomshell.package({
				version: '0.19.2',
				outputPath: 'out',
				productName: 'TestApp'
			});
		});
	});
});
