import { Args, Command, Flags } from "@oclif/core";
import * as V86NS from "../lib/libv86.cjs";
const { V86 } = V86NS;

export default class Mysql extends Command {
	static override args = {
		file: Args.string({ description: "file to read" }),
	};

	static override description = "describe the command here";

	static override examples = ["<%= config.bin %> <%= command.id %>"];

	static override flags = {
		// flag with no value (-f, --force)
		force: Flags.boolean({ char: "f" }),
		// flag with a value (-n, --name=VALUE)
		name: Flags.string({ char: "n", description: "name to print" }),
	};

	public async run(): Promise<void> {
		const { args, flags } = await this.parse(Mysql);

		// const name = flags.name ?? 'world'
		// this.log(`hello ${name} from /Users/nebula/projects/azide/pglite/src/commands/mysql.ts`)
		// if (args.file && flags.force) {
		//   this.log(`you input --force and --file: ${args.file}`)
		// }

		console.log("Now booting, please stand by ...");

		const emulator = new V86({
			bios: { url: import.meta.dirname + "/../data/bios/seabios.bin" },
			bzimage: {
				url: import.meta.dirname + "/../data/filesystem/ee0eefa2.bin",
			},
			cmdline: [
				"rw",
				"root=host9p rootfstype=9p rootflags=version=9p2000.L,trans=virtio,cache=loose quiet acpi=off console=ttyS0 tsc=reliable mitigations=off random.trust_cpu=on nowatchdog page_poison=on",
			].join(" "),

			wasm_path: import.meta.dirname + "/../lib/v86.wasm",
			memory_size: 512 * 1024 * 1024,
			filesystem: {
				basefs: import.meta.dirname + "/../data/filesystem/filesystem.json",
				baseurl: import.meta.dirname + "/../data/filesystem/",
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
		emulator.serial_set_modem_status(1, 1);
		emulator.add_listener("serial1-output-byte", (byte: number) => {
			const chr = String.fromCharCode(byte);
			if (chr <= "~") {
				process.stdout.write(chr);
			}
		});

		process.stdin.on("data", (c) => {
			if (c.toString() === "\u0003") {
				// ctrl c
				emulator.stop();
				process.stdin.pause();
			} else {
				emulator.serial0_send(c);
			}
		});
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.setEncoding("utf8");
	}
}
