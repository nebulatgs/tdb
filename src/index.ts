import { dirname, resolve } from "@discordx/importer";
import { Clerc, completionsPlugin, helpPlugin, notFoundPlugin } from "clerc";
import { existsSync } from "fs";
import { ensureDir } from "fs-extra";
import { homedir } from "os";
import path from "path";

const commands = await resolve(
	`${dirname(import.meta.url)}/commands/*.{ts,js}`
);
export const APP_DIR = path.join(homedir(), `.tdb`);
export const DATA_DIR = path.join(APP_DIR, "data");
export const MYSQL_DIR = path.join(DATA_DIR, "mysql");
export const POSTGRES_DIR = path.join(DATA_DIR, "postgres");

if (!existsSync(DATA_DIR)) {
	throw new Error(
		"Data directory does not exist. Please run the `postinstall` script."
	);
}

await Promise.all([ensureDir(MYSQL_DIR), ensureDir(POSTGRES_DIR)]);

const COMMANDS = await Promise.all(
	commands.map(async (command) => {
		const { command: cmd } = await import(command);
		return cmd;
	})
);

export function run() {
	let cli = Clerc.create()
		.scriptName("tdb")
		.description("Temporary databases in WASM.")
		.version("0.0.5-alpha")
		.use(completionsPlugin())
		.use(helpPlugin())
		.use(notFoundPlugin());

	for (const command of COMMANDS) {
		cli = cli.command(command);
	}

	cli.parse();
}
