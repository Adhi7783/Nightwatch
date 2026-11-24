import { test } from 'node:test'
import assert from 'node:assert/strict'
import { caseboardAction } from '../src/server/caseboard-actions.ts'
import { boundPosition, connectionPath } from '../src/game/caseboard-model.ts'
import type { Game, Profile } from '../src/game/types.ts'

const a = { id: 'a', name: 'Field' } as Profile,
  b = { id: 'b', name: 'Archive' } as Profile
function room() {
  return {
    shared: ['seal', 'mold'],
    links: [],
    contributions: { a: { links: 0 }, b: { links: 0 } },
    events: [],
  } as unknown as Game
}
function act(g: Game, action: string, data: Record<string, unknown> = {}, who = a, now = 100) {
  return caseboardAction(g, who, action, data, ['suspect:mara'], now)
}
const rejects = (fn: () => unknown, status: number) =>
  assert.throws(fn, (e: unknown) => (e as { status: number }).status === status)
test('A partner cannot overwrite a leased card; leases expire and stale moves are rejected', () => {
  const g = room()
  act(g, 'board-claim', { id: 'seal' })
  rejects(() => act(g, 'board-claim', { id: 'seal' }, b), 409)
  rejects(
    () => act(g, 'board-layout', { positions: [{ id: 'seal', x: 100, y: 100, revision: 0 }] }, b),
    409,
  )
  const token = g.board!.leases.seal.token
  act(g, 'board-layout', { token, positions: [{ id: 'seal', x: 100, y: 100, revision: 0 }] })
  rejects(
    () => act(g, 'board-layout', { positions: [{ id: 'seal', x: 200, y: 100, revision: 0 }] }, b),
    409,
  )
  act(g, 'board-claim', { id: 'seal' })
  act(g, 'board-claim', { id: 'seal' }, b, 16000)
  assert.equal(g.board!.leases.seal.by, 'b')
  assert.equal(g.board!.positions.seal.x, 100)
})
test('Tidy cannot partially save when another investigator has moved a card', () => {
  const g = room()
  act(g, 'board-layout', { positions: [{ id: 'mold', x: 100, y: 100, revision: 0 }] }, b)
  rejects(
    () =>
      act(g, 'board-layout', {
        positions: [
          { id: 'seal', x: 250, y: 100, revision: 0 },
          { id: 'mold', x: 500, y: 100, revision: 0 },
        ],
      }),
    409,
  )
  assert.equal(g.board!.positions.seal, undefined)
  assert.equal(g.board!.positions.mold.x, 100)
})
test('Layout undo restores the prior arrangement without overwriting newer partner work', () => {
  const g = room()
  act(g, 'board-layout', { positions: [{ id: 'seal', x: 150, y: 120, revision: 0 }] })
  const id = g.board!.history[0].id
  act(g, 'board-undo', { id, positions: [{ id: 'seal', x: 28, y: 110 }] })
  assert.equal(g.board!.positions.seal.x, 28)
  act(g, 'board-layout', { positions: [{ id: 'seal', x: 250, y: 120, revision: 2 }] })
  const next = g.board!.history.at(-1)!.id
  act(g, 'board-layout', { positions: [{ id: 'seal', x: 400, y: 200, revision: 3 }] }, b)
  rejects(() => act(g, 'board-undo', { id: next }), 409)
  assert.equal(g.board!.positions.seal.x, 400)
})
test('Connections allow either drag direction, labels, explanations and reject reverse duplicates', () => {
  const g = room()
  act(g, 'link', {
    source: 'suspect:mara',
    target: 'seal',
    relationship: 'contradicts',
    explanation: 'The seal contradicts the account.',
  })
  assert.equal(g.links[0].relationship, 'contradicts')
  assert.equal(g.links[0].explanation, 'The seal contradicts the account.')
  rejects(() => act(g, 'link', { source: 'seal', target: 'suspect:mara' }), 409)
  rejects(() => act(g, 'link', { source: 'seal', target: 'unknown' }), 400)
  rejects(() => act(g, 'link', { source: 'seal', target: 'mold', relationship: 'confirmed' }), 400)
  assert.equal(g.links.length, 1)
})
test('Connection edit and undo detect concurrent edits and preserve new work', () => {
  const g = room()
  act(g, 'link', { source: 'seal', target: 'mold' })
  const l = { ...g.links[0] },
    id = g.board!.history.at(-1)!.id
  act(g, 'update-link', { id: l.id, version: l.version, relationship: 'supports' }, b)
  rejects(() => act(g, 'unlink', { id: l.id, version: l.version }), 409)
  rejects(() => act(g, 'board-undo', { id }), 409)
  assert.equal(g.links[0].relationship, 'supports')
  const latest = g.links[0]
  act(g, 'unlink', { id: latest.id, version: latest.version }, b)
  const undo = g.board!.history.at(-1)!.id
  act(g, 'board-undo', { id: undo }, b)
  assert.equal(g.links[0].relationship, 'supports')
})
test('Board validates finite, bounded coordinates, shared nodes, duplicate IDs and ownership of undo', () => {
  const g = room()
  for (const x of [NaN, Infinity, -1, 2000])
    rejects(
      () => act(g, 'board-layout', { positions: [{ id: 'seal', x, y: 100, revision: 0 }] }),
      400,
    )
  rejects(() => act(g, 'board-claim', { id: 'undiscovered' }), 400)
  rejects(
    () =>
      act(g, 'board-layout', {
        positions: [
          { id: 'seal', x: 100, y: 100, revision: 0 },
          { id: 'seal', x: 120, y: 100, revision: 0 },
        ],
      }),
    400,
  )
  act(g, 'board-layout', { positions: [{ id: 'seal', x: 100, y: 100, revision: 0 }] })
  rejects(() => act(g, 'board-undo', { id: g.board!.history[0].id }, b), 409)
  assert.deepEqual(boundPosition(-100, 10000), { x: 16, y: 950 })
  assert.ok(!connectionPath({ x: 30, y: 100 }, { x: 600, y: 400 }).d.includes('NaN'))
})
