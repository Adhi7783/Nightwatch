import test from 'node:test'
import assert from 'node:assert/strict'
import { changeSave } from '../src/game/save-archive.ts'
import { encodeVoice } from '../src/game/computer-voice.ts'
import type { Profile } from '../src/game/types.ts'
const code = 'ABCDEF123456',
  other = '123456ABCDEF'
const p: Profile = {
  id: 'a',
  name: 'Detective',
  rooms: [code, other],
  closed: [code],
  created: 1,
  briefedRooms: [code],
}
test('Removing a save only changes the personal archive and keeps its completed briefing history', () => {
  const partner = structuredClone(p),
    removed = changeSave(p, code, true, 100)
  assert.deepEqual(removed.rooms, [other])
  assert.deepEqual(p.rooms, [code, other])
  assert.deepEqual(partner.rooms, [code, other])
  assert.deepEqual(removed.closed, [code])
  assert.deepEqual(removed.briefedRooms, [code])
  assert.equal(removed.deletedRooms![0].code, code)
})
test('Undo restores a removed save once; repeated delete and restore requests are idempotent', () => {
  const removed = changeSave(p, code, true, 100),
    again = changeSave(removed, code, true, 200)
  assert.deepEqual(removed, again)
  const restored = changeSave(again, code, false, 300),
    twice = changeSave(restored, code, false, 400)
  assert.deepEqual(restored, twice)
  assert.deepEqual(restored.rooms, [code, other])
  assert.deepEqual(restored.deletedRooms, [])
})
test('A profile cannot delete or restore someone else’s save and archive inputs are validated', () => {
  for (const deleted of [true, false])
    assert.throws(
      () => changeSave(p, 'AAAAAAAAAAAA', deleted),
      (e: unknown) => (e as { status: number }).status === 404,
    )
  for (const [id, value] of [
    [code, 'true'],
    ['not-a-code', true],
    [{}, true],
    [code, null],
  ])
    assert.throws(
      () => changeSave(p, id, value),
      (e: unknown) => (e as { status: number }).status === 400,
    )
})
test('Computer voice encoding preserves sample duration and produces finite, clamped mono PCM', () => {
  const wav = encodeVoice(new Float32Array([-2, -0.5, 0, 0.5, 2, NaN]), 22050),
    v = new DataView(wav)
  assert.equal(new TextDecoder().decode(new Uint8Array(wav, 0, 4)), 'RIFF')
  assert.equal(v.getUint16(22, true), 1)
  assert.equal(v.getUint32(24, true), 22050)
  assert.equal(v.getUint32(40, true), 12)
  assert.equal(v.getInt16(44, true), -32768)
  assert.equal(v.getInt16(52, true), 32767)
  assert.equal(v.getInt16(54, true), 0)
})
