import { build } from "esbuild";

await build({
	bundle: true,
	minify: true,
	entryPoints: ["./src/**/*.ts"],
	inject: ["./bin/cjs-shims.js"],
	external: [
		"./capstone-x86.min.js",
		"./libwabt.js",
		"@clerc/plugin-help",
		"@clerc/plugin-not-found",
		"@clerc/plugin-version",
		"@discordx/importer",
		"@electric-sql/pglite",
		"chalk",
		"clerc",
		"fs-extra",
		"ip-packet",
		"pglite-server",
		"slip",
		"slip-ts",
		"tar",
		"xz-decompress",
	],
	format: "esm",
	loader: { ".node": "copy" },
	outdir: "./dist",
	platform: "node",
	plugins: [],
	splitting: false,
	treeShaking: true,
	nodePaths: ["./node_modules"],
});
