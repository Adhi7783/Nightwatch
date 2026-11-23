import test from 'node:test'
import assert from 'node:assert/strict'
import { needsBriefing, briefingHistory } from '../src/game/briefing-state.ts'
import type { Profile } from '../src/game/types'

const profile: Profile = {
  id: 'detective',
  name: 'Investigator',
  rooms: ['OLDROOM'],
  closed: [],
  created: 1,
  briefedRooms: ['OLDROOM'],
  briefingSeen: true,
}
test('every new case receives a briefing even after an earlier case was completed', () => {
  assert.equal(needsBriefing(profile, { code: 'NEWROOM', status: 'waiting' }), true)
  assert.equal(needsBriefing(profile, { code: 'NEWROOM', status: 'investigating' }), true)
})
test('resuming the same case does not force the full-screen briefing again', () => {
  assert.equal(needsBriefing(profile, { code: 'OLDROOM', status: 'investigating' }), false)
})
test('briefing history belongs to each investigator and closed archives do not replay', () => {
  assert.equal(
    needsBriefing(
      { name: 'Partner', briefedRooms: [] },
      { code: 'OLDROOM', status: 'investigating' },
    ),
    true,
  )
  assert.equal(needsBriefing(profile, { code: 'CLOSED', status: 'closed' }), false)
  assert.equal(needsBriefing(null, { code: 'NEWROOM', status: 'waiting' }), false)
  assert.equal(
    needsBriefing({ name: '', briefedRooms: [] }, { code: 'NEWROOM', status: 'waiting' }),
    false,
  )
})
test('legacy global completion migrates existing rooms without marking future rooms', () => {
  const legacy = { ...profile, briefedRooms: undefined }
  const migrated = briefingHistory(legacy)
  assert.deepEqual(migrated, ['OLDROOM'])
  assert.notEqual(migrated, legacy.rooms)
  const later = { ...legacy, briefedRooms: migrated, rooms: [...legacy.rooms, 'NEWROOM'] }
  assert.deepEqual(briefingHistory(later), ['OLDROOM'])
  assert.equal(needsBriefing(later, { code: 'NEWROOM', status: 'waiting' }), true)
})
