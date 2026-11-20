// PKCE flow from the official deepspace@0.44.1 CLI (auth login).
// The user completes OAuth in their browser. Never print tokens or passwords.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const auth='https://auth.deep.space';
if(process.argv[2]==='start'){
 const verifier=crypto.randomBytes(32).toString('base64url');
 const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
 const r=await fetch(auth+'/api/auth/cli/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code_challenge:challenge}),signal:AbortSignal.timeout(15000)});
 const d=await r.json();if(!r.ok||!d.sessionId||!d.loginUrl)throw Error('Production OAuth session could not be created: HTTP '+r.status);
 await fs.writeFile('.production-login.private.json',JSON.stringify({...d,verifier}));console.log(JSON.stringify({loginUrl:d.loginUrl}));
}else{
 const s=JSON.parse(await fs.readFile('.production-login.private.json','utf8'));
 const r=await fetch(auth+'/api/auth/cli/status/'+s.sessionId,{headers:{'x-code-verifier':s.verifier},signal:AbortSignal.timeout(15000)});
 if(!r.ok){console.log(JSON.stringify({status:r.status,state:'not-complete'}));process.exit(0)}
 const d=await r.json();if(d.state==='complete'&&d.sessionToken&&d.jwt){await fs.writeFile('.production-account.private.json',JSON.stringify(d));console.log(JSON.stringify({state:'complete',name:d.name||null}));}else console.log(JSON.stringify({state:d.state}));
}
