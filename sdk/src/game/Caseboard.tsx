import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Dossier, PublicGame, Relationship } from './types'
import {
  BOARD,
  boundPosition,
  connectionPath,
  initialPosition,
  tidyPositions,
} from './caseboard-model'

type Send = (action: string, body?: Record<string, unknown>) => Promise<PublicGame>
type Drag = {
  kind: 'card' | 'pan' | 'link'
  id?: string
  pointer: number
  start: { x: number; y: number }
  origin: { x: number; y: number }
  point: { x: number; y: number }
  revision?: number
  token?: string
  finished?: boolean
  cancelled?: boolean
  moved?: boolean
}
const labels: Record<Relationship, string> = {
  supports: 'Supports',
  contradicts: 'Contradicts',
  related: 'Possibly related',
}

export function Caseboard({
  game,
  dossier,
  userId,
  locked,
  send,
}: {
  game: PublicGame
  dossier: Dossier
  userId: string
  locked: boolean
  send: Send
}) {
  const [selected, select] = useState('')
  const [selectedLink, selectLink] = useState('')
  const [connect, setConnect] = useState<{ source: string; target: string } | null>(null)
  const [relation, setRelation] = useState<Relationship>('related'),
    [explanation, setExplanation] = useState('')
  const [note, setNote] = useState(''),
    [noteSubject, setNoteSubject] = useState('')
  const [list, setList] = useState(() => window.matchMedia('(max-width: 760px)').matches)
  const [view, setView] = useState({ x: 20, y: 20, zoom: 0.65 })
  const [local, setLocal] = useState<Record<string, { x: number; y: number }>>({})
  const [linePoint, setLinePoint] = useState<{ x: number; y: number } | null>(null)
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('')
  const [clock, setClock] = useState(Date.now())
  const viewport = useRef<HTMLDivElement>(null),
    drag = useRef<Drag | null>(null)
  const alive = useRef(true),
    latest = useRef(game),
    viewRef = useRef(view),
    sendRef = useRef(send)
  latest.current = game
  viewRef.current = view
  sendRef.current = send
  const ids = [...game.shared.map((c) => c.id), ...dossier.suspects.map((s) => 'suspect:' + s.id)]
  const positions = Object.fromEntries(
    ids.map((id) => [
      id,
      {
        ...initialPosition(id, game.shared, dossier.suspects),
        ...game.board?.positions[id],
        ...local[id],
      },
    ]),
  )
  const title = (id: string) =>
    game.shared.find((c) => c.id === id)?.title ||
    dossier.suspects.find((s) => 'suspect:' + s.id === id)?.name ||
    'Case note'
  const selectedClue = game.shared.find((c) => c.id === selected)
  const selectedSuspect = dossier.suspects.find((s) => 'suspect:' + s.id === selected)
  const link = game.links.find((l) => l.id === selectedLink)
  const myChange = game.board?.history.filter((c) => c.by === userId).at(-1)
  const closed = game.status === 'closed'
  const previous = useRef(game)
  useEffect(() => {
    const before = previous.current
    const changes =
      game.board?.history.filter(
        (c) => c.by !== userId && !before.board?.history.some((x) => x.id === c.id),
      ) || []
    const shared = game.shared.filter((c) => !before.shared.some((x) => x.id === c.id))
    if (changes.length) {
      const c = changes.at(-1)!
      setMessage(
        (game.members.find((m) => m.id === c.by)?.name || 'Your partner') +
          (c.kind === 'layout' ? ' arranged the caseboard.' : ' updated a connection.'),
      )
    } else if (shared.length)
      setMessage(
        shared.length +
          ' new ' +
          (shared.length === 1 ? 'clue is' : 'clues are') +
          ' in the evidence inbox.',
      )
    previous.current = game
  }, [game, userId])
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(t)
  }, [message])
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      const d = drag.current
      if (d) {
        d.cancelled = true
        if (d.token)
          void sendRef.current('board-release', { id: d.id, token: d.token }).catch(() => {})
      }
    }
  }, [])
  function fit() {
    const el = viewport.current
    if (!el) return
    const ps = Object.values(positions),
      minX = Math.min(...ps.map((p) => p.x)) - 24,
      minY = Math.min(...ps.map((p) => p.y)) - 48
    const width = Math.max(...ps.map((p) => p.x + BOARD.cardWidth)) - minX + 24,
      height = Math.max(...ps.map((p) => p.y + BOARD.cardHeight)) - minY + 24
    const zoom = Math.max(
      0.25,
      Math.min(1.15, (el.clientWidth - 32) / width, (el.clientHeight - 32) / height),
    )
    setView({
      x: (el.clientWidth - width * zoom) / 2 - minX * zoom,
      y: (el.clientHeight - height * zoom) / 2 - minY * zoom,
      zoom,
    })
  }
  useEffect(() => {
    if (list) return
    const t = requestAnimationFrame(fit)
    return () => cancelAnimationFrame(t)
  }, [list])
  function zoomAt(delta: number, clientX?: number, clientY?: number) {
    const el = viewport.current
    if (!el) return
    setView((v) => {
      const zoom = Math.max(0.25, Math.min(1.5, v.zoom * delta))
      const rect = el.getBoundingClientRect(),
        x = clientX === undefined ? el.clientWidth / 2 : clientX - rect.left,
        y = clientY === undefined ? el.clientHeight / 2 : clientY - rect.top
      return { x: x - ((x - v.x) * zoom) / v.zoom, y: y - ((y - v.y) * zoom) / v.zoom, zoom }
    })
  }
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        zoomAt(Math.exp(-e.deltaY * 0.003), e.clientX, e.clientY)
      }
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [list])
  async function run(action: string, body: Record<string, unknown> = {}, done?: () => void) {
    if (pending || locked) return
    setPending(true)
    setError('')
    try {
      await send(action, body)
      if (alive.current) done?.()
    } catch (e) {
      if (alive.current) setError((e as Error).message)
    } finally {
      if (alive.current) setPending(false)
    }
  }
  const world = (x: number, y: number) => {
    const rect = viewport.current!.getBoundingClientRect(),
      v = viewRef.current
    return { x: (x - rect.left - v.x) / v.zoom, y: (y - rect.top - v.y) / v.zoom }
  }
  function clearDrag(d: Drag) {
    if (drag.current === d) drag.current = null
    if (alive.current) {
      setLocal({})
      setLinePoint(null)
    }
  }
  async function finishCard(d: Drag) {
    if (!d.token) return
    if (d.cancelled || !d.moved) {
      await sendRef.current('board-release', { id: d.id, token: d.token }).catch(() => {})
      clearDrag(d)
      return
    }
    if (alive.current) setPending(true)
    try {
      await sendRef.current('board-layout', {
        token: d.token,
        positions: [{ id: d.id, ...d.point, revision: d.revision }],
      })
    } catch (e) {
      if (alive.current) setError((e as Error).message)
      await sendRef.current('board-release', { id: d.id, token: d.token }).catch(() => {})
    } finally {
      clearDrag(d)
      if (alive.current) setPending(false)
    }
  }
  async function startCard(e: ReactPointerEvent, id: string) {
    if (e.button !== 0 || locked || pending || drag.current) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    select(id)
    selectLink('')
    const d: Drag = {
      kind: 'card',
      id,
      pointer: e.pointerId,
      start: { x: e.clientX, y: e.clientY },
      origin: positions[id],
      point: positions[id],
      revision: positions[id].revision,
    }
    drag.current = d
    setError('')
    try {
      const next = await sendRef.current('board-claim', { id })
      d.token = next.board?.leases[id]?.token
      if (d.cancelled || !alive.current || d.finished) await finishCard(d)
    } catch (error) {
      clearDrag(d)
      if (alive.current) setError((error as Error).message)
    }
  }
  function startLine(e: ReactPointerEvent, id: string) {
    if (e.button !== 0 || locked || pending || drag.current) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = world(e.clientX, e.clientY)
    drag.current = { kind: 'link', id, pointer: e.pointerId, start: p, origin: p, point: p }
    setConnect({ source: id, target: '' })
    select(id)
    selectLink('')
    setLinePoint(p)
  }
  function move(e: ReactPointerEvent) {
    const d = drag.current
    if (!d || d.pointer !== e.pointerId || d.finished) return
    if (d.kind === 'pan') {
      setView((v) => ({
        ...v,
        x: d.origin.x + e.clientX - d.start.x,
        y: d.origin.y + e.clientY - d.start.y,
      }))
      return
    }
    if (d.kind === 'link') {
      d.point = world(e.clientX, e.clientY)
      setLinePoint(d.point)
      return
    }
    const dx = (e.clientX - d.start.x) / viewRef.current.zoom,
      dy = (e.clientY - d.start.y) / viewRef.current.zoom
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
    d.point = boundPosition(d.origin.x + dx, d.origin.y + dy)
    setLocal({ [d.id!]: d.point })
  }
  function end(e: ReactPointerEvent, cancelled = false) {
    const d = drag.current
    if (!d || d.pointer !== e.pointerId) return
    d.finished = true
    d.cancelled = cancelled
    if (d.kind === 'card') {
      void finishCard(d)
      return
    }
    if (d.kind === 'link') {
      const el = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>('[data-card-id]')
      if (!cancelled && el?.dataset.cardId && el.dataset.cardId !== d.id) {
        setConnect({ source: d.id!, target: el.dataset.cardId })
        setRelation('related')
        setExplanation('')
      } else if (cancelled) setConnect(null)
    }
    clearDrag(d)
  }
  function choose(id: string) {
    select(id)
    selectLink('')
    if (connect && !connect.target && id !== connect.source) setConnect({ ...connect, target: id })
  }
  function chooseLink(id: string) {
    const l = game.links.find((x) => x.id === id)!
    selectLink(id)
    select('')
    setConnect(null)
    setRelation(l.relationship || 'related')
    setExplanation(l.explanation || '')
  }
  const canEdit = !locked && !pending
  function card(id: string, canvas: boolean) {
    const c = game.shared.find((x) => x.id === id),
      s = dossier.suspects.find((x) => 'suspect:' + x.id === id)
    const lease = game.board?.leases[id],
      held = lease && lease.until > clock && lease.by !== userId
    const linked = game.links.some(
      (l) =>
        (l.source === id && l.target === selected) || (l.target === id && l.source === selected),
    )
    return (
      <article
        key={id}
        data-card-id={id}
        className={
          'board-card' +
          (s ? ' board-suspect' : '') +
          (selected === id ? ' selected' : '') +
          (selected && id !== selected && !linked ? ' muted-card' : '') +
          (held ? ' held' : '')
        }
        style={
          canvas
            ? {
                left: positions[id].x,
                top: positions[id].y,
                width: BOARD.cardWidth,
                height: BOARD.cardHeight,
              }
            : undefined
        }
      >
        <button
          className="board-card-grip"
          disabled={!canEdit || !!held}
          aria-label={'Move ' + title(id)}
          title="Drag to arrange. Arrow keys move, Shift moves further."
          onPointerDown={(e) => canvas && void startCard(e, id)}
          onKeyDown={(e) => {
            if (!canvas || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key))
              return
            e.preventDefault()
            const step = e.shiftKey ? 60 : 20,
              p = positions[id],
              next = boundPosition(
                p.x + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0),
                p.y + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0),
              )
            void run('board-layout', { positions: [{ id, ...next, revision: p.revision }] })
          }}
        >
          <span>
            {s ? 'SUSPECT' : game.board?.positions[id] ? 'EVIDENCE' : 'INBOX'}{' '}
            {game.pinned.includes(id) ? ' / ★' : ''}
          </span>
          <span aria-hidden="true">⠿</span>
        </button>
        <button
          className="board-card-body"
          aria-pressed={selected === id}
          onClick={() => choose(id)}
        >
          <span className="board-card-symbol" aria-hidden="true">
            {s ? s.initials : '⌕'}
          </span>
          <strong>{title(id)}</strong>
          <span>{s ? s.role : c?.body.slice(0, 83) + (c && c.body.length > 83 ? '…' : '')}</span>
        </button>
        <div className="board-card-foot">
          <small>
            {held
              ? (game.members.find((m) => m.id === lease.by)?.name || 'Partner') + ' is moving'
              : s
                ? 'PERSON OF INTEREST'
                : 'RECORDED ' + c?.time}
          </small>
          <button
            aria-label={'Connect ' + title(id)}
            title="Drag to another card, or select and use Connect to"
            disabled={!canEdit}
            onPointerDown={(e) => canvas && startLine(e, id)}
            onClick={(e) => {
              if (canvas && e.detail > 0) return
              if (!connect) {
                setConnect({ source: id, target: '' })
                select(id)
                selectLink('')
                setRelation('related')
                setExplanation('')
              }
            }}
          >
            ⊕
          </button>
        </div>
      </article>
    )
  }
  const relatedLinks = game.links.filter(
    (l) => !selected || l.source === selected || l.target === selected,
  )
  return (
    <section className="caseboard" aria-label="Shared caseboard">
      <div className="board-toolbar">
        <div>
          <span className="eyebrow">SHARED CASEBOARD</span>
          <p>
            {game.shared.length}/10 clues · {game.links.length} connections
            {closed ? ' · Archived' : ''}
          </p>
        </div>
        <div className="board-tools">
          <button
            className="btn ghost small"
            onClick={() => {
              clearDrag(drag.current || ({ kind: 'pan' } as Drag))
              setList(!list)
            }}
          >
            {list ? 'Canvas view' : 'List view'}
          </button>
          {!list && (
            <>
              <button className="btn ghost small" onClick={fit}>
                Fit board
              </button>
              <button
                className="btn ghost small"
                aria-label="Zoom out"
                onClick={() => zoomAt(1 / 1.2)}
              >
                −
              </button>
              <span className="board-zoom">{Math.round(view.zoom * 100)}%</span>
              <button className="btn ghost small" aria-label="Zoom in" onClick={() => zoomAt(1.2)}>
                +
              </button>
            </>
          )}
          <button
            className="btn ghost small"
            disabled={!canEdit}
            onClick={() =>
              void run(
                'board-layout',
                {
                  positions: Object.entries(
                    tidyPositions(game.shared, dossier.suspects, dossier.locations),
                  ).map(([id, p]) => ({ id, ...p, revision: positions[id].revision })),
                },
                () => setMessage('Cards grouped by museum location. You can undo this layout.'),
              )
            }
          >
            Tidy layout
          </button>
          <button
            className="btn ghost small"
            disabled={!canEdit || !myChange}
            onClick={() =>
              void run(
                'board-undo',
                {
                  id: myChange?.id,
                  positions: ids.map((id) => ({
                    id,
                    ...initialPosition(id, game.shared, dossier.suspects),
                  })),
                },
                () => setMessage('Your last board change was undone.'),
              )
            }
          >
            Undo my change
          </button>
        </div>
      </div>
      <div className="board-feedback" aria-live="polite">
        {pending
          ? 'Saving board…'
          : message ||
            'Connections are your theories. They are evaluated only when you submit a conclusion.'}
      </div>
      {error && (
        <div className="notice error-inline" role="alert">
          {error}
          <button className="text-btn" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}
      <div className={'board-workspace' + (list ? ' list-mode' : '')}>
        {list ? (
          <div className="board-card-list">
            <h2>Evidence inbox & suspects</h2>
            {!game.shared.length && (
              <p>Inspect a museum location and share your first clue to begin.</p>
            )}
            {ids.map((id) => card(id, false))}
            <h2>Connections</h2>
            {game.links.length ? (
              game.links.map((l) => (
                <button
                  className="connection-list-item"
                  key={l.id}
                  onClick={() => chooseLink(l.id)}
                >
                  {title(l.source)} <span>{labels[l.relationship || 'related']}</span>{' '}
                  {title(l.target)}
                </button>
              ))
            ) : (
              <p className="muted">Select a clue and choose Connect to.</p>
            )}
          </div>
        ) : (
          <div
            className="board-viewport"
            ref={viewport}
            tabIndex={0}
            aria-label="Evidence canvas. Drag empty space to pan. Use zoom buttons to magnify. Move focused cards with arrow keys."
            onPointerDown={(e) => {
              if (
                e.button !== 0 ||
                drag.current ||
                (e.target as HTMLElement).closest('button,article,[data-edge]')
              )
                return
              e.currentTarget.setPointerCapture(e.pointerId)
              drag.current = {
                kind: 'pan',
                pointer: e.pointerId,
                start: { x: e.clientX, y: e.clientY },
                origin: { x: view.x, y: view.y },
                point: { x: view.x, y: view.y },
              }
            }}
            onPointerMove={move}
            onPointerUp={(e) => end(e)}
            onPointerCancel={(e) => end(e, true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (drag.current) {
                  drag.current.cancelled = true
                  drag.current.finished = true
                  if (drag.current.kind === 'card') void finishCard(drag.current)
                  else clearDrag(drag.current)
                }
                setConnect(null)
              }
            }}
          >
            <div
              className="board-world"
              style={{
                width: BOARD.width,
                height: BOARD.height,
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
              }}
            >
              <span className="board-zone" style={{ left: 28, top: 32 }}>
                EVIDENCE INBOX / YOUR WORKING LAYOUT
              </span>
              <span className="board-zone" style={{ left: 1390, top: 32 }}>
                SUSPECTS
              </span>
              {!game.shared.length && (
                <div className="board-empty">
                  <h2>Every connection starts with a discovery.</h2>
                  <p>Return to Investigate, inspect a location, and share evidence here.</p>
                </div>
              )}
              <svg
                className="board-lines"
                width={BOARD.width}
                height={BOARD.height}
                aria-label="Evidence relationships"
              >
                {game.links.map((l) => {
                  if (!positions[l.source] || !positions[l.target]) return null
                  const p = connectionPath(positions[l.source], positions[l.target]),
                    active = selectedLink === l.id || selected === l.source || selected === l.target
                  return (
                    <g
                      key={l.id}
                      data-edge="true"
                      className={
                        'board-edge ' +
                        (l.relationship || 'related') +
                        (active ? ' active' : '') +
                        (selected && !active ? ' dim' : '')
                      }
                      role="button"
                      tabIndex={0}
                      aria-label={
                        title(l.source) +
                        ', ' +
                        labels[l.relationship || 'related'] +
                        ', ' +
                        title(l.target)
                      }
                      onClick={() => chooseLink(l.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          chooseLink(l.id)
                        }
                      }}
                    >
                      <path className="edge-hit" d={p.d} />
                      <path className="edge-line" d={p.d} />
                      {active && (
                        <g>
                          <rect x={p.x - 83} y={p.y - 14} width={166} height={28} rx={8} />
                          <text x={p.x} y={p.y + 4} textAnchor="middle">
                            {labels[l.relationship || 'related']}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}
                {linePoint && connect && positions[connect.source] && (
                  <path
                    className="edge-preview"
                    d={`M ${positions[connect.source].x + BOARD.cardWidth / 2} ${positions[connect.source].y + BOARD.cardHeight / 2} L ${linePoint.x} ${linePoint.y}`}
                  />
                )}
              </svg>
              {ids.map((id) => card(id, true))}
            </div>
            <span className="board-pan-hint">
              Drag empty space to pan · Drag a card header to arrange · Drag ⊕ to connect
            </span>
          </div>
        )}
        <aside className="board-inspector" aria-label="Selected evidence and connections">
          {connect || link ? (
            <>
              <span className="eyebrow">INVESTIGATOR THEORY</span>
              <h2>{link ? 'Edit connection' : 'Connect the evidence'}</h2>
              <p>{title(link?.source || connect!.source)}</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void run(
                    link ? 'update-link' : 'link',
                    link
                      ? {
                          id: link.id,
                          version: link.version || 'legacy',
                          relationship: relation,
                          explanation,
                        }
                      : {
                          source: connect!.source,
                          target: connect!.target,
                          relationship: relation,
                          explanation,
                        },
                    () => {
                      setConnect(null)
                      selectLink('')
                      setMessage(
                        'Connection saved. This is a working theory, not a confirmed deduction.',
                      )
                    },
                  )
                }}
              >
                <label>
                  Connect to
                  {link ? (
                    <strong className="connection-target">{title(link.target)}</strong>
                  ) : (
                    <select
                      className="input"
                      value={connect!.target}
                      required
                      onChange={(e) => setConnect({ ...connect!, target: e.target.value })}
                    >
                      <option value="">Choose a card or click one</option>
                      {ids
                        .filter(
                          (id) =>
                            id !== connect!.source &&
                            (!connect!.source.startsWith('suspect:') || !id.startsWith('suspect:')),
                        )
                        .map((id) => (
                          <option key={id} value={id}>
                            {title(id)}
                          </option>
                        ))}
                    </select>
                  )}
                </label>
                <label>
                  Relationship
                  <select
                    className="input"
                    value={relation}
                    onChange={(e) => setRelation(e.target.value as Relationship)}
                  >
                    {Object.entries(labels).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Why do these connect? <span className="muted">Optional</span>
                  <textarea
                    className="input"
                    value={explanation}
                    maxLength={300}
                    onChange={(e) => setExplanation(e.target.value)}
                  />
                </label>
                <button className="btn" disabled={!canEdit}>
                  Save connection
                </button>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => {
                    setConnect(null)
                    selectLink('')
                  }}
                >
                  Cancel
                </button>
              </form>
              {link && (
                <>
                  <p className="muted">Last edited by {link.by}</p>
                  <button
                    className="text-btn remove-connection"
                    disabled={!canEdit}
                    onClick={() =>
                      void run('unlink', { id: link.id, version: link.version || 'legacy' }, () =>
                        selectLink(''),
                      )
                    }
                  >
                    Remove connection
                  </button>
                </>
              )}
            </>
          ) : selectedClue || selectedSuspect ? (
            <>
              <div className="section-head">
                <span className="eyebrow">
                  {selectedClue ? 'EVIDENCE FILE' : 'SUSPECT DOSSIER'}
                </span>
                <button
                  className="text-btn"
                  aria-label="Clear selected card"
                  onClick={() => select('')}
                >
                  ×
                </button>
              </div>
              <h2>{title(selected)}</h2>
              {selectedClue ? (
                <>
                  <p className="muted">
                    {selectedClue.kind} · Recorded {selectedClue.time}
                  </p>
                  <div className="clue-paper">
                    <p>{selectedClue.body}</p>
                  </div>
                  <p>{selectedClue.inference}</p>
                  <label className="review-box">
                    <input
                      type="checkbox"
                      checked={game.reviewed[userId]?.includes(selected) || false}
                      disabled={!canEdit}
                      onChange={(e) =>
                        void run('review', { id: selected, reviewed: e.target.checked })
                      }
                    />
                    <span>Reviewed by me</span>
                  </label>
                  <small className="muted">
                    Reviewed by{' '}
                    {game.members
                      .filter((m) => game.reviewed[m.id]?.includes(selected))
                      .map((m) => m.name)
                      .join(', ') || 'no investigators yet'}
                  </small>
                  <button
                    className="text-btn"
                    disabled={!canEdit}
                    onClick={() => void run('pin', { id: selected })}
                  >
                    {game.pinned.includes(selected) ? 'Unmark important' : 'Mark important'}
                  </button>
                </>
              ) : (
                <>
                  <p className="muted">{selectedSuspect!.role}</p>
                  <p>{selectedSuspect!.detail}</p>
                  <blockquote>{selectedSuspect!.statement}</blockquote>
                  <p>
                    <strong>Possible motive:</strong> {selectedSuspect!.motive}
                  </p>
                  <p>
                    <strong>Opportunity:</strong> {selectedSuspect!.opportunity}
                  </p>
                  <p>
                    <strong>Alibi:</strong> {selectedSuspect!.alibi}
                  </p>
                </>
              )}
              <button
                className="btn ghost small"
                disabled={!canEdit}
                onClick={() => {
                  setConnect({ source: selected, target: '' })
                  setRelation('related')
                  setExplanation('')
                }}
              >
                Connect to…
              </button>
              <h3>Connections</h3>
              {relatedLinks.length ? (
                relatedLinks.map((l) => (
                  <button
                    className="connection-list-item"
                    key={l.id}
                    onClick={() => chooseLink(l.id)}
                  >
                    <span>{labels[l.relationship || 'related']}</span>
                    {title(l.source === selected ? l.target : l.source)}
                  </button>
                ))
              ) : (
                <p className="muted">No connections yet.</p>
              )}
              <h3>Notes on this card</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void run('note', { text: note, subject: selected }, () => setNote(''))
                }}
              >
                <label>
                  Observation
                  <textarea
                    className="input"
                    value={noteSubject === selected ? note : ''}
                    onChange={(e) => {
                      setNoteSubject(selected)
                      setNote(e.target.value)
                    }}
                    maxLength={500}
                    required
                    disabled={!canEdit}
                  />
                </label>
                <button className="btn ghost small" disabled={!canEdit}>
                  Save card note
                </button>
              </form>
              {game.notes
                .filter((n) => n.subject === selected)
                .map((n) => (
                  <article className="note" key={n.id}>
                    <small>{n.by}</small>
                    <p>{n.text}</p>
                  </article>
                ))}
            </>
          ) : (
            <div className="board-inspector-empty">
              <span className="eyebrow">FOLLOW THE EVIDENCE</span>
              <h2>Choose a card.</h2>
              <p>
                Read the original file, connect it to another discovery, or leave an observation for
                your partner.
              </p>
              <ol>
                <li>Share clues from Investigate.</li>
                <li>Arrange cards by their headers.</li>
                <li>Drag ⊕ to a second card.</li>
                <li>Explain the relationship.</li>
              </ol>
              <p className="muted">
                Your view is yours. Card positions and connections are shared.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
