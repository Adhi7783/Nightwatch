import { useEffect, useRef, useState } from 'react'

export function Machinery() {
  return (
    <div className="machinery" aria-hidden="true">
      <div className="machine-grid" />
      <svg className="machine-engine" viewBox="0 0 1200 760" fill="none">
        <g className="engine-axis" stroke="currentColor">
          <path d="M110 380H1090M600 65V695" strokeDasharray="2 12" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(${260 + i * 170} 380)`}>
              <g className={'machine-rotor rotor-' + i}>
                <ellipse rx={94 + i * 5} ry={195 - i * 12} />
                <ellipse rx={81 + i * 5} ry={177 - i * 12} strokeDasharray="2 5" />
                <ellipse rx={65 + i * 4} ry={149 - i * 10} />
                {Array.from({ length: 24 }, (_, n) => (
                  <path
                    key={n}
                    d="M0 -183L5 -156L-5 -150Z"
                    transform={`rotate(${n * 15}) scale(.52 1)`}
                  />
                ))}
                <ellipse rx="25" ry="52" />
                <path d="M-70 -135L70 135M70 -135L-70 135" opacity=".4" />
              </g>
            </g>
          ))}
          {[0, 1, 2, 3].map((i) => (
            <g key={i} opacity=".4">
              <path
                d={`M${260 + i * 170} 205L${430 + i * 170} 217M${260 + i * 170} 555L${430 + i * 170} 543`}
              />
              <path
                d={`M${260 + i * 170} 280L${430 + i * 170} 290M${260 + i * 170} 480L${430 + i * 170} 470`}
                strokeDasharray="5 7"
              />
            </g>
          ))}
        </g>
        <g className="machine-dial" stroke="currentColor" transform="translate(190 560)">
          <circle r="100" strokeDasharray="110 14 5 14" />
          <circle r="85" strokeDasharray="2 5" />
          <circle r="64" />
          <circle r="57" strokeDasharray="3 8" />
          <path d="M-115 0H115M0 -115V115" />
        </g>
        <g stroke="currentColor" opacity=".45">
          <path d="M70 90H330L365 120H505M850 630H1100V510M80 630H390M870 100H1100V250" />
          <path
            d="M84 110H270M84 118H240M84 126H285M920 610H1080M950 600H1080"
            strokeDasharray="2 4"
          />
        </g>
      </svg>
      <span className="machine-label label-a">
        N/W SYSTEMS
        <br />
        ROTATIONAL ARRAY / ACTIVE
      </span>
      <span className="machine-label label-b">
        SECURE ENVIRONMENT
        <br />
        FORENSIC COMMAND 001
      </span>
      <div className="scan-line" />
    </div>
  )
}

export type Speech = {
  text: string
  audioUrl: string
  alignment: {
    characters: string[]
    character_start_times_seconds: number[]
    character_end_times_seconds: number[]
  }
}
export function Briefing({
  load,
  complete,
}: {
  load: () => Promise<Speech>
  complete: () => Promise<void>
}) {
  const [speech, setSpeech] = useState<Speech | null>(null)
  const [time, setTime] = useState(-1),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const [directory, setDirectory] = useState(false)
  const fetchBrief = async () => {
    setError('')
    try {
      setSpeech(await load())
    } catch (e) {
      setError((e as Error).message)
    }
  }
  useEffect(() => {
    void fetchBrief()
  }, [])
  useEffect(() => {
    if (!speech) return
    const el = audio.current
    if (!el) return
    void el.play().catch(() => {
      /* Browsers may require the explicit play button. */
    })
  }, [speech])
  async function finish() {
    audio.current?.pause()
    setSaving(true)
    setError('')
    try {
      await complete()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }
  const characters = speech?.alignment.characters || []
  let cursor = 0
  const words =
    characters
      .join('')
      .match(/\S+\s*/g)
      ?.map((word) => {
        const index = characters.join('').indexOf(word, cursor)
        cursor = index + word.length
        return { word, start: speech!.alignment.character_start_times_seconds[index] ?? 0 }
      }) || []
  return (
    <div
      className="briefing-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-heading"
    >
      <header className="command-header briefing-brand-header">
        <span className="header-system">
          N/W OS <i /> SECURE
        </span>
        <button
          className="brand text-btn"
          aria-label="Nightwatch Forensic Command"
          aria-expanded={directory}
          aria-controls="briefing-directory"
          onClick={() => setDirectory((v) => !v)}
        >
          <span className="brandmark">N</span>
          <span>
            NIGHTWATCH<small>FORENSIC COMMAND</small>
          </span>
        </button>
      </header>
      {directory && (
        <>
          <button
            className="nav-shade"
            aria-label="Close navigation"
            onClick={() => setDirectory(false)}
          />
          <aside className="rail briefing-directory" id="briefing-directory">
            <div className="rail-label">COMMAND DIRECTORY</div>
            <button
              className="btn ghost"
              onClick={() => {
                setDirectory(false)
                void finish()
              }}
            >
              Continue to case
            </button>
            <button className="text-btn" onClick={() => setDirectory(false)}>
              Return to transmission
            </button>
          </aside>
        </>
      )}
      <div className="briefing-top">
        <span className="eyebrow">INCOMING TRANSMISSION / CASE 001</span>
        <span className="transmission-light">
          {playing ? 'VOICE CHANNEL ACTIVE' : 'SECURE CHANNEL'}
        </span>
      </div>
      <div className="briefing-content">
        <span className="eyebrow">BELLWETHER MUSEUM / 22:43</span>
        <h1 id="briefing-heading">Your case begins.</h1>
        {speech ? (
          <p className="spoken-text" aria-label={speech.text}>
            {words.map((w, i) => (
              <span key={i} aria-hidden="true" className={time >= w.start ? 'spoken' : ''}>
                {w.word}
              </span>
            ))}
          </p>
        ) : (
          <p className="briefing-loading">
            {error ? 'Voice channel interrupted.' : 'Establishing voice channel…'}
          </p>
        )}
        {speech && (
          <audio
            ref={audio}
            src={speech.audioUrl}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => void finish()}
            onError={() =>
              setError(
                'Audio playback is unavailable. You can read the briefing below and continue.',
              )
            }
          />
        )}
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
      </div>
      <div className="briefing-controls">
        {speech ? (
          <>
            <button
              className="btn ghost"
              disabled={saving}
              onClick={() => {
                const a = audio.current
                if (!a) return
                if (a.paused)
                  void a
                    .play()
                    .catch(() => setError('Press play again to allow audio in this browser.'))
                else a.pause()
              }}
            >
              {playing ? 'Pause transmission' : 'Play transmission'}
            </button>
            <details>
              <summary>Read briefing</summary>
              <p>{speech.text}</p>
            </details>
          </>
        ) : (
          error && (
            <button className="btn ghost" onClick={() => void fetchBrief()}>
              Retry voice channel
            </button>
          )
        )}
        <button className="text-btn" disabled={saving} onClick={() => void finish()}>
          {saving ? 'Saving…' : 'Skip briefing and continue'}
        </button>
      </div>
    </div>
  )
}
