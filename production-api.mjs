import fs from 'node:fs/promises';
const file='.production-account.private.json';
const account=JSON.parse(await fs.readFile(file,'utf8'));
export async function request(origin,route,body,method=body?'POST':'GET'){
 const r=await fetch(origin+route,{method,headers:{Authorization:'Bearer '+account.jwt,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});const d=await r.json();if(!r.ok)throw Error(JSON.stringify({status:r.status,...d}));return d;
}
if(process.argv[2]==='init'){
 const deploy='https://deploy-worker.deep.space';
 try{const d=JSON.parse(await fs.readFile('production-app.json','utf8'));console.log(JSON.stringify(d));}catch(e){if(e.code!=='ENOENT')throw e;
  await request('https://api-worker.deep.space','/api/users/me');
  const id=await request(deploy,'/api/apps/mint',{});await fs.writeFile('production-app.json',JSON.stringify(id,null,2));
  const old=await fs.readFile('sdk/wrangler.toml','utf8');await fs.writeFile('sdk/wrangler.staging.toml',old);
  const updated=old.replace('app_01M7VVHN85TXZEGE37Z4BVGK4V',id.appId);await fs.writeFile('sdk/wrangler.toml',updated);
  console.log(JSON.stringify({appId:id.appId,plane:'production',source:'unclaimed until first GitHub deploy'}));
 }
}
