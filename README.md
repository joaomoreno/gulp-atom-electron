# gulp-atom-electron

[![Build Status](https://travis-ci.org/joaomoreno/gulp-atom-electron.svg?branch=master)](https://travis-ci.org/joaomoreno/gulp-atom-electron)

### Installation

```bash
npm install --save-dev gulp-atom-electron
```

### Usage

You can use this module in two distinct ways: **to package your application** and/or
**to download a version of Electron** to disk.

#### How to Package Your Application

You should source your app's files using `gulp.src` and pipe them through
`gulp-atom-electron`. The following task will create your application in
the `app` folder, ready for launch.

```javascript
var gulp = require('gulp');
var symdest = require('gulp-symdest');
var electron = require('gulp-atom-electron');

gulp.task('default', function () {
	return gulp.src('src/**')
		.pipe(electron({ version: '0.34.1', platform: 'darwin' }))
		.pipe(symdest('app'));
});
```

**Note:** It is important to use `gulp-symdest` only because of the OS X
platform. An application bundle has symlinks within and if you use `gulp.dest`
to pipe the built app to disk, those will be missing. `symdest` will make
sure symlinks are taken into account.

Finally, you can always pipe it to a **zip archive** for easy distribution.
[joaomoreno/gulp-vinyl-zip](https://github.com/joaomoreno/gulp-vinyl-zip) is recommended:

```javascript
var gulp = require('gulp');
var zip = require('gulp-vinyl-zip');
var electron = require('gulp-atom-electron');

gulp.task('default', function () {
	return gulp.src('src/**')
		.pipe(electron({ version: '0.34.1', platform: 'darwin' }))
		.pipe(zip.dest('app-darwin.zip'));
});
```

#### How to Download Electron

There's also a very handy export `electron.dest()` function that
makes sure you always have the exact version of Electron in a directory:

```javascript
var gulp = require('gulp');
var electron = require('gulp-atom-electron');

gulp.task('default', function () {
	return electron.dest('electron-build', { version: '0.34.1', platform: 'darwin' });
});
```

This will place a vanilla Electron build into the `electron-build` directory.
If you run it consecutively and it detects that the version in the destination directory
is the intended one, it will end up in a no-op. Else it will download the provided version
and replace it.


### Options

You **must** provide the following options:
- `version` - the [Electron version](https://github.com/atom/electron/releases) to use
- `platform` - kind of OS (`darwin`, `linux`, `win32`)

The following options are **optional**:
- `quiet` - suppress a progress bar when downloading
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

- **Linux**
	- `linuxExecutableName` - overwrite the name of the executable in Linux