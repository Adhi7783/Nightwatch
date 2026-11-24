import { useEffect, useMemo, useRef, useState } from 'react'
import { Hologram } from './Hologram'
import { Wordmark, PhaseMenu } from './CommandNavigation'

export function Machinery() {
  return (
    <div className="machinery" aria-hidden="true">
      <div className="machine-grid" />
      <Hologram scene="machinery" />
      <div className="holo-reticle reticle-a" />
      <div className="holo-reticle reticle-b" />
      <div className="scan-line" />
    </div>
  )
}

export type Speech = {
  effect?: 'computer-v1'
  voice?: string
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
  const mounted = useRef(true)
  const currentWord = useRef<HTMLSpanElement>(null)
  const [directory, setDirectory] = useState(false)
  const fetchBrief = async () => {
    setError('')
    try {
      const result = await load()
      if (mounted.current) setSpeech(result)
    } catch (e) {
      if (mounted.current) setError((e as Error).message)
    }
  }
  useEffect(() => {
    mounted.current = true
    void fetchBrief()
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (!speech) return
    const el = audio.current
    if (!el) return
    void el.play().catch(() => {
      /* Browsers may require the explicit play button. */
    })
    return () => el.pause()
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
  useEffect(() => {
    if (!playing) return
    let frame = 0,
      last = -1
    const tick = () => {
      const t = audio.current?.currentTime || 0
      if (Math.floor(t * 30) !== last) {
        last = Math.floor(t * 30)
        setTime(t)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])
  const words = useMemo(() => {
    const text = speech?.alignment.characters.join('') || ''
    let cursor = 0
    return (text.match(/\S+\s*/g) || []).map((word) => {
      const start = text.indexOf(word, cursor)
      cursor = start + word.length
      return { word, start }
    })
  }, [speech])
  const activeWord = words.reduce(
    (last, w, i) =>
      time >= (speech?.alignment.character_start_times_seconds[w.start] ?? Infinity) ? i : last,
    -1,
  )
  useEffect(() => {
    if (activeWord < 0) return
    currentWord.current?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [activeWord])
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
        <Wordmark onClick={() => setDirectory(true)} expanded={directory} />
      </header>
      {directory && (
        <PhaseMenu
          onClose={() => setDirectory(false)}
          items={[
            {
              id: 'transmission',
              title: 'Return to transmission',
              detail: 'CONTINUE LISTENING',
              action: () => {},
            },
            {
              id: 'case',
              title: 'Enter investigation',
              detail: 'CONTINUE TO YOUR CASE',
              action: () => void finish(),
            },
          ]}
        />
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
              <span
                className="transmission-word"
                key={i}
                aria-hidden="true"
                ref={i === activeWord ? currentWord : undefined}
              >
                {w.word.split('').map((character, j) => (
                  <span
                    key={j}
                    className={
                      time >= (speech.alignment.character_start_times_seconds[w.start + j] ?? 0)
                        ? 'spoken'
                        : ''
                    }
                  >
                    {character}
                  </span>
                ))}
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
