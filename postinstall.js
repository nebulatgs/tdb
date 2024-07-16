// @ts-check

import { existsSync } from "fs";
import { ensureDir } from "fs-extra";
import { homedir } from "os";
import path from "path";
import { extract } from "tar";
import XzDecompress from "xz-decompress";

const { XzReadableStream } = XzDecompress;

const APP_VERSION = "v0.0.6-alpha";
const APP_DIR = path.join(homedir(), `.tdb`);
const DATA_DIR = path.join(APP_DIR, "data");

async function ensureAppDirectories() {
	await ensureDir(APP_DIR);
	await ensureDir(DATA_DIR);
}

async function downloadBinaryFromGitHub() {
	try {
		const tarballDownloadBuffer = await fetch(
			`https://github.com/nebulatgs/tdb/releases/download/${APP_VERSION}/data.txz`
		)
			.then((response) => new Response(new XzReadableStream(response.body)))
			.then((response) => response.arrayBuffer());
		const tarballBuffer = Buffer.from(tarballDownloadBuffer);
		const unpack = extract({
			cwd: APP_DIR,
			sync: false,
		});

		/** @type {Promise<void>} */
		const unpackPromise = new Promise((resolve) => {
			unpack.write(tarballBuffer);
			unpack.end();
			unpack.once("end", () => {
				console.log("Binary downloaded and unpacked successfully.");
				resolve();
			});
		});
		await unpackPromise;
	} catch (error) {
		console.error("Error downloading binary from GitHub:", error);
	}
}

function isDataDirDownloaded() {
	try {
		return existsSync(DATA_DIR);
	} catch (e) {
		return false;
	}
}

// Skip downloading the binary if it was already installed via optionalDependencies
if (!isDataDirDownloaded()) {
	console.log("Data directory not found. Will download from GitHub.");
	await ensureAppDirectories();
	downloadBinaryFromGitHub();
} else {
	console.log("Data directory already installed.");
}
