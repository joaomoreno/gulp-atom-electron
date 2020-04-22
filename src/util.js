'use strict';

const { Octokit } = require('@octokit/rest');

function startsWith (haystack, needle) {
	return haystack.substr(0, needle.length) === needle;
};

async function getDownloadUrl(repo, { version, platform, arch, token }) {
	const [owner, repository] = repo.split('/');
	const octokit = new Octokit({ auth: `token ${token}`});

	const { data: release } = await octokit.repos.getReleaseByTag({
		owner,
		repository,
		tag: version,
	});

	if (!release) {
		return { error: `Release for ${version} not found` }
	}

	const { data: assets } = await octokit.repos.listAssetsForRelease({
		owner,
		repository,
		release_id: release.id,
	});

	const asset = assets.find(asset => {
		const targetName = `electron-${version}-${platform}-${arch}.zip`;
		return asset.name === targetName;
	});

	if (!asset) {
		return { error: `Release asset for ${version} not found` }
	}

	const { headers: { location }} = await octokit.repos.getReleaseAsset({
		owner,
		repository,
		asset_id: asset.id,
		headers: {
			accept: 'application/octet-stream'
		}
	});

	return { error: null, location };
}

module.exports = {
	getDownloadUrl,
	startsWith
}
