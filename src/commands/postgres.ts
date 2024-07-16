import { PGlite } from "@electric-sql/pglite";
import chalk from "chalk";
import { defineCommand } from "clerc";
import { existsSync } from "fs";
import path from "path";
import { createServer, LogLevel } from "pglite-server";
import { POSTGRES_DIR } from "src";
import { checkPort } from "src/checkPort";

function getPGStatePath(name?: string | null) {
	if (!name) {
		return undefined;
	}
	return `file://${path.join(POSTGRES_DIR, `${name}`)}`;
}

export const command = defineCommand(
	{
		name: "postgres",
		description: "Launch a PostgreSQL instance",
		alias: "pg",
		flags: {
			port: {
				type: Number,
				alias: "p",
				default: 5432,
				description: "Port to launch PostgreSQL on",
			},

			logs: {
				type: Boolean,
				alias: "l",
				default: false,
				description: "Show PostgreSQL logs",
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
		while (await checkPort(context.flags.port)) {
			console.log(
				`Port ${chalk.bold(
					context.flags.port
				)} is already in use. Trying ${chalk.bold(++context.flags.port)}...`
			);
		}
		const stateExists =
			context.flags.save &&
			!!existsSync(path.join(POSTGRES_DIR, `${context.flags.save}`));

		if (stateExists) {
			console.log(`Restoring state from ${chalk.bold(context.flags.save)}`);
		} else {
			console.log(`Loading blank instance`);
		}

		const db = new PGlite(getPGStatePath(context.flags.save), {
			debug: context.flags.logs ? 1 : 0,
		});
		await db.waitReady;

		const pgServer = createServer(db, {
			logLevel: context.flags.logs ? LogLevel.Info : undefined,
		});

		pgServer.listen(context.flags.port, () => {
			console.log(
				`Instance is ready on port ${chalk.bold(context.flags.port)}`
			);
			console.log(`Persisting state to ${chalk.bold(context.flags.save)}`);
		});
	}
);
