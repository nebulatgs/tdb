import { dirname, resolve } from "@discordx/importer";
import { Clerc } from "clerc";
const commands = await resolve(
	`${dirname(import.meta.url)}/commands/*.{ts,js}`
);

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
		.version("0.0.1-alpha");

	for (const command of COMMANDS) {
		cli = cli.command(command);
	}

	cli.parse();
}
