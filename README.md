# gulp-atom-shell

[![Build Status](https://travis-ci.org/joaomoreno/gulp-atom-shell.svg?branch=master)](https://travis-ci.org/joaomoreno/gulp-atom-shell)

### Usage

```javascript
var gulp = require('gulp');
var atomshell = require('gulp-atom-shell');

gulp.task('default', function () {
	return gulp.src('src/**').pipe(atomshell({
		version: '0.19.4',
		outputPath: 'build/MyApp',
		productName: 'MyApp',
		productVersion: '0.0.1'
	}));
});
```

### Options

You **must** provide the following options:
- `version` - the [Atom Shell version](https://github.com/atom/atom-shell/releases) to use
- `outputPath` - the output path where to place your built app

The following options are **optional**:

- **All platforms**
	- `productName` - the name of your product
	- `productVersion` - the version of your product

- **Windows**
	- `winIcon` - path to an `.ico` file
	
- **Darwin**
	- `darwinIcon` - path to an `.icns` file
	- `darwinBundleDocumentTypes` - ([reference](https://developer.apple.com/library/ios/documentation/filemanagement/conceptual/documentinteraction_topicsforios/Articles/RegisteringtheFileTypesYourAppSupports.html)) array of dictionaries, each containing the following structure :
	 - `name` - the `CFBundleTypeName` value
	 - `role` - the `CFBundleTypeRole` value
	 - `ostypes` - the `CFBundleTypeOSTypes` value, a `string` array
	 - `extensions` - the `CFBundleTypeExtensions` value, a `string` array of file extensions
	 - `iconFile` - the `CFBundleTypeIconFile` value
