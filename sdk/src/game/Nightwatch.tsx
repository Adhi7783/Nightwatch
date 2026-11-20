import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AuthOverlay, useAuth, getAuthToken, signOut } from 'deepspace'
import type { Profile, PublicGame, Dossier, Evidence, Theory } from './types'

type Page =
  | 'mission'
  | 'overview'
  | 'evidence'
  | 'suspects'
  | 'notebook'
  | 'timeline'
  | 'accusation'
const titles: Record<Page, string> = {
  mission: 'Mission Control',
  overview: 'Case overview',
  evidence: 'Evidence board',
  suspects: 'Suspect dossiers',
  notebook: 'Shared notebook',
  timeline: 'Timeline',
  accusation: 'Accusation & report',
}
const when = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const codeLabel = (s: string) => s.match(/.{1,4}/g)?.join('–') || s
async function api<T>(
  action: string,
  body?: Record<string, unknown>,
  code?: string,
  params: Record<string, string> = {},
): Promise<T> {
  const token = await getAuthToken()
  if (!token) throw Error('Sign in to DeepSpace to continue.')
  const url = new URL('/api/nightwatch/' + action, location.origin)
  if (code) url.searchParams.set('code', code)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify({ ...body, code }) : undefined,
    signal: AbortSignal.timeout(15000),
  })
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok)
    throw Error(data.error || 'The archive could not complete that request. Retry when connected.')
  return data
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (d && !d.open) d.showModal()
    return () => {
      d?.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return (
    <dialog ref={ref} className="modal" aria-label={title} onCancel={onClose}>
      <button className="close" aria-label="Close dialog" onClick={onClose}>
        ×
      </button>
      <h2>{title}</h2>
      {children}
    </dialog>
  )
}
function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <button className="brand text-btn" onClick={onClick}>
      <span className="brandmark">N</span>
      <span>
        NIGHTWATCH<small>FORENSIC COMMAND</small>
      </span>
    </button>
  )
}
function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="heading">
      <div>
        <span className="eyebrow">CASE 001 / BELLWETHER MUSEUM</span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
    </div>
  )
}

