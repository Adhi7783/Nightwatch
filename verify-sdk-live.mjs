import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {socketClient} from './test-tools/live-socket.mjs';
const base='https://nightwatch-meridian.app.space';
const auth='https://auth.deep.space';
const users=JSON.parse(await fs.readFile('.test-users.private.json','utf8'));
for(const user of users){
 if(user.jwt&&user.jwtSaved>Date.now()-600000)continue;
 const r=await fetch(auth+'/api/auth/sign-in/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:auth},body:JSON.stringify({email:user.email,password:user.password}),redirect:'manual',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Test account sign-in failed: '+r.status);
 const cookie=r.headers.get('set-cookie')?.match(/__Secure-better-auth\.session_token=([^;]+)/)?.[0];if(!cookie)throw Error('No test session cookie');user.cookie=cookie;
 const t=await fetch(auth+'/api/auth/token',{method:'POST',headers:{Cookie:cookie,Origin:auth},signal:AbortSignal.timeout(15000)});if(!t.ok)throw Error('No platform JWT for fixture');user.jwt=(await t.json()).token;user.jwtSaved=Date.now();
}
await fs.writeFile('.test-users.private.json',JSON.stringify(users));
async function api(user,action,body,code,headers={}){
 const url=new URL('/api/nightwatch/'+action,base);if(code)url.searchParams.set('code',code);
 const r=await fetch(url,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+(user?.jwt||''),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify({requestId:crypto.randomUUID(),...body,code}),signal:AbortSignal.timeout(20000)});
 return {status:r.status,data:await r.json()};
}
const checks=[];const check=(label,condition)=>{assert.ok(condition,label);checks.push(label);console.log('PASS: '+label)};
const [a,b,c]=users;let socket;
try{
 const ap=await api(a,'profile',{name:'__test-Field'}),bp=await api(b,'profile',{name:'__test-Archive'});await api(c,'profile',{name:'__test-Outsider'});
 check('Native DeepSpace JWT profiles persist across requests',ap.status===200&&bp.status===200&&(await api(a,'profile')).data.profile.name==='__test-Field');
 check('Unsigned identity is refused',(await api(null,'profile')).status===401);
 const code=(await api(a,'create',{})).data.code;assert.ok(code);
 check('Private room starts in a host-controlled lobby',(await api(a,'room',undefined,code)).data.status==='waiting');
 check('Nonmember cannot read room',(await api(c,'room',undefined,code)).status===403);
 check('Invalid invitation has a useful validation failure',(await api(c,'join',{},'not-a-code')).status===400);
 check('Second authenticated investigator can join',(await api(b,'join',{},code)).status===200);
 check('Third investigator cannot join',(await api(c,'join',{},code)).status===409);
 check('Partner cannot start host case',(await api(b,'start',{},code)).status===403);
 check('Investigation cannot mutate before host starts',(await api(a,'note',{text:'too early'},code)).status===409);
 check('Host starts investigation',(await api(a,'start',{},code)).data.status==='investigating');
 check('Forged internal identity cannot grant room membership',(await api(c,'room',undefined,code,{'X-User-Id':ap.data.profile.id,'X-User-Role':'admin'})).status===403);
 check('Cross-origin WebSocket is refused',(await api(a,'live',undefined,code,{Origin:'https://example.com'})).status===403);
 socket=await socketClient(b.jwt,code,base);socket.send({type:'core.subscribe',payload:{subscriptionId:'case-test',query:{collection:'game',limit:1}}});await socket.wait(m=>m.type==='core.query_result');check('Partner receives real SDK WebSocket snapshot',true);
 socket.send({type:'core.put',payload:{collection:'game',recordId:'case',data:{payload:{status:'closed'}}}});const denied=await socket.wait(m=>m.type==='core.error');check('Direct WebSocket mutation cannot bypass rules',/DENIED/.test(denied.payload.error));
 const dossier=(await api(a,'dossier',undefined,code)).data;check('Revised case has the requested three suspect roles',dossier.suspects.length===3);
 const clues=[];for(const l of dossier.locations){const r=await api(a,'inspect?location='+l.id,undefined,code);assert.equal(r.status,200);clues.push(...r.data.clues)}check('Museum contains ten original evidence files',clues.length===10);
 for(const clue of clues)assert.equal((await api(a,'share',{id:clue.id},code)).status,200);
 await socket.wait(m=>m.type==='core.record_change');check('Shared evidence broadcasts to independent authenticated partner',true);
 check('Solution is absent from unsolved room',(await api(b,'room',undefined,code)).data.reveal===undefined);
 await api(b,'review',{id:'seal',reviewed:true},code);check('Reviewed state persists for the correct detective',(await api(a,'room',undefined,code)).data.reviewed[bp.data.profile.id].includes('seal'));
 await api(a,'pin',{id:'seal'},code);check('Important evidence is saved',(await api(b,'room',undefined,code)).data.pinned.includes('seal'));
 await api(b,'link',{source:'seal',target:'suspect:mara'},code);check('Attributed evidence-to-suspect connection persists',(await api(a,'room',undefined,code)).data.links[0].by==='__test-Archive');
 check('Duplicate evidence connection is refused',(await api(b,'link',{source:'seal',target:'suspect:mara'},code)).status===409);
 check('Invalid relationship target is refused',(await api(b,'link',{source:'seal',target:'suspect:unknown'},code)).status===400);
 await api(a,'link',{source:'seal',target:'mold'},code);check('Evidence-to-evidence relationships are supported',(await api(b,'room',undefined,code)).data.links.length===2);
 const requestId=crypto.randomUUID(),note={requestId,text:'__test-note: a timeline contradiction.'};await api(a,'note',note,code);await api(a,'note',note,code);check('Retrying identical request does not duplicate notes',(await api(b,'room',undefined,code)).data.notes.length===1);
 check('Reusing request ID with different input is refused',(await api(a,'note',{requestId,text:'changed'},code)).status===409);
 check('Nonmember cannot add private note',(await api(c,'note',{text:'intrusion'},code)).status===403);
 const right={suspect:'mara',method:'swap',motive:'audit',evidence:['seal','mold','order','ledger'],explanation:'The authorized inspection, replica mold, shipping weight and audit motive explain the sequence.'};
 check('Unknown supporting evidence is rejected',(await api(a,'accuse',{...right,evidence:['fake']},code)).status===400);
 check('Duplicate supporting evidence is rejected',(await api(a,'accuse',{...right,evidence:['seal','seal']},code)).status===400);
 const wrong={...right,suspect:'eli',method:'override',motive:'debt'};await api(a,'accuse',wrong,code);const incorrect=await api(b,'accuse',wrong,code);check('Incorrect joint accusation is spoiler-safe',incorrect.data.status==='investigating'&&!incorrect.data.reveal&&incorrect.data.feedback&&!incorrect.data.feedback.includes('Mara'));
 await new Promise(r=>setTimeout(r,5100));
 check('One correct vote cannot close a two-investigator case',(await api(a,'accuse',right,code)).data.status==='investigating');
 const solved=await api(b,'accuse',right,code);check('Supported matching accusations unlock the full reveal',solved.data.status==='closed'&&solved.data.reveal.timeline.length===6);
 check('Final report preserves investigator contributions and submissions',solved.data.members.length===2&&solved.data.submissions.length===4&&solved.data.events.some(e=>e.kind==='link'));
 check('Closed case history survives a fresh request',(await api(a,'room',undefined,code)).data.reveal.culprit==='Mara Voss');
 check('Solved case cannot be modified',(await api(a,'note',{text:'after closure'},code)).status===409);
 check('Account case history records completion',(await api(a,'profile')).data.profile.closed.includes(code));
 const solo=(await api(a,'create',{})).data.code;await api(a,'start',{},solo);for(const id of right.evidence)await api(a,'share',{id},solo);check('One investigator can solve a solo case',(await api(a,'accuse',right,solo)).data.status==='closed');
 check('Worker solution is unavailable as a public asset',(await fetch(base+'/src/server/case.ts')).status===404);
 await fs.mkdir('test-artifacts',{recursive:true});await fs.writeFile('test-artifacts/sdk-live-verification.json',JSON.stringify({url:base,checkedAt:new Date().toISOString(),checks},null,2));console.log('All '+checks.length+' SDK live checks passed.');
}finally{socket?.close()}
