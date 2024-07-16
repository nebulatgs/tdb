import { createServer } from "net";

export function checkPort(port: number) {
	return new Promise<boolean>((resolve, reject) => {
		const server = createServer()
			.once("error", (err: Error & { code: string }) => {
				if (err.code != "EADDRINUSE") {
					reject(err);
					return;
				}
				resolve(true);
			})
			.once("listening", function () {
				server
					.once("close", function () {
						resolve(false);
					})
					.close();
			})
			.listen(port, "127.0.0.1");
	});
}
