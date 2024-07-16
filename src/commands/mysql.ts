import * as V86NS from "$lib/libv86.cjs";
import { dirname } from "@discordx/importer";
import chalk from "chalk";
import { defineCommand } from "clerc";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { DATA_DIR } from "src";
import { checkPort } from "src/checkPort";
import {
	initializeMySQLNetworking,
	setupBlankState,
	startMySQL,
	startMySQLForwarding,
} from "src/setup";
const { V86 } = V86NS;

function quoted(str: unknown) {
	return `'${str}'`;
}

export const command = defineCommand(
	{
		name: "mysql",
		description: "Launch a MySQL/MariaDB instance",
		alias: "mariadb",
		flags: {
			port: {
				type: Number,
				alias: "p",
				default: 3306,
				description: "Port launch MySQL on",
			},

			logs: {
				type: Boolean,
				alias: "l",
				default: false,
				description: "Show MySQL logs",
			},

			save: {
				type: String,
				alias: "s",
				default: null,
				description: "Save state with a given name",
			},
		},
		parameters: [],
	},
	async (context) => {
		if (context.flags.save === "blank") {
			console.log("Name 'blank' is reserved.");
			return;
		}

		while (await checkPort(context.flags.port)) {
			console.log(
				`Port ${chalk.bold(
					context.flags.port
				)} is already in use. Trying ${chalk.bold(++context.flags.port)}...`
			);
		}
		const stateExists =
			context.flags.save &&
			!!existsSync(path.join(DATA_DIR, `${context.flags.save}.state`));
		if (context.flags.save) {
			if (stateExists) {
				console.log(
					`Resuming instance ${chalk.bold(quoted(context.flags.save))}`
				);
			} else {
				console.log(
					`Creating new instance ${chalk.bold(quoted(context.flags.save))}`
				);
			}
		} else {
			console.log(`Starting temporary instance`);
		}

		const emulator = new V86({
			bios: { url: path.join(DATA_DIR, "/bios/seabios.bin") },
			bzimage: {
				// Kernel bzImage is located in efd779b5.bin
				url: path.join(DATA_DIR, "/filesystem/efd779b5.bin"),
			},
			cmdline: [
				"rw",
				"root=host9p rootfstype=9p rootflags=version=9p2000.L,trans=virtio,cache=loose quiet acpi=off console=ttyS0 tsc=reliable mitigations=off random.trust_cpu=on nowatchdog page_poison=on",
			].join(" "),
			// Located in the install directory, not the data directory
			wasm_path: path.join(
				dirname(import.meta.url),
				"..",
				"..",
				"/lib/v86.wasm"
			),
			memory_size: 512 * 1024 * 1024,
			filesystem: {
				basefs: path.join(DATA_DIR, "/filesystem/filesystem.json"),
				baseurl: path.join(DATA_DIR, "/filesystem/"),
			},
			network_relay_url: "wss://relay.widgetry.org/",
			autostart: true,
			disable_keyboard: true,
			disable_mouse: true,
			disable_speaker: true,
			acpi: true,
			uart1: true,
			uart2: true,
		});
		if (process.env.DEBUG) {
			emulator.add_listener("serial0-output-byte", (byte: number) => {
				const chr = String.fromCharCode(byte);

				if (chr <= "~") {
					process.stdout.write(chr);
				}
			});
		}
		if (context.flags.logs) {
			let buffer = "";
			emulator.add_listener("serial2-output-byte", (byte: number) => {
				const chr = String.fromCharCode(byte);

				if (chr <= "~") {
					if (chr === "\n") {
						console.log(`  ${chalk.dim(buffer)}`);
						buffer = "";
						return;
					}
					buffer += chr;
				}
			});
		}
		let lock = 0;
		process.on("SIGINT", async () => {
			if (lock) {
				console.log("State is being saved. Please wait...");
			}
			while (lock) {
				// Wait for state to save
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
			lock = 2;

			emulator.stop();
			process.stdin.pause();
			process.exit();
		});

		await new Promise<void>((resolve) => {
			emulator.add_listener("emulator-ready", () => {
				resolve();
			});
		});

		// Bun related weirdness
		if (typeof Bun !== "undefined") {
			// Hack to make the emulator run in the background
			const handle = setInterval(() => emulator.v86.do_tick(), 0);
			process.stdin.on("data", (c) => {
				if (c.toString() === "\u0003") {
					clearInterval(handle);
				}
			});
		}

		const blankState = existsSync(path.join(DATA_DIR, "blank.state"));
		if (!blankState) {
			console.log("Initializing blank instance on first run");
			await setupBlankState(emulator);
		}

		if (stateExists) {
			console.log(`Restoring state from ${chalk.bold(context.flags.save)}`);
			const state = await readFile(
				path.join(DATA_DIR, `${context.flags.save}.state`)
			);
			await emulator.restore_state(state);
			startMySQLForwarding(context.flags.port, emulator);
		} else {
			console.log(`Loading blank instance`);
			const state = await readFile(path.join(DATA_DIR, "blank.state"));
			await emulator.restore_state(state);
			await startMySQL(emulator);
			await initializeMySQLNetworking(context.flags.port, emulator);
			startMySQLForwarding(context.flags.port, emulator);
		}

		console.log(`Instance is ready on port ${chalk.bold(context.flags.port)}`);
		if (context.flags.save) {
			// `unknown` is a workaround for bad types :(
			lock = 1;
			const state = (await emulator.save_state()) as unknown as ArrayBuffer;
			await writeFile(
				path.join(DATA_DIR, `${context.flags.save}.state`),
				Buffer.from(state)
			);
			lock = 0;
			console.log(`Persisting state to ${chalk.bold(context.flags.save)}`);
			setInterval(async () => {
				if (lock >= 1) return;
				lock = 1;
				const state = (await emulator.save_state()) as unknown as ArrayBuffer;
				await writeFile(
					path.join(DATA_DIR, `${context.flags.save}.state`),
					Buffer.from(state)
				);
				lock = 0;
			}, 1000);
		} else {
			console.log(
				`${chalk.bold(
					"Note:"
				)} This instance is temporary and will be lost on exit.`
			);
		}
	}
);
