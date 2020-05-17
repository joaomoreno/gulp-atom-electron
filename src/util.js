'use strict';

const { Octokit } = require('@octokit/rest');
const got = require('got');
const debug = require('debug')('getDownloadUrl')

function startsWith (haystack, needle) {
	return haystack.substr(0, needle.length) === needle;
};

async function getDownloadUrl(repoUrl, { version, platform, arch, token }) {
	const [owner, repo] = repoUrl.split('/');
	const octokit = new Octokit({ auth: token });
	const releaseVersion = version.startsWith('v') ? version : `v${version}`;

	debug(`Beginning asset download from ${repoUrl} for ${releaseVersion}`)
	const { data: release } = await octokit.repos.getReleaseByTag({
		owner,
		repo,
		tag: releaseVersion
	});

	if (!release) {
		throw new Error(`Release for ${releaseVersion} not found`)
	}

	debug(`Got release for ${releaseVersion}`)
	const { data: assets } = await octokit.repos.listAssetsForRelease({
		owner,
		repo,
		release_id: release.id,
	});

	const asset = assets.find(asset => {
		const targetName = `electron-${releaseVersion}-${platform}-${arch}.zip`;
		return asset.name === targetName;
	});

	if (!asset) {
		throw new Error(`Release asset for ${releaseVersion} not found`)
	}

	debug(`Got asset ${asset.name}`)
	const requestOptions = await octokit.repos.getReleaseAsset.endpoint({
		owner,
		repo,
		asset_id: asset.id,
		headers: {
			Accept: 'application/octet-stream'
		}
	});

	const { url, headers } = requestOptions;
	headers.authorization = `token ${token}`;

	debug(`Fetching asset url from ${url}`)
	const response = await got(url, {
		followRedirect: false,
		method: 'HEAD',
		headers
	});

	debug(`Got download url ${response.headers.location}`)
	return { downloadUrl: response.headers.location, assetName: asset.name };
}

module.exports = {
	getDownloadUrl,
	startsWith
}
