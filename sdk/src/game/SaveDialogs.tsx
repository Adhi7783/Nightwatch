import { useState } from 'react'
import type { Profile } from './types'

const label = (code: string) => code.match(/.{1,4}/g)?.join('–') || code
export function NewCaseChoice({
  profile,
  busy,
  onResume,
  onCreate,
}: {
  profile: Profile
  busy: boolean
  onResume: (code: string) => void
  onCreate: () => void
}) {
  const [code, setCode] = useState(profile.rooms[0] || '')
  return (
    <>
      <p>
        Your existing progress is saved. Resume an investigation or open a fresh copy of the museum
        case.
      </p>
      {profile.rooms.length > 0 ? (
        <label className="save-picker">
          Saved case
          <select
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={busy}
          >
            {profile.rooms.map((id) => (
              <option key={id} value={id}>
                Case 001 · {label(id)}
                {profile.closed.includes(id) ? ' · Closed' : ''}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="muted">You have no saved cases yet.</p>
      )}
      <div className="modal-actions">
        <button className="btn ghost" disabled={busy || !code} onClick={() => onResume(code)}>
          Resume case
        </button>
        <button className="btn" disabled={busy} onClick={onCreate}>
          New case
        </button>
      </div>
    </>
  )
}
export function DeleteSaveChoice({
  code,
  busy,
  onDelete,
  onCancel,
}: {
  code: string
  busy: boolean
  onDelete: () => void
  onCancel: () => void
}) {
  return (
    <>
      <p>
        Remove case <span className="mono">{label(code)}</span> from your saved archive?
      </p>
      <p className="muted">
        Your partner's save and the shared investigation are preserved. You can undo this removal
        after deleting.
      </p>
      <div className="modal-actions">
        <button className="btn ghost" disabled={busy} onClick={onCancel}>
          Keep save
        </button>
        <button className="btn delete-save" disabled={busy} onClick={onDelete}>
          Delete save
        </button>
      </div>
    </>
  )
}
