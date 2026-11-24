import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AuthOverlay, useAuth, getAuthToken, signOut } from 'deepspace'
import type { Profile, PublicGame, Dossier, Evidence, Theory } from './types'
import { Machinery, Briefing, type Speech } from './CommandVisuals'
import { Hologram } from './Hologram'
import { Wordmark as Brand, PhaseMenu, type CommandDestination } from './CommandNavigation'
import { BriefingAudio } from './BriefingAudio'
import { needsBriefing } from './briefing-state'
import { Caseboard } from './Caseboard'

type Page = 'mission' | 'overview' | 'evidence' | 'accusation'
const titles: Record<Page, string> = {
  mission: 'Mission Control',
  overview: 'Investigate',
  evidence: 'Caseboard',
  accusation: 'Conclusion',
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
    signal: AbortSignal.timeout(['briefing', 'recap', 'report'].includes(action) ? 100000 : 15000),
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
  dismissible = true,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  dismissible?: boolean
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
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(e) => {
        if (!dismissible) e.preventDefault()
        else onClose()
      }}
    >
      {dismissible && (
        <button className="close" aria-label="Close dialog" onClick={onClose}>
          ×
        </button>
      )}
      <h2>{title}</h2>
      {children}
    </dialog>
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
    [note, setNote] = useState('')
  const [theory, setTheory] = useState<Theory>({
    suspect: '',
    method: '',
    motive: '',
    evidence: [],
    explanation: '',
  })
  const activeCode = game?.code
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [page, activeCode])
  const requestRef = useRef<{ body: string; id: string } | null>(null)
  const generation = useRef(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [recap, setRecap] = useState<{
    observations: { evidenceId: string; quote: string }[]
    evidenceCount: number
  } | null>(null)
  const [reportUrl, setReportUrl] = useState('')

  function acceptGame(next: PublicGame, expectedCode?: string) {
    setGame((current) =>
      expectedCode && current?.code !== expectedCode
        ? current
        : current?.code === next.code && (current.revision || 0) > (next.revision || 0)
          ? current
          : next,
    )
  }
  async function openRoom(code: string, join = false) {
    setError('')
    const g = await api<PublicGame>(join ? 'join' : 'room', join ? {} : undefined, code)
    const d = await api<Dossier>('dossier', undefined, code)
    acceptGame(g)
    setDossier(d)
    setPage('overview')
    setRecap(null)
    setReportUrl('')
    setMenuOpen(false)
    setModal(null)
    localStorage.setItem('nightwatch-sdk-room', code)
    setProfile((await api<{ profile: Profile }>('profile')).profile)
  }
  useEffect(() => {
    if (!auth.isLoaded) return
    const epoch = ++generation.current
    if (!auth.isSignedIn) {
      setMenuOpen(false)
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
        } else setPage('mission')
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
        if (!cancelled) acceptGame(next)
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
    acceptGame(g)
    return g
  }
  function mission() {
    setMenuOpen(false)
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
  const destinations: CommandDestination[] = (Object.keys(titles) as Page[])
    .filter((p) => p === 'mission' || (game && (p === 'overview' || game.status !== 'waiting')))
    .map((p) => ({
      id: p,
      title: p === 'overview' && game?.status === 'waiting' ? 'Case lobby' : titles[p],
      detail: p === 'mission' ? 'YOUR INVESTIGATION ARCHIVE' : 'PRIVATE CASE / 001',
      action: () => {
        if (p === 'mission') mission()
        else setPage(p)
      },
    }))
  if (!game)
    destinations.push(
      {
        id: 'create',
        title: 'Start a private case',
        detail: 'OPEN AN ORIGINAL MYSTERY',
        action: () =>
          void perform(async () => {
            const g = await api<PublicGame>('create', {})
            await openRoom(g.code)
          }),
      },
      {
        id: 'join',
        title: 'Join investigation',
        detail: 'ENTER A PRIVATE INVITATION',
        action: () => setModal('join'),
      },
    )
  destinations.push({
    id: 'profile',
    title: 'Detective identity',
    detail: profile?.name || 'YOUR PROFILE',
    action: () => {
      setName(profile?.name || '')
      setModal('profile')
    },
  })
  if (!auth.isLoaded || !loaded)
    return (
      <div className="boot" role="status">
        Opening Nightwatch…
      </div>
    )
  if (!auth.isSignedIn)
    return (
      <>
        <Machinery />
        <header className="lobby-header">
          <Brand onClick={() => setMenuOpen(true)} expanded={menuOpen} />
          <span className="eyebrow">A CASE FOR TWO</span>
        </header>
        {menuOpen && (
          <PhaseMenu
            onClose={() => setMenuOpen(false)}
            items={[
              {
                id: 'access',
                title: 'Access Nightwatch',
                detail: 'SIGN IN TO YOUR DETECTIVE PROFILE',
                action: () =>
                  document
                    .getElementById('player-access')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
              },
              {
                id: 'case',
                title: 'The museum heist',
                detail: 'EXPLORE YOUR FIRST CASE',
                action: () =>
                  document
                    .getElementById('case-introduction')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
              },
            ]}
          />
        )}
        <main className="lobby-main">
          <div className="lobby-hero" id="case-introduction">
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
              <Hologram scene="meridian" />
            </div>
          </div>
          <div id="player-access">
            <AuthOverlay providers={['github', 'google']} />
          </div>
          {error && <p role="alert">{error}</p>}
        </main>
      </>
    )
  if (needsBriefing(profile, game))
    return (
      <>
        <Briefing
          load={() => api<Speech>('briefing', {})}
          complete={async () => {
            const p = await api<{ profile: Profile }>('briefing-seen', {}, game!.code)
            setProfile(p.profile)
          }}
        />
      </>
    )
  return (
    <>
      <Machinery />
      <header className="command-header">
        <span className="header-system">
          N/W OS <i /> SECURE
        </span>
        <Brand onClick={() => setMenuOpen((v) => !v)} expanded={menuOpen} />
        <div className="header-account">
          <button
            className="text-btn detective-name"
            onClick={() => {
              setName(profile?.name || '')
              setModal('profile')
            }}
          >
            {profile?.name || 'IDENTITY PENDING'}
          </button>
          <button
            className="text-btn sign-out"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                await signOut()
                mission()
              })
            }
          >
            Sign out
          </button>
        </div>
      </header>
      {menuOpen && <PhaseMenu onClose={() => setMenuOpen(false)} items={destinations} />}
      <div className="shell">
        <div>
          <header className={'topbar' + (!game ? ' topbar-idle' : '')}>
            <span className="eyebrow">{titles[page]}</span>
            <div className="top-actions">
              {game && (
                <>
                  <BriefingAudio key={game.code} load={() => api<Speech>('briefing', {})} />
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
          {game && game.status !== 'waiting' && (
            <nav className="investigation-nav" aria-label="Investigation workspace">
              {(['overview', 'evidence', 'accusation'] as const).map((p, i) => (
                <button
                  key={p}
                  aria-current={page === p ? 'page' : undefined}
                  onClick={() => setPage(p)}
                >
                  <span className="nav-step">0{i + 1}</span>
                  {titles[p]}
                  {p === 'evidence' && <small>{game.shared.length}/10</small>}
                </button>
              ))}
            </nav>
          )}
          <main className={'main' + (page === 'evidence' ? ' main-caseboard' : '')}>
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
              <div className="identity-scene">
                <Modal title="Establish your identity." dismissible={false} onClose={() => {}}>
                  <p className="identity-intro">
                    Your clearance begins with a name. Choose how your partner will know you.
                  </p>
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
                </Modal>
              </div>
            ) : page === 'mission' ? (
              <>
                <div className="mission-intro">
                  <Heading title="Mission Control">
                    One complete case. A partner if you need one.
                  </Heading>
                </div>
                <section className="case-hero">
                  <div className="hero-copy">
                    <span className="eyebrow">CASE 001 / HAND-AUTHORED MYSTERY</span>
                    <h2>
                      The Midnight
                      <br />
                      <em>Museum Heist.</em>
                    </h2>
                    <p>
                      An alarm. An empty display. The Glass Meridian is missing, yet the display
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
                    <Hologram scene="meridian" />
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
                        ? 'Lobby. The host chooses when to begin.'
                        : game.status === 'closed'
                          ? 'Completed investigation. Your history is preserved.'
                          : 'Inspect, compare, and connect the evidence.'}
                    </Heading>
                    {game.status === 'waiting' && (
                      <section className="case-lobby">
                        <span className="eyebrow">CASE BRIEF</span>
                        <p>{dossier.brief}</p>
                        <div className={game.status === 'waiting' ? 'lobby-orbits' : 'actions-row'}>
                          {game.status === 'waiting' && (
                            <button
                              className="btn orbit-button"
                              disabled={busy || game.hostId !== profile.id}
                              onClick={() =>
                                void perform(async () => {
                                  await mutate('start')
                                })
                              }
                            >
                              <span className="orbit-icon" aria-hidden="true">
                                ⌾
                              </span>
                              <span>
                                {game.hostId !== profile.id
                                  ? 'Awaiting host'
                                  : game.members.length === 1
                                    ? 'Start case solo'
                                    : 'Start investigation'}
                              </span>
                              <small>
                                {game.members.length === 1 ? 'ONE INVESTIGATOR' : 'TEAM READY'}
                              </small>
                            </button>
                          )}
                          <button
                            className={
                              game.status === 'waiting' ? 'btn ghost orbit-button' : 'btn ghost'
                            }
                            onClick={() => setModal('invite')}
                          >
                            {game.status === 'waiting' && (
                              <span className="orbit-icon" aria-hidden="true">
                                ◎
                              </span>
                            )}
                            <span>Invite / room details</span>
                            {game.status === 'waiting' && <small>PRIVATE CHANNEL</small>}
                          </button>
                        </div>
                        <div className="notice">
                          {game.members.map((m) => (
                            <div key={m.id}>
                              {m.name} · {m.id === game.hostId ? 'Host' : 'Partner'} ·{' '}
                              {m.id === profile.id || Date.now() - m.seen < 65000
                                ? 'Online'
                                : 'Away'}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                    {game.status !== 'waiting' && (
                      <>
                        <div className="investigation-guide">
                          <div>
                            <span className="eyebrow">
                              {game.status === 'closed' ? 'ARCHIVED CASE' : 'YOUR NEXT STEP'}
                            </span>
                            <p>
                              {game.status === 'closed'
                                ? 'Explore the preserved evidence or read your complete conclusion.'
                                : game.shared.length === 0
                                  ? 'Begin at the Meridian Gallery. Read the files and share discoveries with your partner.'
                                  : game.shared.length < 10
                                    ? 'Continue exploring the museum, or compare your discoveries on the caseboard.'
                                    : 'All ten clues are shared. Compare the sequence and build a supported conclusion.'}
                            </p>
                          </div>
                          <button
                            className="btn ghost"
                            onClick={() =>
                              setPage(game.status === 'closed' ? 'accusation' : 'evidence')
                            }
                          >
                            {game.status === 'closed' ? 'Read final report' : 'Open caseboard'}
                          </button>
                        </div>
                        <div className="section-head">
                          <h2>Explore the museum</h2>
                          <small>{game.shared.length}/10 shared</small>
                        </div>
                        <section className="location-grid">
                          {dossier.locations.map((l) => (
                            <button
                              key={l.id}
                              className="location"
                              disabled={busy}
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
                        <details className="panel workspace-disclosure">
                          <summary>
                            Suspect interviews <small>3 dossiers</small>
                          </summary>
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
                        </details>
                        <details className="panel workspace-disclosure">
                          <summary>Case brief & activity</summary>
                          <p>{dossier.brief}</p>
                          {game.events
                            .slice(-8)
                            .reverse()
                            .map((e, i) => (
                              <div className="feed" key={i}>
                                {e.text}
                                <time>{when(e.at)}</time>
                              </div>
                            ))}
                        </details>
                      </>
                    )}
                  </>
                )}
                {page === 'evidence' && (
                  <>
                    <Heading title="Connect the night.">
                      Arrange the discoveries. Follow the contradictions. Build your explanation.
                    </Heading>
                    <Caseboard
                      key={game.code}
                      game={game}
                      dossier={dossier}
                      userId={profile.id}
                      locked={locked}
                      send={async (action, body = {}) => {
                        const next = await api<PublicGame>(
                          action,
                          { ...body, requestId: crypto.randomUUID() },
                          game.code,
                        )
                        acceptGame(next, game.code)
                        return next
                      }}
                    />
                  </>
                )}
                {page === 'evidence' && (
                  <details className="panel workspace-disclosure">
                    <summary>
                      Case notes & evidence assistant <small>{game.notes.length} saved notes</small>
                    </summary>
                    <section className="panel intelligence-panel">
                      <div className="section-head">
                        <div>
                          <span className="eyebrow">EVIDENCE ASSISTANT</span>
                          <h2>Focus the investigation.</h2>
                        </div>
                        <button
                          className="btn ghost"
                          disabled={busy || !game.shared.length}
                          onClick={() =>
                            void perform(async () => setRecap(await api('recap', {}, game.code)))
                          }
                        >
                          Prepare evidence recap
                        </button>
                      </div>
                      <p className="muted">
                        An assistant selects observations from your shared clues. Every excerpt is
                        checked against its source. You make the deductions.
                      </p>
                      {recap && (
                        <>
                          <p className="eyebrow">
                            BASED ON {recap.evidenceCount} SHARED CLUES
                            {recap.evidenceCount !== game.shared.length
                              ? ' / NEW EVIDENCE AVAILABLE'
                              : ''}
                          </p>
                          {recap.observations.map((o) => (
                            <blockquote key={o.evidenceId}>
                              <p>“{o.quote}”</p>
                              <button
                                className="text-btn"
                                onClick={() => {
                                  setLocationClues([])
                                  setClue(game.shared.find((c) => c.id === o.evidenceId) || null)
                                }}
                              >
                                Source: {game.shared.find((c) => c.id === o.evidenceId)?.title}
                              </button>
                            </blockquote>
                          ))}
                        </>
                      )}
                    </section>
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
                  </details>
                )}
                {page === 'overview' && game.status !== 'waiting' && (
                  <details className="panel workspace-disclosure">
                    <summary>Timeline & collected files</summary>
                    <p className="muted">
                      Evidence times show when files were collected. Each file describes the
                      underlying events.
                    </p>
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
                  </details>
                )}
                {page === 'accusation' &&
                  (game.reveal ? (
                    <>
                      <Heading
                        title={game.outcome === 'solved' ? 'Case solved.' : 'Case revealed.'}
                      >
                        The final investigation report.
                      </Heading>
                      <section className="panel report-export">
                        <div>
                          <span className="eyebrow">CASE ARCHIVE</span>
                          <p>Take your complete findings, evidence and notebook with you.</p>
                        </div>
                        <button
                          className="btn ghost"
                          disabled={busy}
                          onClick={() =>
                            void perform(async () => {
                              const result = await api<{ downloadUrl: string }>(
                                'report',
                                {},
                                game.code,
                              )
                              setReportUrl(result.downloadUrl)
                            })
                          }
                        >
                          Prepare PDF report
                        </button>
                        {reportUrl && (
                          <a
                            className="btn"
                            href={reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Download case report
                          </a>
                        )}
                      </section>
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
          {game.shared.some((c) => c.id === clue.id) && (
            <button
              className="btn ghost"
              onClick={() => {
                setClue(null)
                setPage('evidence')
              }}
            >
              View caseboard
            </button>
          )}
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
