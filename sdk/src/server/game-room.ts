import { RecordRoom } from 'deepspace/worker'
import type { CollectionSchema } from 'deepspace/schema'
import type { Env } from '../../worker'
import type { Game, Profile, PublicGame, Member, Theory } from '../game/types'
import { validateTheory, matchesSolution, sameConclusion } from '../game/rules'
import { clues, suspects, locations, methods, motives, answer, reveal } from './case'

const deny = { read: false, create: false, update: false, delete: false }
const admin = { read: true, create: true, update: true, delete: true }
export const gameSchemas: CollectionSchema[] = ['profiles', 'game'].map((name) => ({
  name,
  columns: [{ name: 'payload', storage: 'text', interpretation: { kind: 'json' }, required: true }],
  permissions: {
    '*': deny,
    viewer: name === 'game' ? { ...deny, read: true } : deny,
    member: name === 'game' ? { ...deny, read: true } : deny,
    admin,
  },
}))
function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status })
}
const random = () => crypto.randomUUID().replaceAll('-', '')
const view = (g: Game): PublicGame => {
  const { receipts: _receipts, shared, ...publicFields } = g
  return {
    ...publicFields,
    shared: shared.map((id) => clues.find((c) => c.id === id)!),
    ...(g.status === 'closed' ? { reveal } : {}),
  }
}
type Input = {
  who: Profile
  code?: string
  name?: string
  location?: string
  id?: string
  source?: string
  target?: string
  text?: string
  reviewed?: boolean
  requestId?: string
  room?: string
  award?: string
} & Record<string, unknown>

