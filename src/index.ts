import { dirname, resolve } from "@discordx/importer";
import { Clerc, completionsPlugin, helpPlugin, notFoundPlugin } from "clerc";
import { homedir } from "os";
import path from "path";
const commands = await resolve(
	`${dirname(import.meta.url)}/commands/*.{ts,js}`
);
export const APP_DIR = path.join(homedir(), `.tdb`);
export const DATA_DIR = path.join(APP_DIR, "data");

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
		.version("0.0.3-alpha")
		.use(completionsPlugin())
		.use(helpPlugin())
		.use(notFoundPlugin());

	for (const command of COMMANDS) {
		cli = cli.command(command);
	}

	cli.parse();
}
