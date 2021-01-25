"use strict";

var path = require("path");
const { downloadArtifact } = require("@electron/get");
const ProgressBar = require("progress");
var semver = require("semver");
var rename = require("gulp-rename");
var es = require("event-stream");
var zfs = require("gulp-vinyl-zip");
var filter = require("gulp-filter");

async function download(opts) {
  let bar;

  if (!opts.version) {
    throw new Error("Missing version");
  }

  if (!opts.platform) {
    throw new Error("Missing platform");
  }

  let arch = opts.arch;
  if (!arch) {
    switch (opts.platform) {
      case "darwin":
        arch = "x64";
        break;
      case "win32":
        arch = "ia32";
        break;
      case "linux":
        arch = "ia32";
        break;
    }
  }

  const artifactName = opts.assetName ? opts.assetName : "electron";
  const electronOptions = {
    version: opts.version,
    platform: opts.platform,
    arch,
    artifactName,
    artifactSuffix: opts.artifactSuffix,
    downloadOptions: {
      getProgressCallback: (progress) => {
        if (bar) bar.update(progress.percent);
      },
    },
  };

  if (opts.token) {
    electronOptions.downloadOptions.headers = {
      authorization: `token ${opts.token}`,
    };
  }

  bar = new ProgressBar(
    `Downloading ${artifactName}: [:bar] :percent ETA: :eta seconds `,
    {
      curr: 0,
      total: 100,
    }
  );

  if (opts.mirror) {
    electronOptions.mirrorOptions = { mirror: opts.mirror };
    electronOptions.unsafelyDisableChecksums = true;
  }

  const start = new Date();
  bar.start = start;

  return await downloadArtifact(electronOptions);
}

function downloadStream(opts) {
  return es.readable(function (_, cb) {
    download(opts).then(
      (assets) => {
        zfs
          .src(assets)
          .on("data", (data) => this.emit("data", data))
          .once("error", (err) => this.emit("error", err))
          .once("end", () => this.emit("end"));
      },
      (err) => cb(err)
    );
  });
}

function getDarwinLibFFMpegPath(opts) {
  return path.join(
    "Electron.app",
    "Contents",
    "Frameworks",
    "Electron Framework.framework",
    "Versions",
    "A",
    "Libraries",
    "libffmpeg.dylib"
  );
}

module.exports = function (opts) {
  const downloadOpts = {
    ...opts,
    arch: opts.arch === "arm" ? "armv7l" : opts.arch,
    assetName: semver.gte(opts.version, "0.24.0") ? "electron" : "atom-shell",
  };

  if (opts.symbols) {
    return downloadStream({ ...downloadOpts, artifactSuffix: "symbols" });
  } else if (opts.pdbs) {
    return downloadStream({ ...downloadOpts, artifactSuffix: "pdb" });
  } else {
    let electron = downloadStream(downloadOpts);

    if (!opts.ffmpegChromium) {
      return electron;
    }

    electron = electron.pipe(filter(["**", "!**/*ffmpeg.*"]));

    let ffmpeg = downloadStream({
      ...downloadOpts,
      assetName: "ffmpeg",
    }).pipe(filter("**/*ffmpeg.*"));

    if (opts.platform === "darwin") {
      ffmpeg = ffmpeg.pipe(rename(getDarwinLibFFMpegPath(opts)));
    }

    return es.merge(electron, ffmpeg);
  }
};
