import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const base='https://deploy.deepspacesites.com';
const credential=JSON.parse(await fs.readFile('.nightwatch-credential.json','utf8'));
async function request(route,body){const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+credential.token},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});const d=await r.json();if(!r.ok)throw Error(JSON.stringify(d));return d;}
if(process.argv[2]==='poll'){
 const job=JSON.parse(await fs.readFile('sdk-job.json','utf8'));const d=await request(job.statusUrl);await fs.writeFile('sdk-job-result.json',JSON.stringify(d,null,2));if(d.status==='published')await fs.writeFile('published.json',JSON.stringify(d,null,2));console.log(JSON.stringify(d,null,2));
}else{
 const r=await fetch(base+'/api/publish/auth/token',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+credential.credential.trim().replace(/\s+/g,'-')},body:'{}',signal:AbortSignal.timeout(20000)});const auth=await r.json();if(!r.ok)throw Error(JSON.stringify(auth));credential.token=auth.token;await fs.writeFile('.nightwatch-credential.json',JSON.stringify(credential));
 const prior=JSON.parse(await fs.readFile('published.json','utf8'));const files={};
 async function walk(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){if(['node_modules','.git','dist','.agents'].includes(item.name))continue;const file=path.join(dir,item.name);if(item.isDirectory())await walk(file);else files[path.relative('sdk',file).replaceAll('\\','/')]=await fs.readFile(file,'utf8');}}
 await walk('sdk');
 const source=await request('/api/publish/apps/'+prior.appId+'/source?summary=1');
 const result=await request('/api/publish',{appId:prior.appId,name:prior.name,expectedRevision:source.revision,idempotencyKey:crypto.randomUUID(),files});await fs.writeFile('sdk-job.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}
