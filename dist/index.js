import{createRequire as m}from"node:module";import a from"node:path";import n from"node:url";globalThis.require=m(import.meta.url);globalThis.__filename=n.fileURLToPath(import.meta.url);globalThis.__dirname=a.dirname(__filename);import{dirname as s,resolve as l}from"@discordx/importer";import{Clerc as p,completionsPlugin as c,helpPlugin as d,notFoundPlugin as u}from"clerc";import{existsSync as f}from"fs";import{ensureDir as i}from"fs-extra";import{homedir as h}from"os";import r from"path";var P=await l(`${s(import.meta.url)}/commands/*.{ts,js}`),_=r.join(h(),".tdb"),e=r.join(_,"data"),D=r.join(e,"mysql"),g=r.join(e,"postgres");if(!f(e))throw new Error("Data directory does not exist. Please run the `postinstall` script.");await Promise.all([i(D),i(g)]);var x=await Promise.all(P.map(async o=>{let{command:t}=await import(o);return t}));function M(){let o=p.create().scriptName("tdb").description("Temporary databases in WASM.").version("0.0.4-alpha").use(c()).use(d()).use(u());for(let t of x)o=o.command(t);o.parse()}export{_ as APP_DIR,e as DATA_DIR,D as MYSQL_DIR,g as POSTGRES_DIR,M as run};
