import chalk from "chalk";
import { randomInt } from "crypto";
export const SOURCE_MAC = Buffer.from("001122334455", "hex");

function createEthernetFrame(packet: Buffer, dstMAC: Buffer) {
	const ethFrameLength = 14 + packet.length; // 14 bytes for Ethernet header
	const ethFrame = Buffer.alloc(ethFrameLength);

	// Ethernet header
	dstMAC.copy(ethFrame, 0);
	SOURCE_MAC.copy(ethFrame, 6);
	ethFrame.writeUInt16BE(0x0800, 12); // EtherType for IPv4

	// Copy IP packet into Ethernet frame
	packet.copy(ethFrame, 14);

	return ethFrame;
}

// SLIP special characters
const END = 0xc0;
const ESC = 0xdb;
const ESC_END = 0xdc;
const ESC_ESC = 0xdd;

export function slipEncode(data: Buffer) {
	let encoded = [END]; // Start with END character

	for (let byte of data) {
		if (byte === END) {
			encoded.push(ESC, ESC_END);
		} else if (byte === ESC) {
			encoded.push(ESC, ESC_ESC);
		} else {
			encoded.push(byte);
		}
	}

	encoded.push(END); // End with END character
	return Buffer.from(encoded);
}

export function slipDecode(data: Buffer) {
	let decoded = [];
	let escapeNext = false;

	for (let byte of data) {
		if (escapeNext) {
			if (byte === ESC_END) {
				decoded.push(END);
			} else if (byte === ESC_ESC) {
				decoded.push(ESC);
			} else {
				// Invalid escape sequence
				decoded.push(ESC);
				decoded.push(byte);
			}
			escapeNext = false;
		} else if (byte === ESC) {
			escapeNext = true;
		} else if (byte === END) {
			// Ignore END characters
		} else {
			decoded.push(byte);
		}
	}

	return Buffer.from(decoded);
}

export function parseIPPacket(packet: Buffer) {
	const version = (packet[0] >> 4) & 0xf;
	const headerLength = (packet[0] & 0xf) * 4;
	const totalLength = packet.readUInt16BE(2);
	const protocol = packet[9];
	const srcIP = packet.slice(12, 16).join(".");
	const dstIP = packet.slice(16, 20).join(".");

	return {
		version,
		headerLength,
		totalLength,
		protocol,
		srcIP,
		dstIP,
		payload: packet.slice(headerLength, totalLength),
	};
}

