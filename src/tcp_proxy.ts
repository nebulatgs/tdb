import chalk from "chalk";
import { randomInt } from "crypto";
import * as fs from "fs";
import * as net from "net";
import slip from "slip";
import * as tls from "tls";
import * as util from "util";
import {
	establishConnection,
	logTCPIPPacket,
	parseIPPacket,
	parseTCPPacket,
	sendACK,
	sendTCPPacket,
} from "./ip";
interface TcpProxyOptions {
	quiet?: boolean;
	pfx?: string;
	passphrase?: string;
	rejectUnauthorized?: boolean;
	identUsers?: string[];
	allowedIPs?: string[];
	tls?: boolean | "both";
	hostname?: string;
	customTlsOptions?: tls.TlsOptions;
	localAddress?: string;
	localPort?: number;
	upstream?: InterceptorFunction;
	downstream?: InterceptorFunction;
	serviceHostSelected?: (proxySocket: net.Socket, index: number) => number;
}

interface Context {
	buffers: Buffer[];
	connected: boolean;
	srcPort: number;
	proxySocket: net.Socket | tls.TLSSocket;
	serviceSocket?: net.Socket | tls.TLSSocket;
}

type InterceptorFunction = (
	context: Context,
	data: Buffer
) => Buffer | Promise<Buffer>;

export class TcpProxy {
	private proxyPort: number;
	private sequenceNumber: number = 0;
	private ackNumber: number = 0;
	private serviceHosts: string[];
	private servicePorts: number[];
	private serviceHostIndex: number;
	private options: Required<TcpProxyOptions>;
	private proxyTlsOptions: tls.TlsOptions;
	private serviceTlsOptions: tls.TlsOptions;
	private proxySockets: { [key: string]: net.Socket | tls.TLSSocket };
	private users?: string[];
	private allowedIPs?: string[];
	private server: net.Server | tls.Server | null = null;
	private emulator: any;

	constructor(
		proxyPort: number,
		serviceHost: string | number | string[],
		servicePort: string | number | number[],
		emulator: any,
		options?: TcpProxyOptions
	) {
		this.emulator = emulator;
		this.proxyPort = proxyPort;
		this.serviceHosts = this.parse(serviceHost);
		this.servicePorts = this.parse(servicePort).map(Number);
		this.serviceHostIndex = -1;
		this.options = this.parseOptions(options);
		this.proxyTlsOptions = {
			passphrase: this.options.passphrase,
			secureProtocol: "TLSv1_2_method",
		};
		if (this.options.tls) {
			this.proxyTlsOptions.pfx = fs.readFileSync(this.options.pfx);
		}
		this.serviceTlsOptions = {
			rejectUnauthorized: this.options.rejectUnauthorized,
			secureProtocol: "TLSv1_2_method",
		};
		this.proxySockets = {};
		if (this.options.identUsers.length !== 0) {
			this.users = this.options.identUsers;
			this.log(`Will only allow these users: ${this.users.join(", ")}`);
		} else {
			this.log("Will allow all users");
		}
		if (this.options.allowedIPs.length !== 0) {
			this.allowedIPs = this.options.allowedIPs;
		}
		this.createListener();
	}

	private parse(o: string | number | string[]): string[] {
		if (typeof o === "string") {
			return o.split(",");
		} else if (typeof o === "number") {
			return this.parse(o.toString());
		} else if (Array.isArray(o)) {
			return o;
		} else {
			throw new Error("cannot parse object: " + o);
		}
	}

	private parseOptions(options?: TcpProxyOptions): TcpProxyOptions {
		return Object.assign(
			{
				quiet: true,
				pfx: undefined,
				passphrase: "abcd",
				rejectUnauthorized: true,
				identUsers: [],
				allowedIPs: [],
				tls: false,
				hostname: undefined,
				customTlsOptions: undefined,
				localAddress: undefined,
				localPort: undefined,
				upstream: undefined,
				downstream: undefined,
				serviceHostSelected: undefined,
			},
			options || {}
		);
	}

	private createListener(): void {
		if (this.options.tls) {
			this.server = tls.createServer(
				this.options.customTlsOptions || this.proxyTlsOptions,
				(socket) => {
					this.handleClientConnection(socket);
				}
			);
		} else {
			this.server = net.createServer((socket) => {
				this.handleClientConnection(socket);
				// this.emulator.serial0_send(
				// 	// "socat file:/dev/ttyS1,raw,echo=0  UNIX-CONNECT:/run/mysqld/mysqld.sock\n"
				// 	"socat file:/dev/ttyS1,raw,ignoreeof,echo=0 tcp:127.0.0.1:3306\n"
				// );
			});
		}
		this.server.listen(this.proxyPort, this.options.hostname);
	}

