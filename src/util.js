'use strict';

exports.startsWith = function (haystack, needle) {
	return haystack.substr(0, needle.length) === needle;
};

exports.capitalizeFirstLetter = function(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
};