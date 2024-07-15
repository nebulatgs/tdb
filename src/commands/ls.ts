import { defineCommand } from "clerc";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const command = defineCommand(
	{
		name: "ls",
		description: "test",
		flags: {},
		parameters: [],
	},
	(context) => {
		console.log("I live in", dirname);
	}
);
