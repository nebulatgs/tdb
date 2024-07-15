// @ts-check

import esDirname from "es-dirname";
import { existsSync } from "fs";
import path from "path";
import { extract } from "tar";
import { fileURLToPath } from "url";
import XzDecompress from "xz-decompress";
const { XzReadableStream } = XzDecompress;

const DATA_DIR_VERSION = "v0.0.1-alpha";
const unpackPath = path.join(
	esDirname() ?? path.dirname(fileURLToPath(import.meta.url)),
	"src"
);

async function downloadBinaryFromGitHub() {
	try {
		const tarballDownloadBuffer = await fetch(
			`https://github.com/nebulatgs/tdb/releases/download/${DATA_DIR_VERSION}/data.txz`
		)
			.then((response) => new Response(new XzReadableStream(response.body)))
			.then((response) => response.arrayBuffer());
		const tarballBuffer = Buffer.from(tarballDownloadBuffer);
		const unpack = extract({
			cwd: unpackPath,
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
		return existsSync(path.join(unpackPath, "data"));
	} catch (e) {
		return false;
	}
}

// Skip downloading the binary if it was already installed via optionalDependencies
if (!isDataDirDownloaded()) {
	console.log("Data directory not found. Will download from GitHub.");
	downloadBinaryFromGitHub();
} else {
	console.log("Data directory already installed.");
}
