var squirrel = require("squirrel");

squirrel.defaults.allowInstall = true;

console.log("installing gulp-vinyl-zip");
squirrel('gulp-vinyl-zip', function (err, zip) {
    if (err || !zip) {
        console.log('gulp-vinyl-zip installation failed, falling back to gulp-vinyl-yazl');
        squirrel('gulp-vinyl-yazl', function (err, zip) {
            if (err || !zip) {
                console.log('gulp-vinyl-yazl installation failed');
            } else {
                console.log('gulp-vinyl-yazl was successfully installed!');
            }
        });
    } else {
        console.log('gulp-vinyl-zip was successfully installed!');
    }
});
