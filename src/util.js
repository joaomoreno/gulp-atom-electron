'use strict';

exports.startsWith = function (haystack, needle) {
	return haystack.substr(0, needle.length) === needle;
};
