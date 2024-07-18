import { writeFile } from "fs/promises";
import path from "path";
import { MYSQL_DIR } from "src";
import { TcpProxy } from "./tcp_proxy";

export function waitForSerialLine(emulator: any, line: string, tty: number) {
	return new Promise<void>((resolve) => {
		let buffer = "";
		const listener = (byte: number) => {
			const chr = String.fromCharCode(byte);
			if (chr === "\n") {
				buffer = "";
			}
			buffer += chr;

			if (buffer.includes(line)) {
				buffer = "";
				emulator.remove_listener(`serial${tty}-output-byte`, listener);
				resolve();
			}
		};
		emulator.add_listener(`serial${tty}-output-byte`, listener);
	});
}

export async function waitForPrompt(emulator: any) {
	await waitForSerialLine(emulator, "localhost:~#", 0);
}

export async function waitForMySQLPrompt(
	emulator: any,
	database: string = "(none)"
) {
	await waitForSerialLine(emulator, `MariaDB [${database}]>`, 1);
}

export async function setupBlankState(emulator: any) {
	await waitForPrompt(emulator);
	await setupMySQL(emulator);
	await networkUp(emulator);

	const state = (await emulator.save_state()) as ArrayBuffer;
	await writeFile(path.join(MYSQL_DIR, "/blank.state"), Buffer.from(state));
}

export async function networkUp(emulator: any) {
	emulator.serial0_send("ip link set lo up\n");
	await waitForPrompt(emulator);
}

export async function initializeMySQLNetworking(port: number, emulator: any) {
	emulator.serial0_send("slattach -v -L -s 115200 -p slip /dev/ttyS1   &\n");
	await waitForPrompt(emulator);
	emulator.serial0_send("sysctl -w net.ipv4.ip_forward=1\n");
	await waitForPrompt(emulator);
	emulator.serial0_send("ip addr add 10.0.0.1 peer 10.0.0.2 dev sl0\n");
	await waitForPrompt(emulator);
	emulator.serial0_send("ip link set sl0 up\n");
	await waitForPrompt(emulator);
	emulator.serial0_send("ip route add default via 10.0.0.1 dev sl0\n");
	await waitForPrompt(emulator);
	// Port is now forwarded to /dev/ttyS3 (UART3)
}

export async function startMySQLForwarding(port: number, emulator: any) {
	return new TcpProxy(port, "127.0.0.1", 3306, emulator, {
		hostname: "127.0.0.1",
	});
}

export async function setupMySQL(emulator: any) {
	emulator.serial0_send("chown mysql:mysql /run/mysqld\n");
	await waitForPrompt(emulator);
	emulator.serial0_send("echo '10.0.0.2 mysql' >> /etc/hosts\n");
	await waitForPrompt(emulator);
	if (process.env.DEBUG) {
		emulator.serial0_send(
			"mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql\n"
		);
	} else {
		emulator.serial0_send(
			"mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql > /dev/ttyS2\n"
		);
	}
	await waitForPrompt(emulator);
}

export async function startMySQL(emulator: any) {
	emulator.serial0_send(
		`setsid sh -c 'su mysql -c mysqld -s /bin/ash <> /dev/ttyS2 >&0 2>&1'\n`
	);
	await waitForPrompt(emulator);
	await waitForSerialLine(emulator, "Alpine Linux", 2);
	emulator.serial0_send(
		`mysql -uroot mysql -padmin -e "GRANT ALL PRIVILEGES ON *.* TO 'root'@'10.0.0.%' IDENTIFIED BY 'admin' WITH GRANT OPTION"\n\n`
	);
	await waitForPrompt(emulator);
	emulator.serial0_send(
		`mysql -uroot mysql -padmin -e "SET character_set_server = 'utf8mb4';"\n\n`
	);
	await waitForPrompt(emulator);
	emulator.serial0_send(
		`mysql -uroot mysql -padmin -e "SET collation_server = 'utf8mb4_unicode_ci';"\n\n`
	);
	emulator.serial0_send(
		`mysql -uroot mysql -padmin -e "ALTER DATABASE test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"\n\n`
	);
	await waitForPrompt(emulator);
}

export async function startMySQLShell(emulator: any) {
	emulator.serial0_send(
		`setsid sh -c 'su mysql -c mysql <> /dev/ttyS1 >&0 2>&1'\n`
	);
	await waitForPrompt(emulator);
}
