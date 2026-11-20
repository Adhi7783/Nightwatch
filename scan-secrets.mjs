import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const secrets=[];
for(const file of ['.nightwatch-credential.json','.production-account.private.json','.test-users.private.json']){
 if(!fs.existsSync(file))continue;
 const collect=value=>{if(!value||typeof value!=='object')return;for(const [k,v]of Object.entries(value)){if(['jwt','token','sessionToken','password','credential','cookie'].includes(k)&&typeof v==='string'&&v.length>12)secrets.push(v);else if(typeof v==='object')collect(v)}};
 collect(JSON.parse(fs.readFileSync(file,'utf8')));
}
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const found=[];for(const file of files){const text=fs.readFileSync(file,'utf8');if(secrets.some(s=>text.includes(s)))found.push(file)}
if(found.length)throw Error('Private credential values found in tracked files: '+found.join(', '));
console.log('PASS: '+files.length+' tracked files checked against current private credentials; no matches.');
