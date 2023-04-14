var assert = require("assert");
var path = require("path");
var filter = require("gulp-filter");
var buffer = require("gulp-buffer");
var es = require("event-stream");
var download = require("../src/download");

describe("download", function () {
  this.timeout(1000 * 60 * 5);

  it("should work", function (cb) {
    var didSeeInfoPList = false;

    download({
      version: "7.2.4",
      platform: "darwin",
      token: process.env["GITHUB_TOKEN"],
    })
      .on("data", function (f) {
        if (
          f.relative === path.join("Electron.app", "Contents", "Info.plist")
        ) {
          didSeeInfoPList = true;
        }
      })
      .on("error", cb)
      .on("end", function () {
        assert(didSeeInfoPList);
        cb();
      });
  });

  it("should download PDBs", function (cb) {
    var didSeePDBs = false;

    download({
      version: "24.1.1",
      platform: "win32",
      arch: "x64",
      pdbs: true,
      token: process.env["GITHUB_TOKEN"],
    })
      .on("data", function (f) {
        if (
          /ffmpeg.dll.pdb/.test(
            f.relative
          )
        ) {
          didSeePDBs = true;
        }
      })
      .on("error", cb)
      .on("end", function () {
        assert(didSeePDBs);
        cb();
      });
  });

  it("should download symbols", function (cb) {
    var didSeeSymbols = false;

    download({
      version: "7.2.4",
      platform: "win32",
      symbols: true,
      token: process.env["GITHUB_TOKEN"],
    })
      .on("data", function (f) {
        if (
          /breakpad_symbols[\\\/]electron.exe.pdb[\\\/][A-Ea-e0-9]+[\\\/]electron.exe.sym/.test(
            f.relative
          )
        ) {
          didSeeSymbols = true;
        }
      })
      .on("error", cb)
      .on("end", function () {
        assert(didSeeSymbols);
        cb();
      });
  });

  it("should replace ffmpeg", function (cb) {
    var ffmpegSeen = false;

    var originalFile = null;
    var original = download({
      version: "10.1.3",
      platform: "darwin",
      token: process.env["GITHUB_TOKEN"],
    })
      .pipe(filter("**/libffmpeg.dylib"))
      .pipe(buffer())
      .pipe(
        es.through(function (f) {
          originalFile = f;
        })
      )
      .on("end", function () {
        var modifiedFile = null;
        var modified = download({
          version: "10.1.3",
          platform: "darwin",
          token: process.env["GITHUB_TOKEN"],
          ffmpegChromium: true,
        })
          .pipe(filter("**/libffmpeg.dylib"))
          .pipe(buffer())
          .pipe(
            es.through(function (f) {
              modifiedFile = f;
            })
          )
          .on("end", function () {
            assert(originalFile);
            assert(modifiedFile);
            assert(
              originalFile.contents.length !== modifiedFile.contents.length
            );
            cb();
          });
      });
  });

  it("should error properly", function (cb) {
    download({
      version: "7.2.4",
      platform: "darwin",
      token: process.env["GITHUB_TOKEN"],
      repo: "foo",
    })
      .once("data", function () {
        cb(new Error("Should never be here"));
      })
      .once("error", function () {
        cb();
      });
  });
});
