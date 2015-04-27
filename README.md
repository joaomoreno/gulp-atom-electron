# gulp-atom-shell

[![Build Status](https://travis-ci.org/joaomoreno/gulp-atom-shell.svg?branch=master)](https://travis-ci.org/joaomoreno/gulp-atom-shell)

### Usage

```javascript
var gulp = require('gulp');
var atomshell = require('gulp-atom-shell');

gulp.task('default', function () {
	return gulp.src('src/**')
		.pipe(atomshell({
				  version: '0.25.1',
				  platform: 'darwin'
		 }))
		.pipe(atomshell.zfsdest('app.zip'));
});
```

### Options

You **must** provide the following options:
- `version` - the [Atom Shell version](https://github.com/atom/atom-shell/releases) to use
- `platform` - kind of OS (`darwin`, `linux`, `win32`)

The following options are **optional**:

- `token` - GitHub access token(to avoid request limit. You can grab it [here](https://github.com/settings/tokens))

- `arch` - the processor architecture (`ia32`, `x64`)

- **Windows**
	- `winIcon` - path to an `.ico` file
	- `companyName` - company name
	- `copyright` - copyright statement
	
- **Darwin**
	- `darwinIcon` - path to an `.icns` file
	- `darwinBundleDocumentTypes` - ([reference](https://developer.apple.com/library/ios/documentation/filemanagement/conceptual/documentinteraction_topicsforios/Articles/RegisteringtheFileTypesYourAppSupports.html)) array of dictionaries, each containing the following structure:
	 - `name` - the `CFBundleTypeName` value
	 - `role` - the `CFBundleTypeRole` value
	 - `ostypes` - the `CFBundleTypeOSTypes` value, a `string` array
	 - `extensions` - the `CFBundleTypeExtensions` value, a `string` array of file extensions
	 - `iconFile` - the `CFBundleTypeIconFile` value
