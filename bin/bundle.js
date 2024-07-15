import { build } from "esbuild";

await build({
	bundle: true,
	entryPoints: ["./src/**/*.ts"],
	inject: ["./bin/cjs-shims.js"],
	// Mark shelljs as an external dependency. Plugin-plugins v5 removes the shelljs dependency so we can remove
	// this once that's been released.
	external: ["./capstone-x86.min.js", "./libwabt.js"],
	format: "esm",
	loader: { ".node": "copy" },
	outdir: "./dist",
	platform: "node",
	plugins: [],
	splitting: true,
	treeShaking: true,
});
