var ye=Object.create;var W=Object.defineProperty;var Se=Object.getOwnPropertyDescriptor;var Ce=Object.getOwnPropertyNames;var Be=Object.getPrototypeOf,xe=Object.prototype.hasOwnProperty;var Ee=(r,e)=>()=>(r&&(e=r(r=0)),e);var ve=(r,e)=>()=>(e||r((e={exports:{}}).exports,e),e.exports);var Te=(r,e,n,t)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of Ce(e))!xe.call(r,s)&&s!==n&&W(r,s,{get:()=>e[s],enumerable:!(t=Se(e,s))||t.enumerable});return r};var V=(r,e,n)=>(n=r!=null?ye(Be(r)):{},Te(e||!r||!r.__esModule?W(n,"default",{value:r,enumerable:!0}):n,r));import{createRequire as Ie}from"node:module";import Pe from"node:path";import Ne from"node:url";var h=Ee(()=>{"use strict";globalThis.require=Ie(import.meta.url);globalThis.__filename=Ne.fileURLToPath(import.meta.url);globalThis.__dirname=Pe.dirname(__filename)});var D=ve(v=>{h();(function(r,e){"use strict";typeof v=="object"?(r.slip=v,e(v)):typeof define=="function"&&define.amd?define(["exports"],function(n){return r.slip=n,r.slip,e(n)}):(r.slip={},e(r.slip))})(v,function(r){"use strict";var e=r;e.END=192,e.ESC=219,e.ESC_END=220,e.ESC_ESC=221,e.byteArray=function(t,s,o){return t instanceof ArrayBuffer?new Uint8Array(t,s,o):t},e.expandByteArray=function(t){var s=new Uint8Array(t.length*2);return s.set(t),s},e.sliceByteArray=function(t,s,o){var i=t.buffer.slice?t.buffer.slice(s,o):t.subarray(s,o);return new Uint8Array(i)},e.encode=function(t,s){s=s||{},s.bufferPadding=s.bufferPadding||4,t=e.byteArray(t,s.offset,s.byteLength);var o=t.length+s.bufferPadding+3&-4,i=new Uint8Array(o),c=1;i[0]=e.END;for(var f=0;f<t.length;f++){c>i.length-3&&(i=e.expandByteArray(i));var l=t[f];l===e.END?(i[c++]=e.ESC,l=e.ESC_END):l===e.ESC&&(i[c++]=e.ESC,l=e.ESC_ESC),i[c++]=l}return i[c]=e.END,e.sliceByteArray(i,0,c+1)},e.Decoder=function(t){t=typeof t!="function"?t||{}:{onMessage:t},this.maxMessageSize=t.maxMessageSize||10485760,this.bufferSize=t.bufferSize||1024,this.msgBuffer=new Uint8Array(this.bufferSize),this.msgBufferIdx=0,this.onMessage=t.onMessage,this.onError=t.onError,this.escape=!1};var n=e.Decoder.prototype;return n.decode=function(t){t=e.byteArray(t);for(var s,o=0;o<t.length;o++){var i=t[o];if(this.escape)i===e.ESC_ESC?i=e.ESC:i===e.ESC_END&&(i=e.END);else{if(i===e.ESC){this.escape=!0;continue}if(i===e.END){s=this.handleEnd();continue}}var c=this.addByte(i);c||this.handleMessageMaxError()}return s},n.handleMessageMaxError=function(){this.onError&&this.onError(this.msgBuffer.subarray(0),"The message is too large; the maximum message size is "+this.maxMessageSize/1024+"KB. Use a larger maxMessageSize if necessary."),this.msgBufferIdx=0,this.escape=!1},n.addByte=function(t){return this.msgBufferIdx>this.msgBuffer.length-1&&(this.msgBuffer=e.expandByteArray(this.msgBuffer)),this.msgBuffer[this.msgBufferIdx++]=t,this.escape=!1,this.msgBuffer.length<this.maxMessageSize},n.handleEnd=function(){if(this.msgBufferIdx!==0){var t=e.sliceByteArray(this.msgBuffer,0,this.msgBufferIdx);return this.onMessage&&this.onMessage(t),this.msgBufferIdx=0,t}},e})});h();h();h();var Z=(r=0)=>e=>`\x1B[${e+r}m`,J=(r=0)=>e=>`\x1B[${38+r};5;${e}m`,Q=(r=0)=>(e,n,t)=>`\x1B[${38+r};2;${e};${n};${t}m`,u={modifier:{reset:[0,0],bold:[1,22],dim:[2,22],italic:[3,23],underline:[4,24],overline:[53,55],inverse:[7,27],hidden:[8,28],strikethrough:[9,29]},color:{black:[30,39],red:[31,39],green:[32,39],yellow:[33,39],blue:[34,39],magenta:[35,39],cyan:[36,39],white:[37,39],blackBright:[90,39],gray:[90,39],grey:[90,39],redBright:[91,39],greenBright:[92,39],yellowBright:[93,39],blueBright:[94,39],magentaBright:[95,39],cyanBright:[96,39],whiteBright:[97,39]},bgColor:{bgBlack:[40,49],bgRed:[41,49],bgGreen:[42,49],bgYellow:[43,49],bgBlue:[44,49],bgMagenta:[45,49],bgCyan:[46,49],bgWhite:[47,49],bgBlackBright:[100,49],bgGray:[100,49],bgGrey:[100,49],bgRedBright:[101,49],bgGreenBright:[102,49],bgYellowBright:[103,49],bgBlueBright:[104,49],bgMagentaBright:[105,49],bgCyanBright:[106,49],bgWhiteBright:[107,49]}},nt=Object.keys(u.modifier),Oe=Object.keys(u.color),ke=Object.keys(u.bgColor),st=[...Oe,...ke];function Ae(){let r=new Map;for(let[e,n]of Object.entries(u)){for(let[t,s]of Object.entries(n))u[t]={open:`\x1B[${s[0]}m`,close:`\x1B[${s[1]}m`},n[t]=u[t],r.set(s[0],s[1]);Object.defineProperty(u,e,{value:n,enumerable:!1})}return Object.defineProperty(u,"codes",{value:r,enumerable:!1}),u.color.close="\x1B[39m",u.bgColor.close="\x1B[49m",u.color.ansi=Z(),u.color.ansi256=J(),u.color.ansi16m=Q(),u.bgColor.ansi=Z(10),u.bgColor.ansi256=J(10),u.bgColor.ansi16m=Q(10),Object.defineProperties(u,{rgbToAnsi256:{value(e,n,t){return e===n&&n===t?e<8?16:e>248?231:Math.round((e-8)/247*24)+232:16+36*Math.round(e/255*5)+6*Math.round(n/255*5)+Math.round(t/255*5)},enumerable:!1},hexToRgb:{value(e){let n=/[a-f\d]{6}|[a-f\d]{3}/i.exec(e.toString(16));if(!n)return[0,0,0];let[t]=n;t.length===3&&(t=[...t].map(o=>o+o).join(""));let s=Number.parseInt(t,16);return[s>>16&255,s>>8&255,s&255]},enumerable:!1},hexToAnsi256:{value:e=>u.rgbToAnsi256(...u.hexToRgb(e)),enumerable:!1},ansi256ToAnsi:{value(e){if(e<8)return 30+e;if(e<16)return 90+(e-8);let n,t,s;if(e>=232)n=((e-232)*10+8)/255,t=n,s=n;else{e-=16;let c=e%36;n=Math.floor(e/36)/5,t=Math.floor(c/6)/5,s=c%6/5}let o=Math.max(n,t,s)*2;if(o===0)return 30;let i=30+(Math.round(s)<<2|Math.round(t)<<1|Math.round(n));return o===2&&(i+=60),i},enumerable:!1},rgbToAnsi:{value:(e,n,t)=>u.ansi256ToAnsi(u.rgbToAnsi256(e,n,t)),enumerable:!1},hexToAnsi:{value:e=>u.ansi256ToAnsi(u.hexToAnsi256(e)),enumerable:!1}}),u}var we=Ae(),p=we;h();import _ from"node:process";import Re from"node:os";import X from"node:tty";function d(r,e=globalThis.Deno?globalThis.Deno.args:_.argv){let n=r.startsWith("-")?"":r.length===1?"-":"--",t=e.indexOf(n+r),s=e.indexOf("--");return t!==-1&&(s===-1||t<s)}var{env:a}=_,I;d("no-color")||d("no-colors")||d("color=false")||d("color=never")?I=0:(d("color")||d("colors")||d("color=true")||d("color=always"))&&(I=1);function Ue(){if("FORCE_COLOR"in a)return a.FORCE_COLOR==="true"?1:a.FORCE_COLOR==="false"?0:a.FORCE_COLOR.length===0?1:Math.min(Number.parseInt(a.FORCE_COLOR,10),3)}function Le(r){return r===0?!1:{level:r,hasBasic:!0,has256:r>=2,has16m:r>=3}}function Me(r,{streamIsTTY:e,sniffFlags:n=!0}={}){let t=Ue();t!==void 0&&(I=t);let s=n?I:t;if(s===0)return 0;if(n){if(d("color=16m")||d("color=full")||d("color=truecolor"))return 3;if(d("color=256"))return 2}if("TF_BUILD"in a&&"AGENT_NAME"in a)return 1;if(r&&!e&&s===void 0)return 0;let o=s||0;if(a.TERM==="dumb")return o;if(_.platform==="win32"){let i=Re.release().split(".");return Number(i[0])>=10&&Number(i[2])>=10586?Number(i[2])>=14931?3:2:1}if("CI"in a)return"GITHUB_ACTIONS"in a||"GITEA_ACTIONS"in a?3:["TRAVIS","CIRCLECI","APPVEYOR","GITLAB_CI","BUILDKITE","DRONE"].some(i=>i in a)||a.CI_NAME==="codeship"?1:o;if("TEAMCITY_VERSION"in a)return/^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(a.TEAMCITY_VERSION)?1:0;if(a.COLORTERM==="truecolor"||a.TERM==="xterm-kitty")return 3;if("TERM_PROGRAM"in a){let i=Number.parseInt((a.TERM_PROGRAM_VERSION||"").split(".")[0],10);switch(a.TERM_PROGRAM){case"iTerm.app":return i>=3?3:2;case"Apple_Terminal":return 2}}return/-256(color)?$/i.test(a.TERM)?2:/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(a.TERM)||"COLORTERM"in a?1:o}function ee(r,e={}){let n=Me(r,{streamIsTTY:r&&r.isTTY,...e});return Le(n)}var _e={stdout:ee({isTTY:X.isatty(1)}),stderr:ee({isTTY:X.isatty(2)})},te=_e;h();function re(r,e,n){let t=r.indexOf(e);if(t===-1)return r;let s=e.length,o=0,i="";do i+=r.slice(o,t)+e+n,o=t+s,t=r.indexOf(e,o);while(t!==-1);return i+=r.slice(o),i}function ne(r,e,n,t){let s=0,o="";do{let i=r[t-1]==="\r";o+=r.slice(s,i?t-1:t)+e+(i?`\r
`:`
`)+n,s=t+1,t=r.indexOf(`
`,s)}while(t!==-1);return o+=r.slice(s),o}var{stdout:se,stderr:oe}=te,F=Symbol("GENERATOR"),S=Symbol("STYLER"),x=Symbol("IS_EMPTY"),ie=["ansi","ansi","ansi256","ansi16m"],C=Object.create(null),Fe=(r,e={})=>{if(e.level&&!(Number.isInteger(e.level)&&e.level>=0&&e.level<=3))throw new Error("The `level` option should be an integer from 0 to 3");let n=se?se.level:0;r.level=e.level===void 0?n:e.level};var je=r=>{let e=(...n)=>n.join(" ");return Fe(e,r),Object.setPrototypeOf(e,E.prototype),e};function E(r){return je(r)}Object.setPrototypeOf(E.prototype,Function.prototype);for(let[r,e]of Object.entries(p))C[r]={get(){let n=P(this,$(e.open,e.close,this[S]),this[x]);return Object.defineProperty(this,r,{value:n}),n}};C.visible={get(){let r=P(this,this[S],!0);return Object.defineProperty(this,"visible",{value:r}),r}};var j=(r,e,n,...t)=>r==="rgb"?e==="ansi16m"?p[n].ansi16m(...t):e==="ansi256"?p[n].ansi256(p.rgbToAnsi256(...t)):p[n].ansi(p.rgbToAnsi(...t)):r==="hex"?j("rgb",e,n,...p.hexToRgb(...t)):p[n][r](...t),$e=["rgb","hex","ansi256"];for(let r of $e){C[r]={get(){let{level:n}=this;return function(...t){let s=$(j(r,ie[n],"color",...t),p.color.close,this[S]);return P(this,s,this[x])}}};let e="bg"+r[0].toUpperCase()+r.slice(1);C[e]={get(){let{level:n}=this;return function(...t){let s=$(j(r,ie[n],"bgColor",...t),p.bgColor.close,this[S]);return P(this,s,this[x])}}}}var De=Object.defineProperties(()=>{},{...C,level:{enumerable:!0,get(){return this[F].level},set(r){this[F].level=r}}}),$=(r,e,n)=>{let t,s;return n===void 0?(t=r,s=e):(t=n.openAll+r,s=e+n.closeAll),{open:r,close:e,openAll:t,closeAll:s,parent:n}},P=(r,e,n)=>{let t=(...s)=>qe(t,s.length===1?""+s[0]:s.join(" "));return Object.setPrototypeOf(t,De),t[F]=r,t[S]=e,t[x]=n,t},qe=(r,e)=>{if(r.level<=0||!e)return r[x]?"":e;let n=r[S];if(n===void 0)return e;let{openAll:t,closeAll:s}=n;if(e.includes("\x1B"))for(;n!==void 0;)e=re(e,n.close,n.open),n=n.parent;let o=e.indexOf(`
`);return o!==-1&&(e=ne(e,s,t,o)),t+e+s};Object.defineProperties(E.prototype,C);var He=E(),bt=E({level:oe?oe.level:0});var g=He;var de=V(D(),1);import{randomInt as Qe}from"crypto";import*as he from"fs";import*as U from"net";import*as pe from"tls";import*as me from"util";h();var ce=V(D(),1);import{randomInt as le}from"crypto";var q=192,H=219,Ge=220,Ke=221;function ze(r){let e=[q];for(let n of r)n===q?e.push(H,Ge):n===H?e.push(H,Ke):e.push(n);return e.push(q),Buffer.from(e)}function N(r){let e=r[0]>>4&15,n=(r[0]&15)*4,t=r.readUInt16BE(2),s=r[9],o=r.slice(12,16).join("."),i=r.slice(16,20).join(".");return{version:e,headerLength:n,totalLength:t,protocol:s,srcIP:o,dstIP:i,payload:r.slice(n,t)}}function O(r){let e=r.readUInt16BE(0),n=r.readUInt16BE(2),t=r.readUInt32BE(4),s=r.readUInt32BE(8),o=(r[12]>>4&15)*4,i=r[13],c=r.readUInt16BE(14);return{srcPort:e,dstPort:n,seqNumber:t,ackNumber:s,headerLength:o,flags:i,windowSize:c,payload:r.slice(o)}}function Ye(r){let e=0;for(let n=0;n<r.length;n+=2)e+=r.readUInt16BE(n);return e=(e>>16)+(e&65535),e+=e>>16,~e&65535}function k(r,e,n){let t=Buffer.alloc(12);r.split(".").forEach((i,c)=>{t[c]=parseInt(i)}),e.split(".").forEach((i,c)=>{t[4+c]=parseInt(i)}),t[8]=0,t[9]=6,t.writeUInt16BE(n.length,10);let s=Buffer.concat([t,n]),o=0;for(let i=0;i<s.length;i+=2)i===s.length-1?o+=s[i]<<8:o+=s.readUInt16BE(i);return o=(o>>16)+(o&65535),o+=o>>16,~o&65535}function A(r,e,n,t,s,o,i){let f=20+i.length,l=Buffer.alloc(f);return l.writeUInt16BE(e,0),l.writeUInt16BE(r,2),l.writeUInt32BE(n,4),l.writeUInt32BE(t,8),l[12]=20/4<<4,l[13]=s,l.writeUInt16BE(o,14),l.writeUInt16BE(0,16),l.writeUInt16BE(0,18),i.copy(l,20),l}function w(r,e,n,t){let o=20+t.length,i=Buffer.alloc(o);i[0]=69,i[1]=0,i.writeUInt16BE(o,2),i.writeUInt16BE(le(65536),4),i.writeUInt16BE(16384,6),i[8]=64,i[9]=n,i.writeUInt16BE(0,10),r.split(".").forEach((f,l)=>{i[12+l]=parseInt(f)}),e.split(".").forEach((f,l)=>{i[16+l]=parseInt(f)});let c=Ye(i.slice(0,20));return i.writeUInt16BE(c,10),t.copy(i,20),i}function R(r,e){K(r);let n=ze(r);e.serial_send_bytes(1,n)}async function ue(r,e,n,t,s){let i=le(4294967295),c=A(n,t,i,0,2,64240,Buffer.alloc(0)),f=k(r,e,c);c.writeUInt16BE(f,16);let l=w(r,e,6,c);R(l,s);let m=await Ve(s,r,e,n,t,i);return[i+1,m]}function We(r){return["FIN","SYN","RST","PSH","ACK","URG","ECE","CWR"].filter((n,t)=>r>>t&1)}function Ve(r,e,n,t,s,o){return new Promise((i,c)=>{let f=new ce.default.Decoder({maxMessageSize:209715200,bufferSize:2048,onMessage:m=>{let b=N(Buffer.from(m));if(b.protocol===6){let y=O(b.payload);if(y.flags===18&&y.ackNumber===o+1){let B=A(t,s,o+1,y.seqNumber+1,16,64240,Buffer.alloc(0)),L=k(e,n,B);B.writeUInt16BE(L,16);let M=w(e,n,6,B);R(M,r),r.remove_listener("serial1-output-byte",l),i(y.seqNumber+1)}}}}),l=m=>{f.decode(Buffer.from([m]))};r.add_listener("serial1-output-byte",l),setTimeout(()=>{r.remove_listener("serial1-output-byte",l),c(new Error("Timeout waiting for SYN/ACK"))},3e4)})}async function ae(r,e,n,t,s,o,i,c){let l=A(n,t,s,o,24,64240,c),m=k(r,e,l);l.writeUInt16BE(m,16);let b=w(r,e,6,l);R(b,i)}var Ze=16;function Je(r,e,n,t,s=64240){return A(e,r,n,t,Ze,s,Buffer.alloc(0))}function fe(r,e,n,t,s,o,i){let c=Je(n,t,s,o,64240),f=k(r,e,c);c.writeUInt16BE(f,16);let l=w(r,e,6,c);return R(l,i),o}function G(r,e){return r.padEnd(e)}function T(r,e){return r.padStart(e)}function K(r){if(!process.env.DEBUG)return;let e=N(r),{srcIP:n,dstIP:t}=e,s=n==="10.0.0.1"?g.green(n):g.red(n),o=t==="10.0.0.1"?g.green(t):g.red(t),i=O(e.payload),{srcPort:c,dstPort:f,seqNumber:l,ackNumber:m,flags:b,windowSize:y}=i,Y=`${G(s,16)} -> ${G(o,16)}`,B=`TCP ${T(c.toString(),5)} -> ${T(f.toString(),5)}`,L=`[${G(We(b).join(", "),20)}]`,M=`Seq=${T(l.toString(),10)}`,ge=`Ack=${T(m.toString(),10)}`,be=`Win=${T(y.toString(),5)}`;console.log(`${Y} ${B} ${L} ${M} ${ge} ${be}`)}var z=class{proxyPort;serviceHosts;servicePorts;serviceHostIndex;options;proxyTlsOptions;serviceTlsOptions;proxySockets;users;allowedIPs;server=null;emulator;constructor(e,n,t,s,o){this.emulator=s,this.proxyPort=e,this.serviceHosts=this.parse(n),this.servicePorts=this.parse(t).map(Number),this.serviceHostIndex=-1,this.options=this.parseOptions(o),this.proxyTlsOptions={passphrase:this.options.passphrase,secureProtocol:"TLSv1_2_method"},this.options.tls&&(this.proxyTlsOptions.pfx=he.readFileSync(this.options.pfx)),this.serviceTlsOptions={rejectUnauthorized:this.options.rejectUnauthorized,secureProtocol:"TLSv1_2_method"},this.proxySockets={},this.options.identUsers.length!==0?(this.users=this.options.identUsers,this.log(`Will only allow these users: ${this.users.join(", ")}`)):this.log("Will allow all users"),this.options.allowedIPs.length!==0&&(this.allowedIPs=this.options.allowedIPs),this.createListener()}parse(e){if(typeof e=="string")return e.split(",");if(typeof e=="number")return this.parse(e.toString());if(Array.isArray(e))return e;throw new Error("cannot parse object: "+e)}parseOptions(e){return Object.assign({quiet:!0,pfx:void 0,passphrase:"abcd",rejectUnauthorized:!0,identUsers:[],allowedIPs:[],tls:!1,hostname:void 0,customTlsOptions:void 0,localAddress:void 0,localPort:void 0,upstream:void 0,downstream:void 0,serviceHostSelected:void 0},e||{})}createListener(){this.options.tls?this.server=pe.createServer(this.options.customTlsOptions||this.proxyTlsOptions,e=>{this.handleClientConnection(e)}):this.server=U.createServer(e=>{this.handleClientConnection(e)}),this.server.listen(this.proxyPort,this.options.hostname)}handleClientConnection(e){this.users?this.handleAuth(e):this.handleClient(e)}handleAuth(e){if(this.allowedIPs?.includes(e.remoteAddress)){this.handleClient(e);return}let n=me.format("%d, %d",e.remotePort,this.proxyPort),t=new U.Socket,s;t.on("error",()=>{s=void 0,t.destroy()}),t.on("data",o=>{s=o.toString().trim(),t.destroy()}),t.on("close",()=>{if(!s){this.log("No identd"),e.destroy();return}let o=s.split(":").pop();this.users?.includes(o)?this.handleClient(e):(this.log(`User "${o}" unauthorized`),e.destroy())}),t.connect(113,e.remoteAddress,()=>{t.write(n),t.end()})}async handleClient(e){let n=this.uniqueKey(e);this.proxySockets[n]=e;let t={buffers:[],connected:!1,sequenceNumber:0,ackNumber:0,srcPort:Qe(1024,65535),proxySocket:e};this.createServiceSocket(t),[t.sequenceNumber,t.ackNumber]=await ue("10.0.0.2","10.0.0.1",3306,t.srcPort,this.emulator),e.on("data",async s=>{await this.handleUpstreamData(t,s)}),e.on("close",()=>{delete this.proxySockets[this.uniqueKey(e)],t.serviceSocket!==void 0&&t.serviceSocket.destroy()}),e.on("error",()=>{t.serviceSocket!==void 0&&t.serviceSocket.destroy()})}async handleUpstreamData(e,n){let s=[];if(n.length>768)for(let o=0;o<n.length;o+=768)s.push(n.slice(o,o+768));else s.push(n);for(let o=0;o<s.length;o++){let i=s[o];await ae("10.0.0.2","10.0.0.1",3306,e.srcPort,e.sequenceNumber,e.ackNumber,this.emulator,i),i.length>0&&(e.sequenceNumber+=i.length,Number.isFinite(e.sequenceNumber)||(e.sequenceNumber=0),process.env.DEBUG&&(s.length>1?console.log(g.bold(`Sending ${i.length} bytes (chunk ${o+1}/${s.length})`)):console.log(g.bold(`Sending ${i.length} bytes`))))}}createServiceSocket(e){let n=new de.default.Decoder({onError:t=>{console.error("error:",t)},onMessage:t=>{K(Buffer.from(t));let s=N(Buffer.from(t));if(s.protocol===6){let o=O(s.payload);if(o.dstPort!==e.srcPort)return;e.ackNumber=o.seqNumber+o.payload.length,e.proxySocket.write(o.payload),o.payload.length>0&&fe("10.0.0.2","10.0.0.1",e.srcPort,3306,e.sequenceNumber,e.ackNumber,this.emulator),o.flags&16&&(e.sequenceNumber=Math.max(e.sequenceNumber,o.ackNumber))}}});this.emulator.add_listener("serial1-output-byte",t=>{n.decode(Buffer.from([t]))})}parseServiceOptions(e){let n=this.getServiceHostIndex(e.proxySocket);return Object.assign({port:this.servicePorts[n],host:this.serviceHosts[n],localAddress:this.options.localAddress,localPort:this.options.localPort},this.serviceTlsOptions)}getServiceHostIndex(e){this.serviceHostIndex++,this.serviceHostIndex==this.serviceHosts.length&&(this.serviceHostIndex=0);let n=this.serviceHostIndex;return this.options.serviceHostSelected&&(n=this.options.serviceHostSelected(e,n)),n}end(){this.server?.close();for(let e in this.proxySockets)this.proxySockets[e].destroy();this.server?.unref()}log(e){this.options.quiet||console.log(e)}intercept(e,n,t){return e?e(n,t):t}uniqueKey(e){return`${e.remoteAddress}:${e.remotePort}`}};function Ot(r,e,n,t){return new z(r,e,n,t)}export{z as TcpProxy,Ot as createProxy};