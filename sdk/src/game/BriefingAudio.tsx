import { useEffect, useRef, useState } from 'react'
import type { Speech } from './CommandVisuals'

/** A compact audio-only replay. It never changes the current game page. */
export function BriefingAudio({ load }: { load: () => Promise<Speech> }) {
  const audio = useRef<HTMLAudioElement>(null),
    speech = useRef<Speech | null>(null),
    mounted = useRef(true)
  const [playing, setPlaying] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    mounted.current = true
    const el = audio.current
    return () => {
      mounted.current = false
      el?.pause()
    }
  }, [])
  const toggle = async () => {
    const el = audio.current
    if (!el) return
    if (!el.paused) {
      el.pause()
      el.currentTime = 0
      return
    }
    setLoading(true)
    setError('')
    try {
      speech.current ??= await load()
      if (!mounted.current) return
      el.src = speech.current.audioUrl
      el.currentTime = 0
      await el.play()
    } catch {
      if (mounted.current) setError('Voice unavailable. Select replay to retry.')
    } finally {
      if (mounted.current) setLoading(false)
    }
  }
  return (
    <div className="briefing-replay">
      <button
        className="briefing-replay-button"
        onClick={() => void toggle()}
        disabled={loading}
        aria-pressed={playing}
        aria-label={playing ? 'Stop briefing audio' : 'Replay briefing audio'}
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 7H6L10 3V17L6 13H3Z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M13 6Q17 10 13 14M15 3Q21 10 15 17" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        {loading ? 'Connecting…' : playing ? 'Stop briefing' : 'Replay briefing'}
      </button>
      <audio
        ref={audio}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false)
          setError('Voice unavailable. Select replay to retry.')
        }}
      />
      {error && <small role="status">{error}</small>}
    </div>
  )
}
