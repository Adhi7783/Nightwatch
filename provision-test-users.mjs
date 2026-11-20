// Uses the official CLI test-account service contract. Credentials remain ignored.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const auth='https://auth.deep.space';
const account=JSON.parse(await fs.readFile('.production-account.private.json','utf8'));
const headers={Cookie:'__Secure-better-auth.session_token='+encodeURIComponent(account.sessionToken),Origin:auth,'Content-Type':'application/json'};
let stored=[];try{stored=JSON.parse(await fs.readFile('.test-users.private.json','utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
const pool=await fetch(auth+'/api/auth/test-accounts',{headers,signal:AbortSignal.timeout(15000)});const inventory=await pool.json();if(!pool.ok)throw Error(JSON.stringify(inventory));
console.log(JSON.stringify({existingAccountCount:inventory.accounts.length,localUsableCount:stored.length}));
if(inventory.accounts.length>0&&stored.length===0)throw Error('Existing developer fixture accounts found; recover their credentials with the official CLI rather than creating a duplicate pool.');
for(let i=stored.length;i<3;i++){
 const name=['Nightwatch Host','Nightwatch Partner','Nightwatch Outsider'][i];const email='investigator-'+crypto.randomBytes(6).toString('hex')+'@deepspace.test';const password=crypto.randomBytes(24).toString('base64url');
 const r=await fetch(auth+'/api/auth/test-accounts',{method:'POST',headers,body:JSON.stringify({email,password,name,label:'Nightwatch brief-alignment test'}),signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok)throw Error(JSON.stringify(d));stored.push({...d,password,name});await fs.writeFile('.test-users.private.json',JSON.stringify(stored));
}
console.log('Three real test accounts are available; credentials saved privately.');