	private handleClientConnection(socket: net.Socket | tls.TLSSocket): void {
		if (this.users) {
			this.handleAuth(socket);
		} else {
			this.handleClient(socket);
		}
	}

	private handleAuth(proxySocket: net.Socket | tls.TLSSocket): void {
		if (this.allowedIPs?.includes(proxySocket.remoteAddress!)) {
			this.handleClient(proxySocket);
			return;
		}
		const query = util.format("%d, %d", proxySocket.remotePort, this.proxyPort);
		const ident = new net.Socket();
		let resp: string | undefined;
		ident.on("error", () => {
			resp = undefined;
			ident.destroy();
		});
		ident.on("data", (data) => {
			resp = data.toString().trim();
			ident.destroy();
		});
		ident.on("close", () => {
			if (!resp) {
				this.log("No identd");
				proxySocket.destroy();
				return;
			}
			const user = resp.split(":").pop();
			if (!this.users?.includes(user!)) {
				this.log(`User "${user}" unauthorized`);
				proxySocket.destroy();
			} else {
				this.handleClient(proxySocket);
			}
		});
		ident.connect(113, proxySocket.remoteAddress!, () => {
			ident.write(query);
			ident.end();
		});
	}

	private async handleClient(proxySocket: net.Socket | tls.TLSSocket) {
		const key = this.uniqueKey(proxySocket);
		this.proxySockets[key] = proxySocket;
		const context: Context = {
			buffers: [],
			connected: false,
			srcPort: randomInt(1024, 65535),
			proxySocket: proxySocket,
		};
		this.createServiceSocket(context);
		[this.sequenceNumber, this.ackNumber] = await establishConnection(
			"10.0.0.2",
			"10.0.0.1",
			3306,
			context.srcPort,
			this.emulator
		);
		proxySocket.on("data", (data) => {
			// console.log("data", data);

			this.handleUpstreamData(context, data);
		});
		proxySocket.on("close", () => {
			delete this.proxySockets[this.uniqueKey(proxySocket)];
			if (context.serviceSocket !== undefined) {
				context.serviceSocket.destroy();
			}
			// this.emulator.serial0_send("\u0003\n");
		});
		proxySocket.on("error", () => {
			if (context.serviceSocket !== undefined) {
				context.serviceSocket.destroy();
			}
		});
	}

	private handleUpstreamData(context: Context, data: Buffer): void {
		Promise.resolve(this.intercept(this.options.upstream, context, data)).then(
			async (processedData) => {
				await sendTCPPacket(
					"10.0.0.2",
					"10.0.0.1",
					3306,
					context.srcPort,
					this.sequenceNumber,
					this.ackNumber,
					this.emulator,
					processedData
				);
				if (processedData.length > 0) {
					this.sequenceNumber += data.length;
					console.log(chalk.bold(`Sending ${data.length} bytes`));
				}
				// console.log("processedData", processedData);
				// console.log(parseTCPPacket(processedData));
				// const tcpPacket = createTCPPacket(
				// 	12345,
				// 	3306,
				// 	1000,
				// 	2000,
				// 	0x18,
				// 	64240,
				// 	processedData
				// );
				// console.log(parseTCPPacket(tcpPacket));
				// const ipPacket = createIPPacket("10.0.0.254", "10.0.0.1", 6, tcpPacket);
				// this.emulator.serial_send_bytes(1, encodeSLIP(ipPacket));
				// if (context.connected) {
				// 	context.serviceSocket!.write(processedData);
				// } else {
				// 	context.buffers.push(processedData);
				// 	if (context.serviceSocket === undefined) {
				// 		this.createServiceSocket(context);
				// 	}
				// }
			}
		);
	}

