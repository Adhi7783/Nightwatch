// Local interaction fixture. No identity, SDK connection, integration or game API calls.
import { useState } from 'react'
import { Caseboard } from '../../src/game/Caseboard'
import { Machinery } from '../../src/game/CommandVisuals'
import { caseboardAction } from '../../src/server/caseboard-actions'
import type { Dossier, Game, PublicGame, Profile } from '../../src/game/types'

const locations = ['Gallery', 'Security', 'Studio', 'Corridor'].map((name, i) => ({
  id: 'l' + i,
  name,
  type: 'MUSEUM',
  icon: '⌾',
  description: name,
}))
const evidence = [
  'Display seal',
  'Security log',
  'Mold impression',
  'Freight record',
  'Audit notice',
  'Guest photograph',
  'Plinth diagram',
  'Shift register',
  'Delivery tag',
  'Workshop receipt',
].map((title, i) => ({
  id: 'e' + i,
  title,
  location: 'l' + (i % 4),
  kind: i % 2 ? 'DOCUMENT' : 'FORENSIC FILE',
  role: 0,
  time: '22:' + String(20 + i).padStart(2, '0'),
  body: 'A handwritten museum record is preserved in the archive. Compare its timing and contents with the other files before drawing a conclusion.',
  inference: 'A recorded observation for the investigators to evaluate.',
}))
const suspects = ['Mara Voss', 'Eli Mercer', 'Julian Cross'].map((name, i) => ({
  id: 's' + i,
  name,
  role: ['Curator', 'Security officer', 'Transport coordinator'][i],
  initials: name
    .split(' ')
    .map((x) => x[0])
    .join(''),
  color: '#17466b',
  detail: 'A museum employee present during the gala.',
  statement: 'I was following the scheduled duties for the evening.',
  motive: 'The interview raises questions worth testing.',
  opportunity: 'Compare the museum records.',
  alibi: 'Review the timestamps before deciding.',
}))
const dossier = {
  locations,
  suspects,
  role: 0,
  methods: [],
  motives: [],
  brief: 'Local demonstration case.',
} as Dossier
const initial: PublicGame = {
  code: 'LOCALFIXTURE',
  caseId: 'fixture',
  title: 'Local interaction fixture',
  hostId: 'a',
  status: 'investigating',
  created: Date.now(),
  members: [
    { id: 'a', name: 'Field', role: 0, seen: Date.now() },
    { id: 'b', name: 'Archive', role: 1, seen: Date.now() },
  ],
  shared: evidence,
  reviewed: {},
  pinned: [],
  links: [],
  notes: [],
  votes: {},
  attempts: 0,
  lastAttempt: 0,
  events: [],
  submissions: [],
  contributions: { a: { evidence: 0, links: 0, notes: 0 }, b: { evidence: 0, links: 0, notes: 0 } },
}
export function BoardFixture() {
  const [game, setGame] = useState(initial)
  async function send(action: string, body: Record<string, unknown> = {}) {
    const next = structuredClone(game)
    if (action === 'review') {
      next.reviewed.a = body.reviewed
        ? [...new Set([...(next.reviewed.a || []), String(body.id)])]
        : (next.reviewed.a || []).filter((id) => id !== body.id)
    } else if (action === 'pin')
      next.pinned = next.pinned.includes(String(body.id))
        ? next.pinned.filter((id) => id !== body.id)
        : [...next.pinned, String(body.id)]
    else if (action === 'note')
      next.notes.push({
        id: crypto.randomUUID(),
        by: 'Field',
        text: String(body.text),
        at: Date.now(),
        subject: String(body.subject),
      })
    else {
      const internal = { ...next, shared: next.shared.map((c) => c.id), receipts: {} } as Game
      caseboardAction(
        internal,
        { id: 'a', name: 'Field' } as Profile,
        action,
        body,
        suspects.map((s) => 'suspect:' + s.id),
      )
      Object.assign(next, internal, { shared: next.shared })
    }
    setGame(next)
    return next
  }
  return (
    <>
      <Machinery />
      <main className="main main-caseboard">
        <h1>Caseboard interaction fixture</h1>
        <p className="muted">Local demonstration data. No production case is changed.</p>
        <Caseboard game={game} dossier={dossier} userId="a" locked={false} send={send} />
      </main>
    </>
  )
}
