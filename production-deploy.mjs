// Publishes a verified CI artifact using the official CLI's asset-plan/form protocol.
// Authentication remains local. No production credential is sent to GitHub Actions.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const origin='https://deploy-worker.deep.space';
const authFile='.production-account.private.json';
const account=JSON.parse(await fs.readFile(authFile,'utf8'));
const app=JSON.parse(await fs.readFile('production-app.json','utf8'));
const root=path.resolve(process.argv[2]||'test-artifacts/production-build');
const workerDir=path.join(root,'dist/nightwatch_meridian');
const config=JSON.parse(await fs.readFile(path.join(workerDir,'wrangler.json'),'utf8'));
if(config.vars.DEEPSPACE_APP_ID!==app.appId)throw Error('CI build belongs to a different app ID.');
const fresh=await fetch('https://auth.deep.space/api/auth/token',{method:'POST',headers:{Cookie:'__Secure-better-auth.session_token='+encodeURIComponent(account.sessionToken),Origin:'https://auth.deep.space'},signal:AbortSignal.timeout(15000)});
if(!fresh.ok)throw Error('Your production session needs a new sign-in.');account.jwt=(await fresh.json()).token;await fs.writeFile(authFile,JSON.stringify(account));
async function call(route,body,method='POST',type='application/json'){
 const r=await fetch(origin+route,{method,headers:{Authorization:'Bearer '+account.jwt,...(type?{'Content-Type':type}:{})},body:type==='application/json'?JSON.stringify(body):body,signal:AbortSignal.timeout(240000)});const d=await r.json();if(!r.ok||d.success===false)throw Error(JSON.stringify({status:r.status,...d}));return d;
}
const assets=[];
async function walk(dir,fn){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p,fn);else await fn(p)}}
const clientDir=path.join(root,'dist/client');const assetConfig={};
await walk(clientDir,async file=>{const relative=path.relative(clientDir,file).replaceAll('\\','/');if(['_headers','_redirects'].includes(relative)){assetConfig[relative]=await fs.readFile(file,'utf8');return}const bytes=await fs.readFile(file);assets.push({path:'/'+relative,hash:crypto.createHash('sha256').update(bytes).digest('hex'),size:bytes.length,bytes})});
const plan=await call('/api/deploy/'+app.appId+'/asset-plan',{assets:assets.map(({hash,size})=>({hash,size}))});
const missing=new Set(plan.missing||[]);await Promise.all(assets.filter(a=>missing.has(a.hash)).map(a=>call('/api/deploy/'+app.appId+'/assets/'+a.hash,a.bytes,'PUT','application/octet-stream')));
const modules=[];await walk(workerDir,async file=>{if(/\.(m?js)$/.test(file))modules.push({name:path.relative(workerDir,file).replaceAll('\\','/'),content:await fs.readFile(file,'utf8')})});
const form=new FormData();const main=modules.find(m=>m.name===config.main);if(!main)throw Error('Worker main missing');
form.append('worker',new Blob([main.content],{type:'application/javascript+module'}),main.name);form.append('workerMain',main.name);
const other=modules.filter(m=>m!==main);if(other.length){form.append('workerModules',JSON.stringify(other.map(m=>m.name)));for(const m of other)form.append('workerModule',new Blob([m.content],{type:'application/javascript+module'}),m.name)}
form.append('assetManifest',JSON.stringify(assets.map(({path,hash,size})=>({path,hash,size}))));form.append('assetConfig',JSON.stringify(assetConfig));
const sqlite=new Set(config.migrations.flatMap(m=>m.new_sqlite_classes||[]));form.append('doManifest',JSON.stringify(config.durable_objects.bindings.map(b=>({binding:b.name,className:b.class_name,sqlite:sqlite.has(b.class_name)}))));
form.append('appMigrations',await fs.readFile('sdk/deepspace.migrations.json','utf8'));form.append('compatibilityDate',config.compatibility_date);form.append('compatibilityFlags',JSON.stringify(config.compatibility_flags));form.append('notFoundHandling',config.assets.not_found_handling);
form.append('name',config.name);form.append('secretsConfig','default');form.append('observedRepository','Adhi7783/Nightwatch');form.append('sourceDirty','false');
const artifactHash=crypto.createHash('sha256').update(modules.map(m=>m.name+'\n'+m.content).join('\n')+assets.map(a=>a.hash).join('')).digest('hex');
let state;try{state=JSON.parse(await fs.readFile('production-deploy-state.json','utf8'))}catch(e){if(e.code!=='ENOENT')throw e;}
if(!state||state.artifactHash!==artifactHash){state={deployKey:crypto.randomUUID(),artifactHash};await fs.writeFile('production-deploy-state.json',JSON.stringify(state))}
form.append('deployKey',state.deployKey);
const result=await call('/api/deploy/'+app.appId,form,'POST',null);await fs.writeFile('production-published.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({success:result.success,url:result.url,appId:app.appId,releaseId:result.releaseId,assets:assets.length,modules:modules.length}));