	private createServiceSocket(context: Context): void {
		const options = this.parseServiceOptions(context);
		// if (this.options.tls === "both") {
		// 	context.serviceSocket = tls.connect(options, () => {
		// 		this.writeBuffer(context);
		// 	});
		// } else {

		// this.emulator.add_listener("serial1-output-byte", (byte: number) => {
		// 	// console.log("byte", byte);
		// 	context.proxySocket.write(Buffer.from("HELLO"));
		// 	// Promise.resolve(
		// 	// 	this.intercept(this.options.downstream, context, Buffer.from([byte]))
		// 	// ).then((processedData) => context.proxySocket.write(processedData));
		// });
		// console.log("Creating service socket");

		const logMessage = (msg: Uint8Array) => {
			// console.log("A SLIP message was received! Here is it: " + msg);
		};

		const decoder = new slip.Decoder({
			maxMessageSize: 209715200,
			bufferSize: 2048,
			onError: (err) => {
				console.error("error:", err);
			},
			onMessage: (packet) => {
				logTCPIPPacket(Buffer.from(packet));
				const state = parseIPPacket(Buffer.from(packet));

				if (state.protocol === 6) {
					// Parse TCP packet
					const tcpPacket = parseTCPPacket(state.payload);
					this.ackNumber = tcpPacket.seqNumber + tcpPacket.payload.length;

					context.proxySocket.write(tcpPacket.payload);

					if (tcpPacket.payload.length > 0) {
						sendACK(
							"10.0.0.2",
							"10.0.0.1",
							context.srcPort,
							3306,
							this.sequenceNumber,
							this.ackNumber,
							this.emulator,
							Buffer.alloc(0)
						);

						// this.sequenceNumber += 1;
					}
					// If the received packet has the ACK flag set, update our sequence number
					if (tcpPacket.flags & 0x10) {
						// 0x10 is the ACK flag
						this.sequenceNumber = Math.max(
							this.sequenceNumber,
							tcpPacket.ackNumber
						);
					}
				}
			},
		});

		this.emulator.add_listener("serial1-output-byte", (byte: number) => {
			decoder.decode(Buffer.from([byte]));
		});

		// this.emulator.add_listener("serial1-output-byte", (byte: number) => {
		// 	// console.log("byte", byte);
		// });

		// context.serviceSocket = new net.Socket();
		// context.serviceSocket.connect(options, () => {
		// 	this.writeBuffer(context);
		// });
		// // }
		// context.serviceSocket.on("data", (data) => {
		// 	Promise.resolve(
		// 		this.intercept(this.options.downstream, context, data)
		// 	).then((processedData) => context.proxySocket.write(processedData));
		// });
		// context.serviceSocket.on("close", () => {
		// 	if (context.proxySocket !== undefined) {
		// 		context.proxySocket.destroy();
		// 	}
		// });
		// context.serviceSocket.on("error", () => {
		// 	if (context.proxySocket !== undefined) {
		// 		context.proxySocket.destroy();
		// 	}
		// });
	}

	private parseServiceOptions(
		context: Context
	): net.TcpNetConnectOpts | tls.ConnectionOptions {
		const i = this.getServiceHostIndex(context.proxySocket);
		return Object.assign(
			{
				port: this.servicePorts[i],
				host: this.serviceHosts[i],
				localAddress: this.options.localAddress,
				localPort: this.options.localPort,
			},
			this.serviceTlsOptions
		);
	}

	private getServiceHostIndex(proxySocket: net.Socket | tls.TLSSocket): number {
		this.serviceHostIndex++;
		if (this.serviceHostIndex == this.serviceHosts.length) {
			this.serviceHostIndex = 0;
		}
		let index = this.serviceHostIndex;
		if (this.options.serviceHostSelected) {
			index = this.options.serviceHostSelected(proxySocket, index);
		}
		return index;
	}

	public end(): void {
		this.server?.close();
		for (const key in this.proxySockets) {
			this.proxySockets[key].destroy();
		}
		this.server?.unref();
	}

	private log(msg: string): void {
		if (!this.options.quiet) {
			console.log(msg);
		}
	}

	private intercept(
		interceptor: InterceptorFunction | undefined,
		context: Context,
		data: Buffer
	): Buffer | Promise<Buffer> {
		if (interceptor) {
			return interceptor(context, data);
		}
		return data;
	}

	private uniqueKey(socket: net.Socket | tls.TLSSocket): string {
		return `${socket.remoteAddress}:${socket.remotePort}`;
	}
}

export function createProxy(
	proxyPort: number,
	serviceHost: string | number | string[],
	servicePort: string | number | number[],
	options?: TcpProxyOptions
): TcpProxy {
	return new TcpProxy(proxyPort, serviceHost, servicePort, options);
}
