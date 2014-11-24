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
