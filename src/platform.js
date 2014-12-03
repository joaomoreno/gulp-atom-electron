var platformName = (function (platform) {
	switch (platform) {
		case 'win32': return 'win';
		default: return platform;
	}
})(process.platform);

module.exports = require('./' + platformName);