export default function Nightwatch() {
  const auth = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null),
    [game, setGame] = useState<PublicGame | null>(null),
    [dossier, setDossier] = useState<Dossier | null>(null)
  const [page, setPage] = useState<Page>('mission'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [live, setLive] = useState(false)
  const [modal, setModal] = useState<'invite' | 'join' | 'profile' | 'reveal' | null>(null),
    [clue, setClue] = useState<Evidence | null>(null)
  const [name, setName] = useState(''),
    [joinCode, setJoinCode] = useState(''),
    [note, setNote] = useState(''),
    [source, setSource] = useState(''),
    [target, setTarget] = useState('')
  const [theory, setTheory] = useState<Theory>({
    suspect: '',
    method: '',
    motive: '',
    evidence: [],
    explanation: '',
  })
  const activeCode = game?.code
  const requestRef = useRef<{ body: string; id: string } | null>(null)
  const generation = useRef(0)

  async function openRoom(code: string, join = false) {
    setError('')
    const g = await api<PublicGame>(join ? 'join' : 'room', join ? {} : undefined, code)
    const d = await api<Dossier>('dossier', undefined, code)
    setGame(g)
    setDossier(d)
    setPage('overview')
    setModal(null)
    localStorage.setItem('nightwatch-sdk-room', code)
    setProfile((await api<{ profile: Profile }>('profile')).profile)
  }
  useEffect(() => {
    if (!auth.isLoaded) return
    const epoch = ++generation.current
    if (!auth.isSignedIn) {
      setProfile(null)
      setGame(null)
      setDossier(null)
      setModal(null)
      setClue(null)
      setNote('')
      setTheory({ suspect: '', method: '', motive: '', evidence: [], explanation: '' })
      requestRef.current = null
      setLoaded(true)
      return
    }
    setLoaded(false)
    api<{ profile: Profile }>('profile')
      .then(async ({ profile: p }) => {
        if (epoch !== generation.current) return
        setProfile(p)
        setName(p.name)
        const invitation = new URL(location.href).searchParams.get('join')
        if (invitation) {
          setJoinCode(invitation)
          setModal('join')
        } else {
          const saved = localStorage.getItem('nightwatch-sdk-room')
          if (saved && p.rooms.includes(saved)) await openRoom(saved)
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true))
  }, [auth.isLoaded, auth.isSignedIn, auth.userId])

  useEffect(() => {
    if (!activeCode || !auth.isSignedIn) return
    let cancelled = false,
      socket: WebSocket | undefined,
      retry: ReturnType<typeof setTimeout> | undefined,
      refreshing = false
    const refresh = async () => {
      if (refreshing || cancelled) return
      refreshing = true
      try {
        const next = await api<PublicGame>('room', undefined, activeCode)
        if (!cancelled) setGame(next)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        refreshing = false
      }
    }
    const connect = async () => {
      try {
        const token = await getAuthToken()
        if (cancelled || !token) return
        socket = new WebSocket(
          location.origin.replace(/^http/, 'ws') +
            '/api/nightwatch/live?code=' +
            activeCode +
            '&token=' +
            encodeURIComponent(token),
        )
        socket.onopen = () => {
          if (cancelled) return
          setLive(true)
          socket!.send(
            JSON.stringify({
              type: 'core.subscribe',
              payload: { subscriptionId: 'case', query: { collection: 'game', limit: 1 } },
            }),
          )
        }
        socket.onmessage = (e) => {
          if (e.data === 'pong') return
          try {
            const m = JSON.parse(e.data)
            if (['core.query_result', 'core.record_change'].includes(m.type)) void refresh()
            if (m.type === 'core.error') setError(m.payload?.error || 'Live subscription refused.')
          } catch {
            setError('A live update could not be read. Reconnect to refresh.')
          }
        }
        socket.onclose = () => {
          setLive(false)
          if (!cancelled) retry = setTimeout(connect, 2000)
        }
        socket.onerror = () => socket?.close()
      } catch {
        if (!cancelled) retry = setTimeout(connect, 3000)
      }
    }
    void connect()
    const timer = setInterval(() => {
      void api('heartbeat', {}, activeCode).catch(() => {})
      if (socket?.readyState === WebSocket.OPEN) socket.send('ping')
    }, 20000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearTimeout(retry)
      clearInterval(timer)
      socket?.close()
      setLive(false)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [activeCode, auth.isSignedIn])

  async function perform(fn: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function mutate(action: string, body: Record<string, unknown> = {}) {
    if (!game) return
    const fingerprint = JSON.stringify({ action, body, code: game.code })
    if (requestRef.current?.body !== fingerprint)
      requestRef.current = { body: fingerprint, id: crypto.randomUUID() }
    const g = await api<PublicGame>(
      action,
      { ...body, requestId: requestRef.current.id },
      game.code,
    )
    requestRef.current = null
    setGame(g)
    return g
  }
  function mission() {
    setPage('mission')
    setGame(null)
    setDossier(null)
    localStorage.removeItem('nightwatch-sdk-room')
  }
  async function inspect(locationId: string) {
    if (!game) return
    const result = await api<{ clues: Evidence[] }>('inspect', undefined, game.code, {
      location: locationId,
    })
    setClue(result.clues[0] || null)
    setLocationClues(result.clues)
  }
  const [locationClues, setLocationClues] = useState<Evidence[]>([])
  function submit(e: FormEvent, fn: () => Promise<void>) {
    e.preventDefault()
    void perform(fn)
  }
  const locked = busy || game?.status !== 'investigating'
  const self = game?.members.find((m) => m.id === profile?.id)
  if (!auth.isLoaded || !loaded)
    return (
      <div className="boot" role="status">
        Opening Nightwatch…
      </div>
    )
  if (!auth.isSignedIn)
    return (
      <>
        <link rel="stylesheet" href="/nightwatch.css" />
        <header className="lobby-header">
          <Brand />
          <span className="eyebrow">A CASE FOR TWO</span>
        </header>
        <main className="lobby-main">
          <div className="lobby-hero">
            <div className="lobby-copy">
              <span className="eyebrow">CASE 001 / THE MIDNIGHT MUSEUM HEIST</span>
              <h1>
                Some truths
                <br />
                take <em>two.</em>
              </h1>
              <p>
                A sealed display. Ten pieces of evidence. Three people with something to hide. Sign
                in through DeepSpace to open your investigation.
              </p>
              <div className="notice">
                Play solo or invite one partner. Your detective profile and cases follow your
                DeepSpace account.
              </div>
            </div>
            <div className="lobby-art">
              <img src="/meridian.svg" alt="The Glass Meridian astronomical instrument" />
            </div>
          </div>
          <AuthOverlay providers={['github', 'google']} />
          {error && <p role="alert">{error}</p>}
        </main>
      </>
    )
  return (
    <>
      <link rel="stylesheet" href="/nightwatch.css" />
      <div className="shell">
        <aside className="rail">
          <Brand onClick={mission} />
          <div className="rail-label">INVESTIGATION TERMINAL</div>
          <nav className="nav" aria-label="Nightwatch">
            {(Object.keys(titles) as Page[])
              .filter((p) => p === 'mission' || game)
              .map((p) => (
                <button
                  key={p}
                  className={page === p ? 'active' : ''}
                  aria-current={page === p ? 'page' : undefined}
                  onClick={() => (p === 'mission' ? mission() : setPage(p))}
                >
                  {titles[p]}
                </button>
              ))}
          </nav>
          <div className="rail-bottom">
            <button
              className="text-btn"
              onClick={() => {
                setName(profile?.name || '')
                setModal('profile')
              }}
            >
              {profile?.name || 'Choose detective name'}
              {self && (
                <small className="muted">
                  {' '}
                  · {game?.hostId === profile?.id ? 'Host' : 'Partner'}
                </small>
              )}
            </button>
            <br />
            <button
              className="text-btn"
              onClick={() =>
                void perform(async () => {
                  await signOut()
                  mission()
                })
              }
            >
              Sign out
            </button>
            <p className="powered">BUILT ON DEEPSPACE</p>
          </div>
        </aside>
        <div>
          <header className="topbar">
            <span className="eyebrow">{titles[page]}</span>
            <div className="top-actions">
              {game && (
                <>
                  <span className="live">
                    <i className={'dot ' + (live ? '' : 'off')} />
                    {live ? 'Connected' : 'Reconnecting…'}
                  </span>
                  <button className="room-pill" onClick={() => setModal('invite')}>
                    {codeLabel(game.code)}
                  </button>
                </>
              )}
            </div>
          </header>
          <main className="main">
            {error && (
              <div className="notice error-inline" role="alert">
                {error}
                <button className="text-btn" onClick={() => setError('')}>
                  Dismiss
                </button>
              </div>
            )}
            {busy && <p role="status">Saving…</p>}
            {!profile?.name ? (
              <section className="panel">
                <Heading title="Choose your detective identity." />
                <form
                  onSubmit={(e) =>
                    submit(e, async () => {
                      const p = await api<{ profile: Profile }>('profile', { name })
                      setProfile(p.profile)
                    })
                  }
                >
                  <label htmlFor="first-name">Detective name</label>
                  <input
                    className="input"
                    id="first-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    minLength={2}
                    maxLength={24}
                    required
                  />
                  <div className="modal-actions">
                    <button className="btn" disabled={busy}>
                      Save detective identity
                    </button>
                  </div>
                </form>
              </section>
            ) : page === 'mission' ? (
              <>
                <Heading title="Mission Control.">
                  One complete case. A partner if you need one.
                </Heading>
                <section className="case-hero">
                  <div className="hero-copy">
                    <span className="eyebrow">CASE 001 / HAND-AUTHORED MYSTERY</span>
                    <h2>
                      The Midnight
                      <br />
                      <em>Museum Heist.</em>
                    </h2>
                    <p>
                      The Glass Meridian disappears during a museum security outage. The display
                      seal is still intact. Investigate the timing, identify the culprit, and
                      recover the instrument.
                    </p>
                    <div className="case-meta">1–2 investigators / 10 clues / 3 suspects</div>
                    <div className="actions-row">
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() =>
                          void perform(async () => {
                            const g = await api<PublicGame>('create', {})
                            await openRoom(g.code)
                            setModal('invite')
                          })
                        }
                      >
                        Start a private case
                      </button>
                      <button className="btn ghost" onClick={() => setModal('join')}>
                        Join investigation
                      </button>
                    </div>
                  </div>
                  <div className="hero-art">
                    <img src="/meridian.svg" alt="The Glass Meridian in a museum gallery" />
                  </div>
                </section>
                <section className="panel">
                  <h2 className="panel-title">Resume an investigation</h2>
                  {profile.rooms.length ? (
                    <div className="room-list">
                      {profile.rooms.map((code) => (
                        <div className="archive-item" key={code}>
                          <span>
                            Case 001 · <span className="mono">{codeLabel(code)}</span>
                            {profile.closed.includes(code) ? ' · Closed' : ''}
                          </span>
                          <button
                            className="btn ghost small"
                            disabled={busy}
                            onClick={() => void perform(() => openRoom(code))}
                          >
                            Resume
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">
                      Your saved rooms will appear here. Room progress is stored on DeepSpace.
                    </p>
                  )}
                </section>
              </>
            ) : game && dossier ? (
              <>
                {page === 'overview' && (
                  <>
                    <Heading title={game.title}>
                      {game.status === 'waiting'
                        ? 'Lobby — the host chooses when to begin.'
                        : game.status === 'closed'
                          ? 'Completed investigation. Your history is preserved.'
                          : 'Inspect, compare, and connect the evidence.'}
                    </Heading>
                    <section className="panel">
                      <span className="eyebrow">CASE BRIEF</span>
                      <p>{dossier.brief}</p>
                      <div className="actions-row">
                        {game.status === 'waiting' && game.hostId === profile.id && (
                          <button
                            className="btn"
                            disabled={busy}
                            onClick={() =>
                              void perform(async () => {
                                await mutate('start')
                              })
                            }
                          >
                            Start case{game.members.length === 1 ? ' solo' : ''}
                          </button>
                        )}
                        <button className="btn ghost" onClick={() => setModal('invite')}>
                          Invite / room details
                        </button>
                        {game.status === 'closed' && (
                          <button className="btn" onClick={() => setPage('accusation')}>
                            Read final report
                          </button>
                        )}
                      </div>
                      <div className="notice">
                        {game.members.map((m) => (
                          <div key={m.id}>
                            {m.name} · {m.id === game.hostId ? 'Host' : 'Partner'} ·{' '}
                            {m.id === profile.id || Date.now() - m.seen < 65000 ? 'Online' : 'Away'}
                          </div>
                        ))}
                      </div>
                    </section>
                    <div className="section-head">
                      <h2>Investigate the museum</h2>
                      <small>{game.shared.length}/10 shared</small>
                    </div>
                    <section className="location-grid">
                      {dossier.locations.map((l) => (
                        <button
                          key={l.id}
                          className="location"
                          disabled={busy || game.status === 'waiting'}
                          onClick={() => void perform(() => inspect(l.id))}
                        >
                          <div className="location-graphic">
                            <span aria-hidden="true">{l.icon}</span>
                          </div>
                          <div className="location-copy">
                            <h3>{l.name}</h3>
                            <p>{l.type}</p>
                          </div>
                        </button>
                      ))}
                    </section>
                    <div className="section-head">
                      <h2>Latest developments</h2>
                    </div>
                    <section className="panel">
                      {game.events
                        .slice(-8)
                        .reverse()
                        .map((e, i) => (
                          <div className="feed" key={i}>
                            {e.text}
                            <time>{when(e.at)}</time>
                          </div>
                        ))}
                    </section>
                  </>
                )}
                {page === 'evidence' && (
                  <>
                    <Heading title="Build the case.">
                      Review clues and save connections to suspects or other evidence.
                    </Heading>
                    {game.shared.length ? (
                      <>
                        <section className="evidence-grid">
                          {game.shared.map((c) => (
                            <article className="evidence-card" key={c.id}>
                              <span className="eyebrow">{c.kind}</span>
                              <h3>{c.title}</h3>
                              <p>{c.inference}</p>
                              <button
                                className="btn ghost small"
                                onClick={() => {
                                  setLocationClues([])
                                  setClue(c)
                                }}
                              >
                                Read evidence
                              </button>
                              <label className="review-box">
                                <input
                                  type="checkbox"
                                  checked={game.reviewed[profile.id]?.includes(c.id) || false}
                                  disabled={locked}
                                  onChange={(e) =>
                                    void perform(async () => {
                                      await mutate('review', {
                                        id: c.id,
                                        reviewed: e.target.checked,
                                      })
                                    })
                                  }
                                />
                                <span>Reviewed by me</span>
                              </label>
                              <small className="muted">
                                Reviewed by{' '}
                                {game.members
                                  .filter((m) => game.reviewed[m.id]?.includes(c.id))
                                  .map((m) => m.name)
                                  .join(', ') || 'no investigators yet'}
                              </small>
                              <button
                                className="text-btn"
                                disabled={locked}
                                onClick={() =>
                                  void perform(async () => {
                                    await mutate('pin', { id: c.id })
                                  })
                                }
                              >
                                {game.pinned.includes(c.id) ? 'Unmark important' : 'Mark important'}
                              </button>
                            </article>
                          ))}
                        </section>
                        <section className="panel" style={{ marginTop: 25 }}>
                          <h2 className="panel-title">Evidence connections</h2>
                          <form
                            className="form-grid"
                            onSubmit={(e) =>
                              submit(e, async () => {
                                await mutate('link', { source, target })
                              })
                            }
                          >
                            <label>
                              From evidence
                              <select
                                className="input"
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                                required
                              >
                                <option value="">Choose a clue</option>
                                {game.shared.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.title}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Connect to
                              <select
                                className="input"
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                                required
                              >
                                <option value="">Choose evidence or a suspect</option>
                                {dossier.suspects.map((s) => (
                                  <option key={s.id} value={'suspect:' + s.id}>
                                    Suspect: {s.name}
                                  </option>
                                ))}
                                {game.shared
                                  .filter((c) => c.id !== source)
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.title}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <button className="btn" disabled={locked}>
                              Save connection
                            </button>
                          </form>
                          {game.links.map((l) => (
                            <div className="linked-row" key={l.id}>
                              <strong>{game.shared.find((c) => c.id === l.source)?.title}</strong> ·
                              connected to{' '}
                              <strong>
                                {l.target.startsWith('suspect:')
                                  ? dossier.suspects.find((s) => 'suspect:' + s.id === l.target)
                                      ?.name
                                  : game.shared.find((c) => c.id === l.target)?.title}
                              </strong>
                              <br />
                              <small className="muted">
                                By {l.by} · {when(l.at)}
                              </small>
                              <br />
                              <button
                                className="text-btn"
                                disabled={locked}
                                onClick={() =>
                                  void perform(async () => {
                                    await mutate('unlink', { id: l.id })
                                  })
                                }
                              >
                                Remove connection
                              </button>
                            </div>
                          ))}
                          {!game.links.length && (
                            <p className="muted">
                              No connections yet. Link a discovery to the person or evidence it
                              helps explain.
                            </p>
                          )}
                        </section>
                      </>
                    ) : (
                      <section className="empty">
                        <h2>Find your first lead.</h2>
                        <p>Inspect a museum location and share the evidence you discover.</p>
                        <button className="btn" onClick={() => setPage('overview')}>
                          Inspect locations
                        </button>
                      </section>
                    )}
                  </>
                )}
                {page === 'suspects' && (
                  <>
                    <Heading title="Three stories. One truth.">
                      Compare statements against the evidence; a motive alone is not proof.
                    </Heading>
                    <section className="suspect-grid">
                      {dossier.suspects.map((s) => (
                        <article className="suspect" key={s.id}>
                          <div className="portrait" style={{ background: s.color }}>
                            {s.initials}
                          </div>
                          <h2>{s.name}</h2>
                          <p className="job">{s.role}</p>
                          <p>{s.detail}</p>
                          <p>
                            <strong>Possible motive:</strong> {s.motive}
                          </p>
                          <p>
                            <strong>Opportunity:</strong> {s.opportunity}
                          </p>
                          <p>
                            <strong>Alibi:</strong> {s.alibi}
                          </p>
                          <blockquote>{s.statement}</blockquote>
                        </article>
                      ))}
                    </section>
                  </>
                )}
                {page === 'notebook' && (
                  <>
                    <Heading title="Your working theory.">
                      Notes persist and appear for both investigators without refreshing.
                    </Heading>
                    <section className="panel">
                      <form
                        className="note-form"
                        onSubmit={(e) =>
                          submit(e, async () => {
                            await mutate('note', { text: note })
                            setNote('')
                          })
                        }
                      >
                        <textarea
                          className="input"
                          aria-label="Case note"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          maxLength={500}
                          required
                          disabled={locked}
                        />
                        <button className="btn" disabled={locked}>
                          Save note
                        </button>
                      </form>
                      {game.notes.length ? (
                        game.notes
                          .slice()
                          .reverse()
                          .map((n) => (
                            <article className="note" key={n.id}>
                              <header>
                                {n.by}
                                <time>{when(n.at)}</time>
                              </header>
                              <p>{n.text}</p>
                            </article>
                          ))
                      ) : (
                        <p className="muted">
                          No notes yet. Record a contradiction or an emerging explanation.
                        </p>
                      )}
                    </section>
                  </>
                )}
                {page === 'timeline' && (
                  <>
                    <Heading title="Put the night in order.">
                      Evidence times indicate when investigators collected a file. The file
                      describes the underlying events.
                    </Heading>
                    <section className="timeline">
                      {[
                        {
                          time: '17:40',
                          title: 'Conservation inspection',
                          body: 'The last scheduled inspection before the gala.',
                        },
                        {
                          time: '21:30',
                          title: 'The gala toast',
                          body: 'Guests photograph the instrument on display.',
                        },
                        {
                          time: '22:17',
                          title: 'The alarm sounds',
                          body: 'The plinth reports an empty display.',
                        },
                        ...game.shared.map((c) => ({
                          time: c.time,
                          title: c.title,
                          body: c.inference,
                        })),
                      ]
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .map((entry, i) => (
                          <article className="timeline-item" key={i}>
                            <time>{entry.time}</time>
                            <div>
                              <h3>{entry.title}</h3>
                              <p>{entry.body}</p>
                            </div>
                          </article>
                        ))}
                    </section>
                  </>
                )}
                {page === 'accusation' &&
                  (game.reveal ? (
                    <>
                      <Heading
                        title={game.outcome === 'solved' ? 'Case solved.' : 'Case revealed.'}
                      >
                        The final investigation report.
                      </Heading>
                      <section className="reveal-head">
                        <span className="eyebrow">THE MIDNIGHT MUSEUM HEIST</span>
                        <h2>{game.reveal.title}</h2>
                        <p>{game.reveal.summary}</p>
                        <strong>Responsible: {game.reveal.culprit}</strong>
                      </section>
                      <div className="reveal-grid">
                        {(['method', 'motive', 'recovery', 'exonerated'] as const).map((k) => (
                          <article className="panel" key={k}>
                            <h3>
                              {k === 'exonerated'
                                ? 'The other suspects'
                                : k[0].toUpperCase() + k.slice(1)}
                            </h3>
                            <p>{game.reveal![k]}</p>
                          </article>
                        ))}
                      </div>
                      <div className="section-head">
                        <h2>Why the evidence fits</h2>
                      </div>
                      <section className="panel">
                        {game.reveal.proof.map((item) => (
                          <p key={item.id}>
                            <strong>
                              {game.shared.find((c) => c.id === item.id)?.title || item.id}
                            </strong>
                            <br />
                            {item.reason}
                          </p>
                        ))}
                      </section>
                      <div className="section-head">
                        <h2>Reconstructed timeline</h2>
                      </div>
                      {game.reveal.timeline.map(([at, text]) => (
                        <article className="timeline-item" key={at}>
                          <time>{at}</time>
                          <div>
                            <p>{text}</p>
                          </div>
                        </article>
                      ))}
                      <section className="panel">
                        <h2 className="panel-title">Investigator contributions</h2>
                        {game.members.map((m) => (
                          <p className="contribution" key={m.id}>
                            <strong>{m.name}</strong> ·{' '}
                            {game.contributions?.[m.id]?.evidence ??
                              game.events.filter((e) => e.by === m.id && e.kind === 'evidence')
                                .length}{' '}
                            evidence discoveries shared · {game.reviewed[m.id]?.length || 0} clues
                            reviewed ·{' '}
                            {game.contributions?.[m.id]?.links ??
                              game.events.filter((e) => e.by === m.id && e.kind === 'link')
                                .length}{' '}
                            connections ·{' '}
                            {game.contributions?.[m.id]?.notes ??
                              game.events.filter((e) => e.by === m.id && e.kind === 'note')
                                .length}{' '}
                            notes
                          </p>
                        ))}
                        <p>
                          {game.attempts} joint theories reviewed. This report and investigation
                          history are preserved.
                        </p>
                        <h3>Recorded accusations</h3>
                        {game.submissions.map((s, i) => (
                          <p key={i}>
                            {s.by} · {when(s.at)} ·{' '}
                            {dossier.suspects.find((x) => x.id === s.theory.suspect)?.name}
                            <br />
                            {s.theory.explanation}
                          </p>
                        ))}
                      </section>
                    </>
                  ) : (
                    <>
                      <Heading title="Make the evidence fit.">
                        Select a suspect, method, motive, and the clues that prove your explanation.
                      </Heading>
                      <section className="accuse-layout">
                        <form
                          className="panel form-grid"
                          onSubmit={(e) =>
                            submit(e, async () => {
                              await mutate('accuse', theory as unknown as Record<string, unknown>)
                            })
                          }
                        >
                          {(['suspect', 'method', 'motive'] as const).map((key) => (
                            <label key={key}>
                              {key[0].toUpperCase() + key.slice(1)}
                              <select
                                className="input"
                                value={theory[key]}
                                onChange={(e) => setTheory({ ...theory, [key]: e.target.value })}
                                required
                              >
                                <option value="">Choose {key}</option>
                                {(key === 'suspect'
                                  ? dossier.suspects.map((s) => ({ id: s.id, label: s.name }))
                                  : key === 'method'
                                    ? dossier.methods
                                    : dossier.motives
                                ).map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                          <fieldset style={{ border: '1px solid var(--line)' }}>
                            <legend>Supporting evidence</legend>
                            {game.shared.map((c) => (
                              <label className="review-box" key={c.id}>
                                <input
                                  type="checkbox"
                                  checked={theory.evidence.includes(c.id)}
                                  onChange={(e) =>
                                    setTheory({
                                      ...theory,
                                      evidence: e.target.checked
                                        ? [...theory.evidence, c.id]
                                        : theory.evidence.filter((id) => id !== c.id),
                                    })
                                  }
                                />
                                <span>{c.title}</span>
                              </label>
                            ))}
                            {!game.shared.length && (
                              <p>Share evidence before submitting a theory.</p>
                            )}
                          </fieldset>
                          <label>
                            Explain the connections
                            <textarea
                              className="input"
                              value={theory.explanation}
                              onChange={(e) =>
                                setTheory({ ...theory, explanation: e.target.value })
                              }
                              minLength={10}
                              maxLength={1000}
                              required
                            />
                          </label>
                          <button className="btn" disabled={locked || !theory.evidence.length}>
                            Submit accusation
                          </button>
                        </form>
                        <section className="panel">
                          <h2 className="panel-title">A reasoned conclusion.</h2>
                          <p>
                            A solo investigator can close the case. In a two-person room, both
                            investigators must submit the same conclusion, each supported by
                            sufficient evidence.
                          </p>
                          {game.members.map((m) => (
                            <p key={m.id}>
                              {m.name}:{' '}
                              {game.votes[m.id] ? 'Submitted' : 'Considering the evidence'}
                            </p>
                          ))}
                          {game.feedback && (
                            <div className="notice" role="status">
                              {game.feedback}
                            </div>
                          )}
                          <p className="muted">
                            {game.attempts} theories reviewed. Incorrect theories do not reveal the
                            solution.
                          </p>
                          <hr className="rule" />
                          <button
                            className="btn ghost"
                            disabled={locked}
                            onClick={() => setModal('reveal')}
                          >
                            Request full reveal
                          </button>
                          <p className="muted">
                            Both members must agree. This records a revealed case, rather than a
                            solved case.
                          </p>
                        </section>
                      </section>
                    </>
                  ))}
              </>
            ) : null}
            <footer className="foot">
              <span>NIGHTWATCH / ORIGINAL CASE FILES</span>
              <span>DeepSpace authentication · records · live sync</span>
            </footer>
          </main>
        </div>
      </div>
      {modal === 'join' && (
        <Modal title="Join a private investigation." onClose={() => setModal(null)}>
          <form
            onSubmit={(e) =>
              submit(e, () => openRoom(joinCode.replace(/[-–\s]/g, '').toUpperCase(), true))
            }
          >
            <label htmlFor="join-code">Invitation code</label>
            <input
              id="join-code"
              className="input mono"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              maxLength={16}
              required
            />
            <div className="modal-actions">
              <button className="btn" disabled={busy || !profile?.name}>
                Join case
              </button>
            </div>
            {!profile?.name && <p>Choose your detective name before joining.</p>}
            {error && (
              <p role="alert" className="error-inline">
                {error}
              </p>
            )}
          </form>
        </Modal>
      )}
      {modal === 'profile' && (
        <Modal title="Detective identity." onClose={() => setModal(null)}>
          <form
            onSubmit={(e) =>
              submit(e, async () => {
                setProfile((await api<{ profile: Profile }>('profile', { name })).profile)
                setModal(null)
              })
            }
          >
            <label htmlFor="detective-name">Saved detective name</label>
            <input
              className="input"
              id="detective-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={24}
              required
            />
            <div className="modal-actions">
              <button className="btn" disabled={busy}>
                Save profile
              </button>
            </div>
          </form>
          <p>
            This profile belongs to your signed-in DeepSpace account and can be resumed on another
            device.
          </p>
        </Modal>
      )}
      {modal === 'invite' && game && (
        <Modal title="Your investigation room." onClose={() => setModal(null)}>
          <p>Invite one partner before the host starts the case, or begin solo.</p>
          <div className="code-display">{codeLabel(game.code)}</div>
          <button
            className="btn"
            onClick={() =>
              void perform(async () => {
                await navigator.clipboard.writeText(location.origin + '/?join=' + game.code)
                setModal(null)
              })
            }
          >
            Copy private invite link
          </button>
          <p>
            Host: {game.members.find((m) => m.id === game.hostId)?.name}. {game.members.length}/2
            seats filled.
          </p>
        </Modal>
      )}
      {modal === 'reveal' && (
        <Modal title="End the investigation?" onClose={() => setModal(null)}>
          <p>
            The full explanation contains spoilers. In a two-person case, both members must agree.
            The case will be marked revealed.
          </p>
          <div className="modal-actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  await mutate('reveal')
                  setModal(null)
                })
              }
            >
              Request the reveal
            </button>
            <button className="btn ghost" onClick={() => setModal(null)}>
              Keep investigating
            </button>
          </div>
        </Modal>
      )}
      {clue && game && (
        <Modal title={clue.title} onClose={() => setClue(null)}>
          {locationClues.length > 1 && (
            <div className="filter-row">
              {locationClues.map((c) => (
                <button
                  className={'filter-btn ' + (c.id === clue.id ? 'active' : '')}
                  key={c.id}
                  onClick={() => setClue(c)}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
          <span className="eyebrow">
            {clue.kind} / {clue.time}
          </span>
          <div className="clue-paper">
            <p>{clue.body}</p>
          </div>
          <p>{clue.inference}</p>
          <button
            className="btn"
            disabled={locked || game.shared.some((c) => c.id === clue.id)}
            onClick={() =>
              void perform(async () => {
                await mutate('share', { id: clue.id })
                setClue(null)
              })
            }
          >
            {game.shared.some((c) => c.id === clue.id)
              ? 'Shared on the board'
              : 'Share with the investigation'}
          </button>
          {error && (
            <p role="alert" className="error-inline">
              {error}
            </p>
          )}
        </Modal>
      )}
    </>
  )
}
