import * as V86NS from "$lib/libv86.cjs";
import { defineCommand } from "clerc";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import slip from "slip";
import { encodeSLIP } from "slip-ts";
import { createIPPacket, respondICMPPacket } from "src/ip";
import { setupBlankState, startMySQL, startMySQLForwarding } from "src/setup";
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
	async (context) => {
		console.log("Now booting, please stand by ...");

		const emulator = new V86({
			bios: { url: path.join(dirname, "/data/bios/seabios.bin") },
			bzimage: {
				url: path.join(dirname, "/data/filesystem/efd779b5.bin"),
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

		emulator.add_listener("serial2-output-byte", (byte: number) => {
			const chr = String.fromCharCode(byte);

			if (chr <= "~") {
				process.stdout.write(chr);
			}
		});
		function parseIPPacket(packet: Buffer) {
			const version = (packet[0] >> 4) & 0xf;
			const headerLength = (packet[0] & 0xf) * 4;
			const protocol = packet[9];
			const srcIP = packet.slice(12, 16).join(".");
			const dstIP = packet.slice(16, 20).join(".");

			return {
				version,
				headerLength,
				protocol,
				srcIP,
				dstIP,
				payload: packet.slice(headerLength),
			};
		}
		function parseTCPPacket(packet: Buffer) {
			const srcPort = packet.readUInt16BE(0);
			const dstPort = packet.readUInt16BE(2);
			const seqNumber = packet.readUInt32BE(4);
			const ackNumber = packet.readUInt32BE(8);
			const headerLength = ((packet[12] >> 4) & 0xf) * 4;
			const flags = packet[13];
			const windowSize = packet.readUInt16BE(14);

			return {
				srcPort,
				dstPort,
				seqNumber,
				ackNumber,
				headerLength,
				flags,
				windowSize,
				payload: packet.slice(headerLength),
			};
		}

		const decoder = new slip.Decoder({
			maxMessageSize: 209715200,
			bufferSize: 2048,
			onError: (err) => {
				console.error("error:", err);
			},
			onMessage: (packet) => {
				const state = parseIPPacket(Buffer.from(packet));
				// console.log(state);
				if (state.protocol === 1 && state.dstIP === "10.0.0.2") {
					const response = respondICMPPacket(state.payload);
					const ipPacket = createIPPacket(
						state.dstIP,
						state.srcIP,
						1,
						response
					);

					emulator.serial_send_bytes(1, encodeSLIP(ipPacket));
				}
				if (state.protocol === 6) {
					// Parse TCP packet
					const tcpPacket = parseTCPPacket(state.payload);

					// console.log("Decoded TCP Packet:");
					// console.log(state, tcpPacket);
				}
			},
		});
		emulator.add_listener("serial1-output-byte", (byte: number) => {
			// const decoder = decodeSLIP((packet) => {
			// 	console.log("packet:", packet);

			// 	const state = ip.decode(Buffer.from(packet));

			// 	console.log("state:", state);
			// });
			// decoder(Buffer.from([byte]));

			decoder.decode(new Uint8Array([byte]));

			// const chr = String.fromCharCode(byte);

			// process.stdout.write(Buffer.from("SERIAL1: "));
			// process.stdout.write(chr);
		});

		process.stdin.on("data", (c) => {
			if (c.toString() === "\u0003") {
				// ctrl c
				console.log("Ctrl+C pressed, stopping emulator.");

				emulator.stop();
				process.stdin.pause();
				process.exit();
			} else {
				emulator.serial0_send(c);
			}
		});
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.setEncoding("utf8");

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

		const state = existsSync(path.join(dirname, "/data/blank_state"));
		if (state) {
			const state = await readFile(path.join(dirname, "/data/blank_state"));
			emulator.restore_state(state);
		} else {
			await setupBlankState(emulator);
		}
		await startMySQL(emulator);
		await startMySQLForwarding(emulator);
	}
);
