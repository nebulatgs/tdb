import{createRequire as r}from"node:module";import e from"node:path";import i from"node:url";globalThis.require=r(import.meta.url);globalThis.__filename=i.fileURLToPath(import.meta.url);globalThis.__dirname=e.dirname(__filename);