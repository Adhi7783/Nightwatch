// Real, bounded production integration checks. Requires the ignored fixture account file.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
const base = 'https://nightwatch-meridian.app.space', auth = 'https://auth.deep.space'
const users = JSON.parse(await fs.readFile('.test-users.private.json', 'utf8'))
for (const u of users) {
  if (u.jwt && u.jwtSaved > Date.now() - 600000) continue
  const response = await fetch(auth + '/api/auth/sign-in/email', { method: 'POST', headers: { Origin: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: u.email, password: u.password }), redirect: 'manual' })
  assert.ok(response.ok, 'Fixture login')
  u.cookie = response.headers.get('set-cookie')?.match(/__Secure-better-auth\.session_token=([^;]+)/)?.[0]
  const token = await fetch(auth + '/api/auth/token', { method: 'POST', headers: { Cookie: u.cookie, Origin: auth } })
  u.jwt = (await token.json()).token; u.jwtSaved = Date.now()
}
await fs.writeFile('.test-users.private.json', JSON.stringify(users))
const [host, , outsider] = users
async function api(u, action, body, code) {
  const url = new URL('/api/nightwatch/' + action, base); if (code) url.searchParams.set('code', code)
  const r = await fetch(url, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: 'Bearer ' + (u?.jwt || ''), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify({ ...body, requestId: crypto.randomUUID(), code }), signal: AbortSignal.timeout(110000) })
  return { status: r.status, data: await r.json() }
}
const checks = []
const check = (label, result) => { assert.ok(result, label); checks.push(label); console.log('PASS: ' + label) }
await api(host, 'profile', { name: '__test-Field' }); await api(outsider, 'profile', { name: '__test-Outsider' })
check('Anonymous narration requests are refused', (await api(null, 'briefing', {})).status === 401)
for (const provider of ['anthropic', 'elevenlabs', 'cloudconvert']) {
  const r = await fetch(base + '/api/integrations/' + provider + '/chat-completion', { method: 'POST', headers: { Authorization: 'Bearer ' + host.jwt, 'Content-Type': 'application/json' }, body: '{}' })
  check('Generic paid proxy blocked for ' + provider, r.status === 403)
}
const code = (await api(host, 'create', {})).data.code; assert.ok(code)
check('Recap cannot run before evidence is earned', (await api(host, 'recap', {}, code)).status === 409)
check('Unfinished case cannot export the answer', (await api(host, 'report', {}, code)).status === 409)
check('Nonmembers cannot request recaps', (await api(outsider, 'recap', {}, code)).status === 403)
check('Nonmembers cannot export reports', (await api(outsider, 'report', {}, code)).status === 403)
const narration = await api(host, 'briefing', {})
if (narration.status !== 200) throw Error(JSON.stringify({ feature: 'briefing', ...narration }))
check('ElevenLabs returns actual audio and character timing', narration.data.audioUrl.startsWith('data:audio/') && narration.data.alignment.characters.length > 100 && narration.data.alignment.character_start_times_seconds.every(Number.isFinite))
await fs.writeFile('test-artifacts/briefing.mp3', Buffer.from(narration.data.audioUrl.split(',')[1], 'base64'))
check('Narration is reused from the durable cache', (await api(host, 'briefing', {})).data.audioUrl === narration.data.audioUrl)
check('Nonmembers cannot mark another room briefing complete', (await api(outsider, 'briefing-seen', {}, code)).status === 403)
await api(host, 'briefing-seen', {}, code)
check('Briefing completion persists for this case', (await api(host, 'profile')).data.profile.briefedRooms.includes(code))
const second = (await api(host, 'create', {})).data.code
check('A new case does not inherit a completed briefing', !(await api(host, 'profile')).data.profile.briefedRooms.includes(second))
await api(host, 'start', {}, code)
for (const id of ['seal', 'mold', 'order', 'ledger']) await api(host, 'share', { id }, code)
const room = (await api(host, 'room', undefined, code)).data
const recap = await api(host, 'recap', {}, code)
if (recap.status !== 200) throw Error(JSON.stringify({ feature: 'recap', ...recap }))
check('Anthropic selects real earned evidence with exact source citations', recap.data.observations.length > 0 && recap.data.observations.every(o => room.shared.some(c => c.id === o.evidenceId && c.body.includes(o.quote))))
check('Repeated recap is cached for this evidence version', (await api(host, 'recap', {}, code)).data.created === recap.data.created)
await api(host, 'note', { text: 'Compare the 17:40 opening with the later alarm. <script>Evidence remains text.</script>' }, code)
const solved = await api(host, 'accuse', { suspect: 'mara', method: 'swap', motive: 'audit', evidence: ['seal', 'mold', 'order', 'ledger'], explanation: 'The early swap, matching mold, weighted transfer and false certification establish the full sequence.' }, code)
check('Authored solution closes the report fixture', solved.data.status === 'closed')
const report = await api(host, 'report', {}, code)
if (report.status !== 200) throw Error(JSON.stringify({ feature: 'report', ...report }))
const pdf = await fetch(report.data.downloadUrl, { signal: AbortSignal.timeout(30000) })
const bytes = Buffer.from(await pdf.arrayBuffer())
check('CloudConvert produces a downloadable real PDF', pdf.ok && bytes.subarray(0, 5).toString() === '%PDF-')
await fs.writeFile('test-artifacts/nightwatch-case-report.pdf', bytes)
check('Report URL is cached rather than repeatedly billed', (await api(host, 'report', {}, code)).data.downloadUrl === report.data.downloadUrl)
await fs.writeFile('test-artifacts/integration-verification.json', JSON.stringify({ url: base, checkedAt: new Date().toISOString(), room: code, checks }, null, 2))
console.log('All ' + checks.length + ' integration checks passed.')
