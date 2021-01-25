"use strict";

var path = require("path");
const { downloadArtifact } = require("@electron/get");
const ProgressBar = require("progress");
var semver = require("semver");
var rename = require("gulp-rename");
var es = require("event-stream");
var zfs = require("gulp-vinyl-zip");
var filter = require("gulp-filter");
const { Octokit } = require("@octokit/rest");
const got = require("got");

async function getDownloadUrl(
  repoUrl,
  { version, platform, arch, token, assetName }
) {
  const [owner, repo] = repoUrl.split("/");
  const octokit = new Octokit({ auth: token });
  const releaseVersion = version.startsWith("v") ? version : `v${version}`;

  const { data: release } = await octokit.repos.getReleaseByTag({
    owner,
    repo,
    tag: releaseVersion,
  });

  if (!release) {
    throw new Error(`Release for ${releaseVersion} not found`);
  }

  const { data: assets } = await octokit.repos.listReleaseAssets({
    owner,
    repo,
    release_id: release.id,
  });

  assetName = assetName || "electron";
  const asset = assets.find((asset) => {
    const targetName = `${assetName}-${releaseVersion}-${platform}-${arch}.zip`;
    return asset.name === targetName;
  });

  if (!asset) {
    throw new Error(`Release asset for ${releaseVersion} not found`);
  }

  const requestOptions = await octokit.repos.getReleaseAsset.endpoint({
    owner,
    repo,
    asset_id: asset.id,
    headers: {
      Accept: "application/octet-stream",
    },
  });

  const { url, headers } = requestOptions;
  headers.authorization = `token ${token}`;

  const response = await got(url, {
    followRedirect: false,
    method: "HEAD",
    headers,
  });

  return {
    downloadUrl: response.headers.location,
    assetName: asset.name,
  };
}

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

  let downloadOpts = {
    version: opts.version,
    platform: opts.platform,
    arch,
    artifactName,
    artifactSuffix: opts.artifactSuffix,
    token: opts.token,
    downloadOptions: {
      getProgressCallback: (progress) => {
        if (bar) bar.update(progress.percent);
      },
    },
  };

  bar = new ProgressBar(
    `Downloading ${artifactName}: [:bar] :percent ETA: :eta seconds `,
    {
      curr: 0,
      total: 100,
    }
  );

  if (opts.repo) {
    const { downloadUrl, assetName: newAssetName } = await getDownloadUrl(
      opts.repo,
      downloadOpts
    );

    downloadOpts = {
      ...downloadOpts,
      mirrorOptions: { resolveAssetURL: () => downloadUrl },
      artifactName: newAssetName,
      unsafelyDisableChecksums: true,
    };
  }

  const start = new Date();
  bar.start = start;

  return await downloadArtifact(downloadOpts);
}

function downloadStream(opts) {
  return es.readable(function (_, cb) {
    download(opts).then(
      (assets) => {
        zfs
          .src(assets)
          .on("data", (data) => this.emit("data", data))
          .on("error", (err) => this.emit("error", err))
          .on("end", () => this.emit("end"));
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
    version: opts.version,
    platform: opts.platform,
    arch: opts.arch === "arm" ? "armv7l" : opts.arch,
    assetName: semver.gte(opts.version, "0.24.0") ? "electron" : "atom-shell",
    token: opts.token,
    quiet: opts.quiet,
    repo: opts.repo,
    symbols: opts.symbols,
    pdbs: opts.pdbs,
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

module.exports.download = download;
