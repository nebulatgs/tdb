import{createRequire as c}from"node:module";import g from"node:path";import d from"node:url";globalThis.require=c(import.meta.url);globalThis.__filename=d.fileURLToPath(import.meta.url);globalThis.__dirname=g.dirname(__filename);import{PGlite as R}from"@electric-sql/pglite";import r from"chalk";import{defineCommand as D}from"clerc";import{existsSync as _}from"fs";import f from"path";import{createServer as L,LogLevel as T}from"pglite-server";import{dirname as u,resolve as P}from"@discordx/importer";import{Clerc as k,completionsPlugin as G,helpPlugin as M,notFoundPlugin as Q}from"clerc";import{existsSync as h}from"fs";import{ensureDir as m}from"fs-extra";import{homedir as S}from"os";import s from"path";var b=await P(`${u(import.meta.url)}/commands/*.{ts,js}`),v=s.join(S(),".tdb"),i=s.join(v,"data"),w=s.join(i,"mysql"),a=s.join(i,"postgres");if(!h(i))throw new Error("Data directory does not exist. Please run the `postinstall` script.");await Promise.all([m(w),m(a)]);var B=await Promise.all(b.map(async o=>{let{command:e}=await import(o);return e}));import{createServer as y}from"net";function p(o){return new Promise((e,t)=>{let n=y().once("error",l=>{if(l.code!="EADDRINUSE"){t(l);return}e(!0)}).once("listening",function(){n.once("close",function(){e(!1)}).close()}).listen(o,"127.0.0.1")})}function $(o){if(o)return`file://${f.join(a,`${o}`)}`}var ro=D({name:"postgres",description:"Launch a PostgreSQL instance",alias:"pg",flags:{port:{type:Number,alias:"p",default:5432,description:"Port to launch PostgreSQL on"},logs:{type:Boolean,alias:"l",default:!1,description:"Show PostgreSQL logs"},save:{type:String,alias:"s",default:null,description:"Save state with a given name"}},parameters:[]},async o=>{for(;await p(o.flags.port);)console.log(`Port ${r.bold(o.flags.port)} is already in use. Trying ${r.bold(++o.flags.port)}...`);let e=o.flags.save&&!!_(f.join(a,`${o.flags.save}`));console.log(e?`Restoring state from ${r.bold(o.flags.save)}`:"Loading blank instance");let t=new R($(o.flags.save),{debug:o.flags.logs?1:0});await t.waitReady,L(t,{logLevel:o.flags.logs?T.Info:void 0}).listen(o.flags.port,()=>{console.log(`Instance is ready on port ${r.bold(o.flags.port)}`),o.flags.save?console.log(`Persisting state to ${r.bold(o.flags.save)}`):console.log(`${r.bold("Note:")} This instance is temporary and will be lost on exit.`)})});export{ro as command};
