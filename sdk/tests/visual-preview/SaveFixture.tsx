// Isolated interaction fixture: actual choice components and archive reducer, no game API.
import { useEffect, useRef, useState } from 'react'
import { NewCaseChoice, DeleteSaveChoice } from '../../src/game/SaveDialogs'
import { changeSave } from '../../src/game/save-archive'
import { Machinery } from '../../src/game/CommandVisuals'
import type { Profile } from '../../src/game/types'

export function SaveFixture() {
  const [profile, setProfile] = useState<Profile>({
    id: 'local',
    name: 'Local detective',
    created: 1,
    rooms: ['ABCDEF123456', '123456ABCDEF'],
    closed: [],
  })
  const [modal, setModal] = useState<'new' | 'delete' | null>(null),
    [code, setCode] = useState(''),
    [undo, setUndo] = useState(''),
    [message, setMessage] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = dialog.current
    if (modal && !d?.open) d?.showModal()
    if (!modal) d?.close()
  }, [modal])
  return (
    <>
      <Machinery />
      <main className="main">
        <h1>Save controls interaction fixture</h1>
        <p>Local demonstration only. No production archive is changed.</p>
        <button className="btn" onClick={() => setModal('new')}>
          Start a private case
        </button>
        <section className="panel">
          <h2>Resume an investigation</h2>
          {message && <p role="status">{message}</p>}
          {undo && (
            <button
              className="text-btn"
              onClick={() => {
                setProfile(changeSave(profile, undo, false))
                setUndo('')
                setMessage('Save restored.')
              }}
            >
              Undo delete
            </button>
          )}
          {profile.rooms.map((id) => (
            <div className="archive-item" key={id}>
              <span>{id}</span>
              <div className="archive-actions">
                <button className="btn ghost small" onClick={() => setMessage('Resumed ' + id)}>
                  Resume
                </button>
                <button
                  className="btn ghost small delete-save"
                  aria-label={'Delete save ' + id}
                  onClick={() => {
                    setCode(id)
                    setModal('delete')
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>
        <dialog
          ref={dialog}
          className="modal"
          aria-label={
            modal === 'new'
              ? 'Are you sure you want to start a new case?'
              : 'Delete this saved case?'
          }
          onCancel={() => setModal(null)}
        >
          <button className="close" aria-label="Close dialog" onClick={() => setModal(null)}>
            ×
          </button>
          <h2>
            {modal === 'new'
              ? 'Are you sure you want to start a new case?'
              : 'Delete this saved case?'}
          </h2>
          {modal === 'new' ? (
            <NewCaseChoice
              profile={profile}
              busy={false}
              onResume={(id) => {
                setModal(null)
                setMessage('Resumed ' + id)
              }}
              onCreate={() => {
                setModal(null)
                setMessage('New case created.')
              }}
            />
          ) : (
            <DeleteSaveChoice
              code={code}
              busy={false}
              onCancel={() => setModal(null)}
              onDelete={() => {
                setProfile(changeSave(profile, code, true))
                setUndo(code)
                setModal(null)
                setMessage('Saved case removed from your archive.')
              }}
            />
          )}
        </dialog>
      </main>
    </>
  )
}