/** Serializes app actions; the SDK owns records, validation, persistence and broadcasts. */
export class Board extends RecordRoom<Env> {
  private queue: Promise<unknown> = Promise.resolve()
  constructor(state: DurableObjectState, env: Env) {
    super(state, env, gameSchemas, { ownerUserId: env.OWNER_USER_ID })
  }
  private async record<T>(
    op: string,
    collection: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    const r = await super.fetch(
      new Request('https://internal/api/tools/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': this.env.OWNER_USER_ID,
          'X-App-Action': 'true',
        },
        body: JSON.stringify({ tool: 'records.' + op, params: { collection, ...params } }),
      }),
    )
    const result = (await r.json()) as { success: boolean; error?: string; data: T }
    if (!result.success) throw Error(result.error || 'Storage operation failed')
    return result.data
  }
  private async get<T>(collection: string, id: string): Promise<T | null> {
    try {
      return (
        await this.record<{ record: { data: { payload: T } } }>('get', collection, { recordId: id })
      ).record.data.payload
    } catch (e) {
      if (e instanceof Error && /not.found/i.test(e.message)) return null
      throw e
    }
  }
  private async put(collection: string, id: string, payload: unknown) {
    await this.record('create', collection, { recordId: id, data: { payload } })
  }
  async fetch(request: Request): Promise<Response> {
    if (!new URL(request.url).pathname.startsWith('/nightwatch/')) return super.fetch(request)
    const result = this.queue.then(() => this.operate(request))
    this.queue = result.catch(() => {})
    try {
      return await result
    } catch (error) {
      const e = error as Error & { status?: number }
      console.error('Nightwatch:', e.message)
      return Response.json(
        {
          error: e.status
            ? e.message
            : 'The archive could not complete that request. Please retry.',
        },
        { status: e.status || 500 },
      )
    }
  }
  private async operate(request: Request): Promise<Response> {
    const action = new URL(request.url).pathname.split('/').at(-1)!
    const b = (await request.json()) as Input
    if (!b.who?.id) fail(401, 'Sign in to DeepSpace first.')
    if (action === 'profile') {
      let p = await this.get<Profile>('profiles', b.who.id)
      if (!p) {
        p = { id: b.who.id, name: '', rooms: [], closed: [], created: Date.now() }
      }
      if (b.name !== undefined) {
        if (typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 24)
          fail(400, 'Use a detective name between 2 and 24 characters.')
        p.name = b.name.trim()
      }
      if (b.room && !p.rooms.includes(b.room)) p.rooms = [b.room, ...p.rooms].slice(0, 30)
      if (b.award && !p.closed.includes(b.award)) p.closed.push(b.award)
      if (b.briefingSeen === true) p.briefingSeen = true
      await this.put('profiles', p.id, p)
      return Response.json({ profile: p })
    }
    const who = b.who
    if (!who.name) fail(409, 'Choose your detective name first.')
    // These internal operations are reached only through the authenticated,
    // curated feature routes. RecordRoom serializes reservations across workers.
    if (action === 'service-reserve') {
      const key = String(b.key)
      const cached = await this.get<{ value?: unknown; until: number; lease?: string }>(
        'profiles',
        'cache:' + key,
      )
      if (cached?.value && cached.until > Date.now()) return Response.json({ value: cached.value })
      if (cached && cached.until > Date.now())
        fail(429, 'This request is already processing. Please retry in a moment.')
      const day = new Date().toISOString().slice(0, 10)
      for (const [id, limit] of [
        ['budget:' + day, 60],
        ['budget:' + day + ':' + who.id, 10],
      ] as const) {
        const budget = (await this.get<{ count: number }>('profiles', id)) || { count: 0 }
        if (budget.count >= limit)
          fail(429, 'The daily assistant limit has been reached. Investigation remains available.')
      }
      for (const id of ['budget:' + day, 'budget:' + day + ':' + who.id]) {
        const budget = (await this.get<{ count: number }>('profiles', id)) || { count: 0 }
        await this.put('profiles', id, { count: budget.count + 1 })
      }
      const lease = random()
      await this.put('profiles', 'cache:' + key, { until: Date.now() + 120000, lease })
      return Response.json({ lease })
    }
    if (action === 'service-save') {
      const id = 'cache:' + String(b.key)
      const cached = await this.get<{ lease?: string }>('profiles', id)
      if (cached?.lease !== b.lease) fail(409, 'This assistant request has expired. Retry it.')
      await this.put('profiles', id, { value: b.value, until: Date.now() + Number(b.ttl) })
      return Response.json({ saved: true })
    }
    let g = await this.get<Game>('game', 'case')
    if (action === 'create') {
      if (g) fail(409, 'Room already exists.')
      g = {
        caseId: 'midnight-museum-v2',
        code: b.code!,
        title: 'The Midnight Museum Heist',
        hostId: who.id,
        status: 'waiting',
        created: Date.now(),
        members: [{ id: who.id, name: who.name, role: 0, seen: Date.now() }],
        shared: [],
        reviewed: {},
        pinned: [],
        links: [],
        notes: [],
        votes: {},
        attempts: 0,
        lastAttempt: 0,
        events: [
          { text: who.name + ' opened the case.', by: who.id, kind: 'room', at: Date.now() },
        ],
        submissions: [],
        receipts: {},
      }
      await this.put('game', 'case', g)
      return Response.json(view(g))
    }
    if (!g) fail(404, 'Room not found. Check the invitation code.')
    let member = g.members.find((m) => m.id === who.id)
    if (action === 'join' && !member) {
      if (g.members.length >= 2) fail(409, 'This room has two investigators.')
      if (g.status !== 'waiting') fail(409, 'The host has already started this case.')
      member = { id: who.id, name: who.name, role: 1, seen: Date.now() }
      g.members.push(member)
      g.events.push({
        text: who.name + ' joined the room.',
        by: who.id,
        kind: 'room',
        at: Date.now(),
      })
      await this.put('game', 'case', g)
    }
    if (!member) fail(403, 'Only room members can access this investigation.')
    if (['room', 'join'].includes(action)) return Response.json(view(g))
    if (action === 'socket') return Response.json({ allowed: true })
    if (action === 'dossier')
      return Response.json({
        role: member.role,
        locations,
        suspects,
        methods,
        motives,
        brief:
          'At 22:17 an alarm interrupts the Bellwether Museum gala. The Glass Meridian, an 840 g astronomical instrument, has vanished from a sealed display. A brief camera outage makes the timing seem obvious. An external provenance audit opens on Monday. Recover the instrument and establish who took it, how, and why.',
      })
    if (action === 'heartbeat') {
      member.seen = Date.now()
      member.name = who.name
      await this.put('game', 'case', g)
      return Response.json({ ok: true })
    }
    if (action === 'inspect') {
      if (g.status === 'waiting') fail(409, 'The host must start the investigation.')
      if (!locations.some((l) => l.id === b.location)) fail(400, 'Unknown location.')
      return Response.json({ clues: clues.filter((c) => c.location === b.location) })
    }
    if (g.status === 'closed') fail(409, 'This case is closed and its history is preserved.')
    const requestId = b.requestId
    if (typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(requestId))
      fail(400, 'A valid action request ID is required.')
    const fingerprint = JSON.stringify({ action, ...b, who: undefined, requestId: undefined })
    const key = who.id + ':' + requestId
    if (g.receipts[key]) {
      if (g.receipts[key] !== fingerprint)
        fail(409, 'This request ID was already used for a different action.')
      return Response.json(view(g))
    }
    g.contributions ??= {}
    const contribution = (g.contributions[who.id] ??= { evidence: 0, notes: 0, links: 0 })
    if (action === 'start') {
      if (who.id !== g.hostId) fail(403, 'Only the host can start the case.')
      if (g.status !== 'waiting') fail(409, 'The case has already started.')
      g.status = 'investigating'
      g.events.push({
        text: who.name + ' started the case.',
        by: who.id,
        kind: 'start',
        at: Date.now(),
      })
    } else {
      if (g.status !== 'investigating') fail(409, 'The host must start the investigation.')
      if (action === 'share') {
        if (!clues.some((c) => c.id === b.id)) fail(400, 'Unknown evidence.')
        if (!g.shared.includes(b.id!)) {
          g.shared.push(b.id!)
          contribution.evidence++
          g.events.push({
            text: who.name + ' shared ' + clues.find((c) => c.id === b.id)!.title + '.',
            by: who.id,
            kind: 'evidence',
            at: Date.now(),
          })
        }
      } else if (action === 'review') {
        if (!g.shared.includes(b.id!) || typeof b.reviewed !== 'boolean')
          fail(400, 'Review valid shared evidence.')
        const ids = g.reviewed[who.id] || []
        g.reviewed[who.id] = b.reviewed
          ? [...new Set([...ids, b.id!])]
          : ids.filter((id) => id !== b.id)
      } else if (action === 'pin') {
        if (!g.shared.includes(b.id!)) fail(400, 'Select shared evidence.')
        g.pinned = g.pinned.includes(b.id!)
          ? g.pinned.filter((id) => id !== b.id)
          : [...g.pinned, b.id!]
      } else if (action === 'link') {
        if (
          !g.shared.includes(b.source!) ||
          (!g.shared.includes(b.target!) &&
            !suspects.some((s) => 'suspect:' + s.id === b.target)) ||
          b.source === b.target
        )
          fail(400, 'Connect shared evidence to another clue or a suspect.')
        if (g.links.length >= 60) fail(409, 'The board has reached its connection limit.')
        if (g.links.some((l) => l.source === b.source && l.target === b.target))
          fail(409, 'That connection already exists.')
        g.links.push({
          id: random(),
          source: b.source!,
          target: b.target!,
          by: who.name,
          at: Date.now(),
        })
        contribution.links++
        g.events.push({
          text: who.name + ' connected evidence.',
          by: who.id,
          kind: 'link',
          at: Date.now(),
        })
      } else if (action === 'unlink') {
        const link = g.links.find((l) => l.id === b.id)
        if (!link) fail(404, 'Connection not found.')
        g.links = g.links.filter((l) => l.id !== b.id)
      } else if (action === 'note') {
        if (typeof b.text !== 'string' || !b.text.trim() || b.text.length > 500)
          fail(400, 'Write a note of 1–500 characters.')
        if (g.notes.length >= 100) fail(409, 'The notebook is full.')
        g.notes.push({ id: random(), by: who.name, text: b.text.trim(), at: Date.now() })
        contribution.notes++
        g.events.push({
          text: who.name + ' added a case note.',
          by: who.id,
          kind: 'note',
          at: Date.now(),
        })
      } else if (action === 'accuse') {
        let theory: Theory
        try {
          theory = validateTheory(
            b,
            {
              suspects: suspects.map((s) => s.id),
              methods: methods.map((m) => m.id),
              motives: motives.map((m) => m.id),
              evidence: clues.map((c) => c.id),
            },
            g.shared,
          )
        } catch (e) {
          fail(400, (e as Error).message)
        }
        const previousVote = g.votes[who.id]
        if (
          previousVote &&
          'suspect' in previousVote &&
          sameConclusion(previousVote, theory!) &&
          previousVote.explanation === theory!.explanation &&
          [...previousVote.evidence].sort().join(',') === [...theory!.evidence].sort().join(',')
        ) {
          fail(
            409,
            'Your identical accusation is already recorded. Wait for your partner or revise it.',
          )
        }
        if (Date.now() - g.lastAttempt < 5000)
          fail(429, 'Review the evidence for a moment before another accusation.')
        g.votes[who.id] = theory!
        g.submissions.push({ by: who.name, at: Date.now(), theory: theory!, result: 'submitted' })
        const votes = g.members.map((m) => g.votes[m.id])
        if (
          votes.every((v): v is Theory => !!v && 'suspect' in v) &&
          votes.every((v) => sameConclusion(v, theory!))
        ) {
          g.attempts++
          g.lastAttempt = Date.now()
          g.votes = {}
          if (votes.every((v) => matchesSolution(v, answer))) {
            g.status = 'closed'
            g.outcome = 'solved'
            g.closedAt = Date.now()
            g.events.push({
              text: 'The investigators solved the case.',
              at: Date.now(),
              kind: 'solved',
            })
          } else
            g.feedback =
              'This theory does not account for the whole case. Reconsider the sequence of events and support each conclusion with evidence.'
        } else
          g.feedback =
            'Theory saved. Your partner must submit the same suspect, method, and motive, supported by their evidence.'
      } else if (action === 'reveal') {
        g.votes[who.id] = { reveal: true }
        if (g.members.every((m) => 'reveal' in (g.votes[m.id] || {}))) {
          g.status = 'closed'
          g.outcome = 'revealed'
          g.closedAt = Date.now()
        } else g.feedback = 'Reveal requested. Your partner must also agree to close the case.'
      } else fail(404, 'Unknown action.')
    }
    g.receipts[key] = fingerprint
    g.receipts = Object.fromEntries(Object.entries(g.receipts).slice(-100))
    g.events = g.events.slice(-100)
    g.submissions = g.submissions.slice(-50)
    await this.put('game', 'case', g)
    return Response.json(view(g))
  }
}
