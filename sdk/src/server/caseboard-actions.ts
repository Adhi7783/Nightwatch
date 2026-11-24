import type {
  BoardChange,
  BoardPosition,
  Game,
  Link,
  Profile,
  Relationship,
} from '../game/types.ts'
import { BOARD } from '../game/caseboard-model.ts'

function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status })
}
const relations = ['supports', 'contradicts', 'related']
/** Called inside the existing serialized, member-gated RecordRoom action. */
export function caseboardAction(
  g: Game,
  who: Profile,
  action: string,
  b: Record<string, unknown>,
  suspectIds: string[],
  now = Date.now(),
) {
  const board = (g.board ??= { positions: {}, leases: {}, history: [] })
  const valid = (id: unknown): id is string =>
    typeof id === 'string' && (g.shared.includes(id) || suspectIds.includes(id))
  const log = (change: Omit<BoardChange, 'id' | 'at' | 'by'>) => {
    board.history.push({ ...change, id: crypto.randomUUID(), by: who.id, at: now } as BoardChange)
    board.history = board.history.slice(-30)
  }
  for (const [id, lease] of Object.entries(board.leases))
    if (lease.until <= now) delete board.leases[id]
  const available = (id: string) => {
    if (board.leases[id] && board.leases[id].by !== who.id)
      fail(409, 'Your partner is moving this card. Try again in a moment.')
  }
  if (action === 'board-claim') {
    if (!valid(b.id)) fail(400, 'Select a shared clue or suspect.')
    available(b.id)
    board.leases[b.id] = { by: who.id, token: crypto.randomUUID(), until: now + 15000 }
  } else if (action === 'board-release') {
    if (!valid(b.id)) fail(400, 'Select a shared clue or suspect.')
    if (board.leases[b.id]?.by === who.id && board.leases[b.id]?.token === b.token)
      delete board.leases[b.id]
  } else if (action === 'board-layout') {
    if (!Array.isArray(b.positions) || !b.positions.length || b.positions.length > 13)
      fail(400, 'Move between one and thirteen cards.')
    const before: Record<string, BoardPosition | null> = {},
      after: Record<string, BoardPosition> = {}
    for (const p of b.positions as Record<string, unknown>[]) {
      if (!p || !valid(p.id) || Object.hasOwn(after, p.id)) fail(400, 'Choose unique board cards.')
      available(p.id)
      const current = board.positions[p.id]
      if (p.revision !== (current?.revision || 0))
        fail(409, 'The board changed. Review your partner’s layout and try again.')
      if (b.token && (board.leases[p.id]?.token !== b.token || board.leases[p.id]?.by !== who.id))
        fail(409, 'Your move expired. Please drag the card again.')
      if (
        typeof p.x !== 'number' ||
        typeof p.y !== 'number' ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        p.x < 16 ||
        p.x > BOARD.width - BOARD.cardWidth - 16 ||
        p.y < 58 ||
        p.y > BOARD.height - BOARD.cardHeight - 16
      )
        fail(400, 'Keep cards inside the caseboard.')
      before[p.id] = current ? { ...current } : null
      after[p.id] = {
        x: Math.round(p.x),
        y: Math.round(p.y),
        revision: (current?.revision || 0) + 1,
      }
    }
    Object.assign(board.positions, after)
    for (const id of Object.keys(after)) delete board.leases[id]
    log({ kind: 'layout', before, after } as Omit<BoardChange, 'id' | 'at' | 'by'>)
  } else if (action === 'board-undo') {
    const change = board.history.find((c) => c.id === b.id && c.by === who.id)
    if (!change) fail(409, 'That change is no longer available to undo.')
    if (change.kind === 'layout') {
      for (const [id, p] of Object.entries(change.after)) {
        available(id)
        if (board.positions[id]?.revision !== p.revision)
          fail(409, 'A card has moved since your change. Undo would overwrite newer work.')
      }
      for (const [id, p] of Object.entries(change.before)) {
        // The UI supplies the deterministic inbox position when no saved position existed.
        const fallback = Array.isArray(b.positions)
          ? (b.positions as Record<string, unknown>[]).find((x) => x.id === id)
          : undefined
        const position = p || fallback
        if (
          !position ||
          typeof position.x !== 'number' ||
          typeof position.y !== 'number' ||
          !Number.isFinite(position.x) ||
          !Number.isFinite(position.y) ||
          position.x < 16 ||
          position.x > BOARD.width - BOARD.cardWidth - 16 ||
          position.y < 58 ||
          position.y > BOARD.height - BOARD.cardHeight - 16
        )
          fail(400, 'An inbox position is required to undo this move.')
      }
      for (const [id, p] of Object.entries(change.before)) {
        const fallback = (b.positions as Record<string, unknown>[] | undefined)?.find(
          (x) => x.id === id,
        )
        const position = (p || fallback) as { x: number; y: number }
        board.positions[id] = {
          x: position.x,
          y: position.y,
          revision: board.positions[id].revision + 1,
        }
        delete board.leases[id]
      }
    } else {
      const current = g.links.find((l) => l.id === (change.after || change.before)!.id)
      if (
        change.after
          ? !current || current.version !== change.after.version
          : !!current ||
            g.links.some(
              (l) =>
                (l.source === change.before!.source && l.target === change.before!.target) ||
                (l.target === change.before!.source && l.source === change.before!.target),
            )
      )
        fail(409, 'This connection changed since your edit. Undo would overwrite newer work.')
      g.links = g.links.filter((l) => l.id !== (change.after || change.before)!.id)
      if (change.before) {
        if (g.links.length >= 60) fail(409, 'The board has reached its connection limit.')
        g.links.push({ ...change.before, version: crypto.randomUUID() })
      }
    }
    board.history = board.history.filter((c) => c.id !== change.id)
  } else if (['link', 'update-link', 'unlink'].includes(action)) {
    const existing = g.links.find((l) => l.id === b.id)
    if (action !== 'link' && !existing) fail(404, 'Connection not found.')
    if (action !== 'link' && b.version !== (existing!.version || 'legacy'))
      fail(409, 'This connection changed. Select it again before editing.')
    if (action === 'unlink') {
      g.links = g.links.filter((l) => l.id !== b.id)
      log({ kind: 'link', before: existing!, after: null } as Omit<BoardChange, 'id' | 'at' | 'by'>)
      return
    }
    const source = existing?.source || b.source,
      target = existing?.target || b.target
    if (
      !valid(source) ||
      !valid(target) ||
      source === target ||
      (!g.shared.includes(source) && !g.shared.includes(target))
    )
      fail(400, 'Connect shared evidence to another clue or suspect.')
    const relationship = (b.relationship ?? 'related') as Relationship
    if (
      !relations.includes(relationship) ||
      (b.explanation !== undefined &&
        (typeof b.explanation !== 'string' || b.explanation.length > 300))
    )
      fail(400, 'Choose a relationship and use up to 300 characters for the explanation.')
    if (action === 'link') {
      if (g.links.length >= 60) fail(409, 'The board has reached its connection limit.')
      if (
        g.links.some(
          (l) =>
            (l.source === source && l.target === target) ||
            (l.source === target && l.target === source),
        )
      )
        fail(409, 'That connection already exists.')
    }
    const link: Link = {
      id: existing?.id || crypto.randomUUID(),
      source,
      target,
      relationship,
      explanation: String(b.explanation || '').trim(),
      by: who.name,
      at: now,
      version: crypto.randomUUID(),
    }
    if (existing) g.links = g.links.map((l) => (l.id === existing.id ? link : l))
    else g.links.push(link)
    log({ kind: 'link', before: existing || null, after: link } as Omit<
      BoardChange,
      'id' | 'at' | 'by'
    >)
    if (!existing) {
      g.contributions![who.id].links++
      g.events.push({ text: who.name + ' connected evidence.', by: who.id, kind: 'link', at: now })
    }
  } else fail(404, 'Unknown board operation.')
}
