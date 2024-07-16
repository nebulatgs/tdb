import { build } from "esbuild";

await build({
	bundle: true,
	minify: true,
	entryPoints: ["./src/**/*.ts"],
	inject: ["./bin/cjs-shims.js"],
	external: ["./capstone-x86.min.js", "./libwabt.js", "@electric-sql/pglite"],
	format: "esm",
	loader: { ".node": "copy" },
	outdir: "./dist",
	platform: "node",
	plugins: [],
	splitting: false,
	treeShaking: true,
	nodePaths: ["./node_modules"],
});