export function parseTCPPacket(packet: Buffer) {
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

function calculateIPChecksum(header: Buffer) {
	let sum = 0;
	for (let i = 0; i < header.length; i += 2) {
		sum += header.readUInt16BE(i);
	}
	sum = (sum >> 16) + (sum & 0xffff);
	sum += sum >> 16;
	return ~sum & 0xffff;
}

function calculateTCPChecksum(ipSrc: string, ipDst: string, tcpPacket: Buffer) {
	const pseudoHeader = Buffer.alloc(12);
	ipSrc.split(".").forEach((octet, index) => {
		pseudoHeader[index] = parseInt(octet);
	});
	ipDst.split(".").forEach((octet, index) => {
		pseudoHeader[4 + index] = parseInt(octet);
	});
	pseudoHeader[8] = 0; // reserved
	pseudoHeader[9] = 6; // TCP protocol
	pseudoHeader.writeUInt16BE(tcpPacket.length, 10);

	const checksumBuffer = Buffer.concat([pseudoHeader, tcpPacket]);

	let sum = 0;
	for (let i = 0; i < checksumBuffer.length; i += 2) {
		if (i === checksumBuffer.length - 1) {
			sum += checksumBuffer[i] << 8;
		} else {
			sum += checksumBuffer.readUInt16BE(i);
		}
	}
	sum = (sum >> 16) + (sum & 0xffff);
	sum += sum >> 16;
	return ~sum & 0xffff;
}

export function createTCPPacket(
	srcPort: number,
	dstPort: number,
	seqNumber: number,
	ackNumber: number,
	flags: number,
	windowSize: number,
	payload: Buffer
) {
	const headerLength = 20; // Basic TCP header length
	const totalLength = headerLength + payload.length;

	let packet = Buffer.alloc(totalLength);

	// Source Port
	packet.writeUInt16BE(dstPort, 0);
	// Destination Port
	packet.writeUInt16BE(srcPort, 2);
	// Sequence Number
	packet.writeUInt32BE(seqNumber, 4);
	// Acknowledgment Number
	packet.writeUInt32BE(ackNumber, 8);
	// Data Offset, Reserved, and Flags
	packet[12] = (headerLength / 4) << 4;
	packet[13] = flags;
	// Window Size
	packet.writeUInt16BE(windowSize, 14);
	// Checksum (set to 0 for now, will be calculated later)
	packet.writeUInt16BE(0, 16);
	// Urgent Pointer
	packet.writeUInt16BE(0, 18);

	// Copy payload
	payload.copy(packet, headerLength);

	return packet;
}

export function createIPPacket(
	srcIP: string,
	dstIP: string,
	protocol: number,
	payload: Buffer
) {
	const headerLength = 20; // Basic IP header length
	const totalLength = headerLength + payload.length;

	let packet = Buffer.alloc(totalLength);

	// Version and IHL
	packet[0] = 0x45; // IPv4, 5 32-bit words
	// Type of Service
	packet[1] = 0x00;
	// Total Length
	packet.writeUInt16BE(totalLength, 2);
	// Identification (using a random number)
	packet.writeUInt16BE(randomInt(65536), 4);
	// Flags and Fragment Offset
	packet.writeUInt16BE(0x4000, 6); // Don't fragment
	// TTL
	packet[8] = 64;
	// Protocol
	packet[9] = protocol;
	// Header Checksum (set to 0 for now, will be calculated later)
	packet.writeUInt16BE(0, 10);
	// Source IP
	srcIP.split(".").forEach((octet, index) => {
		packet[12 + index] = parseInt(octet);
	});
	// Destination IP
	dstIP.split(".").forEach((octet, index) => {
		packet[16 + index] = parseInt(octet);
	});

	// Calculate and set IP header checksum
	const ipChecksum = calculateIPChecksum(packet.slice(0, headerLength));
	packet.writeUInt16BE(ipChecksum, 10);

	// Copy payload
	payload.copy(packet, headerLength);

	return packet;
}

// export function sendPacketToSLIPDevice(packet: Buffer, emulator: any) {
// 	logTCPIPPacket(packet);
// 	const encodedPacket = slipEncode(packet);
// 	emulator.serial_send_bytes(1, encodedPacket);
// }

export function sendPacketToEthernetDevice(
	packet: Buffer,
	dstMAC: Buffer,
	emulator: any
) {
	logTCPIPPacket(packet);
	const frame = createEthernetFrame(packet, dstMAC);
	emulator.bus.send("net0-receive", new Uint8Array(frame));
}

export async function establishConnection(
	srcIP: string,
	dstIP: string,
	dstMAC: Buffer,
	srcPort: number,
	dstPort: number,
	emulator: any
) {
	// Create initial SYN packet
	const synFlags = 0x02; // SYN flag
	const initialSeqNumber = randomInt(0xffffffff);
	const synPacket = createTCPPacket(
		srcPort,
		dstPort,
		initialSeqNumber,
		0,
		synFlags,
		64240,
		Buffer.alloc(0)
	);

	// Calculate TCP checksum for SYN packet
	const synChecksum = calculateTCPChecksum(srcIP, dstIP, synPacket);
	synPacket.writeUInt16BE(synChecksum, 16);

	// Create IP packet with SYN packet as payload
	const synIPPacket = createIPPacket(srcIP, dstIP, 6, synPacket);

	// Send SYN packet
	sendPacketToEthernetDevice(synIPPacket, dstMAC, emulator);

	const ackNumber = await waitForSYNACK(
		emulator,
		srcIP,
		dstIP,
		dstMAC,
		srcPort,
		dstPort,
		initialSeqNumber
	);

	return [initialSeqNumber + 1, ackNumber];
	// In a real implementation, you would wait for a SYN-ACK response here
	// and then send an ACK packet. For simplicity, we'll assume the connection
	// is established and send the data packet directly.

	// Create data packet
	// const pshAckFlags = 0x18; // PSH and ACK flags
	// const dataPacket = createTCPPacket(
	// 	srcPort,
	// 	dstPort,
	// 	initialSeqNumber + 1,
	// 	0,
	// 	pshAckFlags,
	// 	64240,
	// 	message
	// );

	// Calculate TCP checksum for data packet
	// const dataChecksum = calculateTCPChecksum(srcIP, dstIP, dataPacket);
	// dataPacket.writeUInt16BE(dataChecksum, 16);

	// Create IP packet with data packet as payload
	// const dataIPPacket = createIPPacket(srcIP, dstIP, 6, dataPacket);

	// Send data packet
	// sendPacketToSLIPDevice(dataIPPacket, emulator);
}

// // Example usage
// const srcIP = "10.0.0.1";
// const dstIP = "10.0.0.254";
// const srcPort = 54321; // Random high port number
// const dstPort = 3306; // Netcat listening port
// const message = "Hello, Netcat!";
// const devicePath = "/dev/ttyS1";

// connectToNetcat(srcIP, dstIP, srcPort, dstPort, message, devicePath);

export function decodeTCPFlags(flags: number) {
	const flagNames = ["FIN", "SYN", "RST", "PSH", "ACK", "URG", "ECE", "CWR"];
	return flagNames.filter((_, index) => (flags >> index) & 1);
}

export function respondICMPPacket(packet: Buffer) {
	const headerLength = 0;
	const totalLength = headerLength + packet.length;

	let response = Buffer.alloc(totalLength);

	// Copy header
	packet.copy(response, 0, 0, headerLength);

	// Set ICMP type to 0 (Echo Reply)
	response[0] = 0;

	// Calculate and set ICMP checksum
	const checksum = calculateIPChecksum(response);
	response.writeUInt16BE(checksum, 2);

	// Copy payload
	packet.copy(response, headerLength);

	return response;
}

export function waitForSYNACK(
	emulator: any,
	srcIP: string,
	dstIP: string,
	dstMAC: Buffer,
	srcPort: number,
	dstPort: number,
	initialSeqNumber: number
): Promise<number> {
	return new Promise((resolve, reject) => {
		function processFrame(msg: EthernetFrame) {
			if (msg.etherType !== 0x0800) {
				return;
			}
			if (!msg.destinationMAC.equals(SOURCE_MAC)) {
				return;
			}

			const state = parseIPPacket(msg.payload);
			if (state.protocol === 6) {
				const tcpPacket = parseTCPPacket(state.payload);
				if (
					tcpPacket.flags === 0x12 &&
					tcpPacket.ackNumber === initialSeqNumber + 1
				) {
					// Create ACK packet
					const ackFlags = 0x10; // ACK flag
					const ackPacket = createTCPPacket(
						srcPort,
						dstPort,
						initialSeqNumber + 1,
						tcpPacket.seqNumber + 1,
						ackFlags,
						64240,
						Buffer.alloc(0)
					);

					// Calculate TCP checksum for ACK packet
					const ackChecksum = calculateTCPChecksum(srcIP, dstIP, ackPacket);
					ackPacket.writeUInt16BE(ackChecksum, 16);

					// Create IP packet with ACK packet as payload
					const ackIPPacket = createIPPacket(srcIP, dstIP, 6, ackPacket);

					// Send ACK packet
					// sendPacketToSLIPDevice(ackIPPacket, emulator);
					sendPacketToEthernetDevice(ackIPPacket, dstMAC, emulator);

					// Remove the listener and resolve the promise
					emulator.remove_listener("net0-send", frameListener);
					resolve(tcpPacket.seqNumber + 1);
				}
			}
		}

		const frameListener = (frame: Uint8Array) => {
			processFrame(parseEthernetFrame(Buffer.from(frame)));
		};

		emulator.add_listener("net0-send", frameListener);

		// Add a timeout to prevent hanging indefinitely
		setTimeout(() => {
			emulator.remove_listener("net0-send", frameListener);
			reject(new Error("Timeout waiting for SYN/ACK"));
		}, 30000); // 30 seconds timeout
	});
}

// export function waitForACK(
// 	emulator: any,
// 	srcPort: number,
// 	initialSeqNumber: number
// ): Promise<void> {
// 	return new Promise((resolve, reject) => {
// 		const decoder = new slip.Decoder({
// 			maxMessageSize: 209715200,
// 			bufferSize: 2048,
// 			onMessage: (msg) => {
// 				const state = parseIPPacket(Buffer.from(msg));
// 				if (state.protocol === 6) {
// 					const tcpPacket = parseTCPPacket(state.payload);
// 					if (tcpPacket.dstPort !== srcPort) {
// 						return;
// 					}
// 					if (
// 						tcpPacket.flags === 0x10 &&
// 						tcpPacket.ackNumber === initialSeqNumber + 1
// 					) {
// 						// Remove the listener and resolve the promise
// 						emulator.remove_listener("serial1-output-byte", byteListener);
// 						resolve();
// 					}
// 				}
// 			},
// 		});

// 		const byteListener = (byte: number) => {
// 			decoder.decode(Buffer.from([byte]));
// 		};

// 		emulator.add_listener("serial1-output-byte", byteListener);

// 		// Add a timeout to prevent hanging indefinitely
// 		setTimeout(() => {
// 			emulator.remove_listener("serial1-output-byte", byteListener);
// 			resolve();
// 			// reject(new Error("Timeout waiting for ACK"));
// 		}, 3000); // 30 seconds timeout
// 	});
// }

export async function sendTCPPacket(
	srcIP: string,
	dstIP: string,
	dstMAC: Buffer,
	srcPort: number,
	dstPort: number,
	lastSeq: number,
	lastAck: number,
	emulator: any,
	message: Buffer
) {
	// Create data packet
	const pshAckFlags = 0x18; // PSH and ACK flags
	const dataPacket = createTCPPacket(
		srcPort,
		dstPort,
		lastSeq,
		lastAck,
		pshAckFlags,
		64240,
		message
	);

	// Calculate TCP checksum for data packet
	const dataChecksum = calculateTCPChecksum(srcIP, dstIP, dataPacket);
	dataPacket.writeUInt16BE(dataChecksum, 16);

	// Create IP packet with data packet as payload
	const dataIPPacket = createIPPacket(srcIP, dstIP, 6, dataPacket);

	// Send data packet
	// sendPacketToSLIPDevice(dataIPPacket, emulator);
	sendPacketToEthernetDevice(dataIPPacket, dstMAC, emulator);
	// TODO: Implement ACK windows
	// await waitForACK(emulator, srcPort, lastSeq);
}

const ACK_FLAG = 0x10; // ACK flag

function createACKPacket(
	srcPort: number,
	dstPort: number,
	seqNumber: number,
	ackNumber: number,
	windowSize: number = 64240
): Buffer {
	return createTCPPacket(
		dstPort,
		srcPort,
		seqNumber,
		ackNumber,
		ACK_FLAG,
		windowSize,
		Buffer.alloc(0) // Empty buffer for ACK packets
	);
}

export function sendACK(
	srcIP: string,
	dstIP: string,
	dstMAC: Buffer,
	srcPort: number,
	dstPort: number,
	lastAck: number,
	lastSeq: number,
	emulator: any
) {
	// Create ACK packet
	/// function createACKPacket(srcPort: number, dstPort: number, seqNumber: number, ackNumber: number, windowSize?: number): Buffer
	const ackPacket = createACKPacket(srcPort, dstPort, lastAck, lastSeq, 64240);

	// Calculate TCP checksum for ACK packet
	const ackChecksum = calculateTCPChecksum(srcIP, dstIP, ackPacket);
	ackPacket.writeUInt16BE(ackChecksum, 16);

	// Create IP packet with ACK packet as payload
	const ackIPPacket = createIPPacket(srcIP, dstIP, 6, ackPacket);

	// Send ACK packet
	// sendPacketToSLIPDevice(ackIPPacket, emulator);
	sendPacketToEthernetDevice(ackIPPacket, dstMAC, emulator);

	return lastSeq;
}

// export function logTCPIPPacket(ipPacket: Buffer) {
// 	const decodedIp = parseIPPacket(ipPacket);
// 	const { srcIP, dstIP } = decodedIp;
// 	const colorfulSrcIP =
// 		srcIP === "10.0.0.1" ? chalk.green(srcIP) : chalk.red(srcIP);
// 	const colorfulDstIP =
// 		dstIP === "10.0.0.1" ? chalk.green(dstIP) : chalk.red(dstIP);
// 	const decodedTCP = parseTCPPacket(decodedIp.payload);
// 	const { srcPort, dstPort, seqNumber, ackNumber, flags, windowSize } =
// 		decodedTCP;
// 	// console.log(
// 	// 	`${colorfulSrcIP} -> ${colorfulDstIP} TCP ${srcPort} -> ${dstPort} [${decodeTCPFlags(
// 	// 		flags
// 	// 	).join(", ")}] Seq=${seqNumber} Ack=${ackNumber} Win=${windowSize}`
// 	// );
// }

function padRight(str: string, length: number): string {
	return str.padEnd(length);
}

function padLeft(str: string, length: number): string {
	return str.padStart(length);
}

export function logTCPIPPacket(ipPacket: Buffer) {
	if (!process.env.DEBUG) {
		return;
	}
	const decodedIp = parseIPPacket(ipPacket);
	const { srcIP, dstIP } = decodedIp;
	const colorfulSrcIP =
		srcIP === "10.0.0.1" ? chalk.green(srcIP) : chalk.red(srcIP);
	const colorfulDstIP =
		dstIP === "10.0.0.1" ? chalk.green(dstIP) : chalk.red(dstIP);
	const decodedTCP = parseTCPPacket(decodedIp.payload);
	const { srcPort, dstPort, seqNumber, ackNumber, flags, windowSize } =
		decodedTCP;

	const ipSection = `${padRight(colorfulSrcIP, 16)} -> ${padRight(
		colorfulDstIP,
		16
	)}`;
	const portSection = `TCP ${padLeft(srcPort.toString(), 5)} -> ${padLeft(
		dstPort.toString(),
		5
	)}`;
	const flagsSection = `[${padRight(decodeTCPFlags(flags).join(", "), 20)}]`;
	const seqSection = `Seq=${padLeft(seqNumber.toString(), 10)}`;
	const ackSection = `Ack=${padLeft(ackNumber.toString(), 10)}`;
	const winSection = `Win=${padLeft(windowSize.toString(), 5)}`;

	console.log(
		`${ipSection} ${portSection} ${flagsSection} ${seqSection} ${ackSection} ${winSection}`
	);
}

export interface EthernetFrame {
	destinationMAC: Buffer;
	sourceMAC: Buffer;
	etherType: number;
	payload: Buffer;
}

export function parseEthernetFrame(buffer: Buffer): EthernetFrame {
	if (buffer.length < 14) {
		throw new Error("Buffer is too small to contain a valid Ethernet frame");
	}

	const destinationMAC = buffer.slice(0, 6);
	// .toString("hex")
	// .match(/.{1,2}/g)
	// ?.join(":") || "";
	const sourceMAC = buffer.slice(6, 12);
	// .toString("hex")
	// .match(/.{1,2}/g)
	// ?.join(":") || "";
	const etherType = buffer.readUInt16BE(12);
	const payload = buffer.slice(14);

	return {
		destinationMAC,
		sourceMAC,
		etherType,
		payload,
	};
}

export function sendARPRequest(srcIP: string, dstIP: string, emulator: any) {
	return new Promise<Buffer>((resolve) => {
		const SOURCE_IP = Buffer.from(
			srcIP.split(".").map((octet) => parseInt(octet))
		);
		const DEST_IP = Buffer.from(
			dstIP.split(".").map((octet) => parseInt(octet))
		);
		const arpRequest = Buffer.alloc(42);

		// Ethernet header
		arpRequest.write("FFFFFFFFFFFF", 0, "hex"); // Broadcast
		SOURCE_MAC.copy(arpRequest, 6);
		arpRequest.writeUInt16BE(0x0806, 12); // ARP EtherType

		// ARP payload
		arpRequest.writeUInt16BE(1, 14); // Hardware type: Ethernet
		arpRequest.writeUInt16BE(0x0800, 16); // Protocol type: IPv4
		arpRequest.writeUInt8(6, 18); // Hardware size
		arpRequest.writeUInt8(4, 19); // Protocol size
		arpRequest.writeUInt16BE(1, 20); // Opcode: request
		SOURCE_MAC.copy(arpRequest, 22);
		SOURCE_IP.copy(arpRequest, 28);
		arpRequest.fill(0, 32, 38); // Target MAC (unknown)
		DEST_IP.copy(arpRequest, 38);

		emulator.add_listener("net0-send", (data: Uint8Array) => {
			const frame = Buffer.from(data);
			if (frame.readUInt16BE(12) === 0x0806 && frame.readUInt16BE(20) === 2) {
				const dstMAC = frame.slice(6, 12);
				resolve(dstMAC);
			}
		});

		// RESPOND TO ARP REQUEST
		emulator.add_listener("net0-send", (data: Uint8Array) => {
			const frame = Buffer.from(data);
			if (frame.readUInt16BE(12) === 0x0806 && frame.readUInt16BE(20) === 1) {
				const srcMAC = frame.slice(6, 12);
				const srcIP = frame.slice(28, 32).join(".");
				const response = Buffer.alloc(42);

				// Ethernet header
				srcMAC.copy(response, 0);
				SOURCE_MAC.copy(response, 6);
				response.writeUInt16BE(0x0806, 12); // ARP EtherType

				// ARP payload
				response.writeUInt16BE(1, 14); // Hardware type: Ethernet
				response.writeUInt16BE(0x0800, 16); // Protocol type: IPv4
				response.writeUInt8(6, 18); // Hardware size
				response.writeUInt8(4, 19); // Protocol size
				response.writeUInt16BE(2, 20); // Opcode: reply
				SOURCE_MAC.copy(response, 22);
				SOURCE_IP.copy(response, 28);
				srcMAC.copy(response, 32);
				srcIP.split(".").forEach((octet, index) => {
					response[38 + index] = parseInt(octet);
				});
				console.log("Responded to ARP request");

				emulator.bus.send("net0-receive", new Uint8Array(response));
			}
		});

		emulator.bus.send("net0-receive", new Uint8Array(arpRequest));
	});
}
