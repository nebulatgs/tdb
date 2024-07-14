import { PGlite } from "@electric-sql/pglite";
import { Command } from "@oclif/core";
import { createServer } from "pglite-server";

export default class TDB extends Command {
	public async run() {
		const db = new PGlite("data");
		await db.waitReady;

		await db.exec(`
  create table if not exists test (id serial primary key, name text);
  insert into test (name) values ('foo'), ('bar'), ('baz');
`);

		const PORT = 5432;
		const pgServer = createServer(db);

		pgServer.listen(PORT, () => {
			console.log(`Server bound to port ${PORT}`);
		});
	}
}
