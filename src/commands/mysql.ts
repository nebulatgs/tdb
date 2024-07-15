import * as V86NS from "$lib/libv86.cjs";
import { defineCommand } from "clerc";
import path from "path";
import { fileURLToPath } from "url";
const { V86 } = V86NS;

const dirname = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	".."
);

export const command = defineCommand(
	{
		name: "mysql",
		description: "test",
		flags: {},
		parameters: [],
	},
	(context) => {
		console.log("Now booting, please stand by ...");

		const emulator = new V86({
			bios: { url: path.join(dirname, "/data/bios/seabios.bin") },
			bzimage: {
				url: path.join(dirname, "/data/filesystem/ee0eefa2.bin"),
			},
			cmdline: [
				"rw",
				"root=host9p rootfstype=9p rootflags=version=9p2000.L,trans=virtio,cache=loose quiet acpi=off console=ttyS0 tsc=reliable mitigations=off random.trust_cpu=on nowatchdog page_poison=on",
			].join(" "),

			wasm_path: path.join(dirname, "/lib/v86.wasm"),
			memory_size: 512 * 1024 * 1024,
			filesystem: {
				basefs: path.join(dirname, "/data/filesystem/filesystem.json"),
				baseurl: path.join(dirname, "/data/filesystem/"),
			},
			network_relay_url: "wss://relay.widgetry.org/",
			autostart: true,
			disable_keyboard: true,
			disable_mouse: true,
			disable_speaker: true,
			acpi: true,
			uart1: true,
			uart2: true,
			uart3: true,
		});

		emulator.add_listener("serial0-output-byte", (byte: number) => {
			const chr = String.fromCharCode(byte);

			if (chr <= "~") {
				process.stdout.write(chr);
			}
		});
		emulator.add_listener("serial1-output-byte", (byte: number) => {
			const chr = String.fromCharCode(byte);

			if (chr <= "~") {
				process.stdout.write(chr);
			}
		});

		process.stdin.on("data", (c) => {
			if (c.toString() === "\u0003") {
				// ctrl c
				console.log("Ctrl+C pressed, stopping emulator.");

				emulator.stop();
				process.stdin.pause();
			} else {
				emulator.serial0_send(c);
			}
		});
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.setEncoding("utf8");
		// Bun related weirdness
		if (typeof Bun !== "undefined") {
			emulator.add_listener("emulator-ready", () => {
				// Hack to make the emulator run in the background
				const handle = setInterval(() => emulator.v86.do_tick(), 0);
				process.stdin.on("data", (c) => {
					if (c.toString() === "\u0003") {
						clearInterval(handle);
					}
				});
			});
		}
	}
);
