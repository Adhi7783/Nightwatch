import { useEffect, useId, useRef, useState } from 'react'

export function Wordmark({
  onClick,
  expanded,
  controls = 'command-navigation',
  label = 'Nightwatch navigation',
}: {
  onClick?: () => void
  expanded?: boolean
  controls?: string
  label?: string
}) {
  return (
    <button
      className="brand wordmark text-btn"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={onClick ? controls : undefined}
    >
      <span>NIGHTWATCH</span>
    </button>
  )
}
export type CommandDestination = { id: string; title: string; detail: string; action: () => void }

/** A native modal keeps keyboard focus inside the full-screen phase transition. */
export function PhaseMenu({
  items,
  onClose,
}: {
  items: CommandDestination[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    dismissing = useRef(false)
  const [closing, setClosing] = useState(false)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current!,
      previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      if (timer.current) clearTimeout(timer.current)
      document.documentElement.style.overflow = overflow
      dialog.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  const dismiss = (action?: () => void) => {
    if (dismissing.current) return
    dismissing.current = true
    setClosing(true)
    timer.current = setTimeout(
      () => {
        onClose()
        action?.()
      },
      matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 230,
    )
  }
  return (
    <dialog
      ref={ref}
      className={'phase-menu' + (closing ? ' is-closing' : '')}
      aria-labelledby={titleId}
      id="command-navigation"
      onCancel={(e) => {
        e.preventDefault()
        dismiss()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div className="phase-shell">
        <div className="phase-header">
          <Wordmark onClick={() => dismiss()} label="Close Nightwatch navigation" />
          <button
            className="phase-close text-btn"
            onClick={() => dismiss()}
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>
        <div className="phase-heading">
          <span className="eyebrow">COMMAND INTERFACE</span>
          <h2 id={titleId}>Where to, detective?</h2>
        </div>
        <nav className="phase-destinations" aria-label="Nightwatch destinations">
          {items.map((item, i) => (
            <button
              key={item.id}
              className="phase-tile"
              aria-label={item.title}
              style={{ animationDelay: `${i * 40 + 60}ms` }}
              onClick={() => dismiss(item.action)}
            >
              <span className="phase-number" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
              <span className="phase-arrow" aria-hidden="true">
                ↗
              </span>
            </button>
          ))}
        </nav>
        <p className="phase-hint">
          SELECT A DESTINATION <span>ESC TO RETURN</span>
        </p>
      </div>
    </dialog>
  )
}
