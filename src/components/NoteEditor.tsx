import React, { useState, useEffect, useCallback } from 'react'
import { Note } from '../../types'
import '../styles.css'
import PasswordModal from './PasswordModal'

interface NoteEditorProps {
  note: Note | null
  isEditing: boolean
  lockOnSave: boolean
  setLockOnSave: (v: boolean) => void
  originalLocked: boolean
  unlockedThisSession: boolean
  onSave: (
    noteId: number | null,
    content: string,
    password: string,
    shouldLock: boolean
  ) => void
  notify: (text: string, kind?: 'info' | 'success' | 'error') => void // ← NEW
}

const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  isEditing,
  lockOnSave,
  setLockOnSave,
  originalLocked,
  unlockedThisSession,
  onSave,
  notify,
}) => {
  const [content, setContent] = useState<string>('')
  const [passwordModalOpen, setPasswordModalOpen] = useState<boolean>(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [pendingLockPassword, setPendingLockPassword] = useState('')
  const [completeSaveAfterPassword, setCompleteSaveAfterPassword] =
    useState(false)

  useEffect(() => {
    if (isEditing) {
      if (note?.noteId != null) {
        setContent(note.content ?? '')
      } else {
        setContent('')
      }
    } else {
      setContent(note?.content ?? '')
    }
  }, [isEditing, note?.noteId, note?.content])

  // 3) Reset any staged password state when switching note/mode
  useEffect(() => {
    setIsChangingPassword(false)
    setPendingLockPassword('')
    setCompleteSaveAfterPassword(false)
  }, [note?.noteId, isEditing])

  // 4) Clear staged password state if user turns OFF "lock on save"
  useEffect(() => {
    if (!lockOnSave) {
      setIsChangingPassword(false)
      setPendingLockPassword('')
      setCompleteSaveAfterPassword(false)
    }
  }, [lockOnSave])

  // const openPasswordModal = () => setPasswordModalOpen(true)
  // const closePasswordModal = () => setPasswordModalOpen(false)

  const fullDate = (ms?: number) =>
    ms
      ? new Date(ms).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : ''

  const relTime = (ms?: number) => {
    if (!ms) return ''
    const now = Date.now()
    const diff = Math.max(0, Math.floor((now - ms) / 1000))
    if (diff < 10) return 'just now'
    if (diff < 60) return `${diff}s ago`
    const m = Math.floor(diff / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d === 1) return 'yesterday'
    return new Date(ms).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }

  const handleChangePasswordClick = useCallback(() => {
    setIsChangingPassword(true)
    setCompleteSaveAfterPassword(false)
    setPasswordModalOpen(true)
  }, [])

  const handleSaveClick = useCallback(() => {
    const trimmed = content.trim()
    if (!trimmed) {
      // alert('Please enter note content')
      notify('Please enter note content', 'error')
      return
    }

    let passwordToSend = ''

    if (lockOnSave) {
      if (!originalLocked) {
        if (!pendingLockPassword) {
          setCompleteSaveAfterPassword(true)
          setPasswordModalOpen(true)
          return
        }
        passwordToSend = pendingLockPassword
      } else if (isChangingPassword) {
        if (!pendingLockPassword) {
          setCompleteSaveAfterPassword(false)
          setPasswordModalOpen(true)
          return
        }
        passwordToSend = pendingLockPassword
      } else {
        passwordToSend = ''
      }
    }
    onSave(note?.noteId ?? null, trimmed, passwordToSend, lockOnSave)
    if (!note?.noteId) setContent('')
    setIsChangingPassword(false)
    setPendingLockPassword('')
    setCompleteSaveAfterPassword(false)
  }, [
    content,
    lockOnSave,
    originalLocked,
    isChangingPassword,
    pendingLockPassword,
    note?.noteId,
    onSave,
    notify,
  ])

  const handlePasswordSubmit = useCallback(
    (password: string) => {
      const trimmedPw = password.trim()
      if (!trimmedPw) {
        // alert('Please enter a password')
        notify('Please enter a password', 'error')
        return
      }
      // STAGE the password; do NOT save yet
      setPendingLockPassword(trimmedPw)
      setPasswordModalOpen(false)

      if (completeSaveAfterPassword) {
        onSave(note?.noteId ?? null, content.trim(), trimmedPw, true)
        if (!note?.noteId) setContent('')
        setIsChangingPassword(false)
        setPendingLockPassword('')
        setCompleteSaveAfterPassword(false)
      }
    },
    [completeSaveAfterPassword, content, note?.noteId, onSave, notify]
  )

  // ⌘/Ctrl + S to save
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (isEditing) handleSaveClick()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isEditing, handleSaveClick])

  const isLocked = !!note?.locked && note?.content === 'Locked Note'

  return (
    <div className="note-editor-container">
      {isEditing ? (
        <>
          <div className="editor-toolbar">
            <label className="lock-toggle">
              <input
                type="checkbox"
                className="toggle-input"
                checked={lockOnSave}
                onChange={(e) => setLockOnSave(e.target.checked)}
                aria-label="Lock on save"
              />
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
              <span className="toggle-text">
                {lockOnSave ? 'Lock on save' : 'Save unlocked'}
                {lockOnSave && pendingLockPassword && ' — new password set'}
              </span>
            </label>
            {originalLocked && lockOnSave && (
              <button
                type="button"
                className="btn"
                onClick={handleChangePasswordClick}
                title="Set a new password for this note"
              >
                Change password…
              </button>
            )}
            {note?.locked && (
              <span
                className={`status-chip ${
                  unlockedThisSession ? 'unlocked' : 'locked'
                }`}
                title={
                  unlockedThisSession
                    ? 'Decrypted in this session'
                    : 'Encrypted on disk'
                }
              >
                {unlockedThisSession ? 'Unlocked (this session)' : 'Locked'}
              </span>
            )}
            <div className="spacer" />

            <button
              className="btn primary"
              onClick={handleSaveClick}
              disabled={!content.trim()}
              aria-disabled={!content.trim()}
            >
              {lockOnSave ? 'Lock & Save' : 'Save Note'}
            </button>
          </div>

          {note && (
            <div
              className="viewer-meta"
              title={`Created ${fullDate(
                note.createdAt ?? note.noteId
              )} • Last edited ${fullDate(
                note.updatedAt ?? note.createdAt ?? note.noteId
              )}`}
            >
              Created {fullDate(note.createdAt ?? note.noteId)} · Last edited{' '}
              {relTime(note.updatedAt ?? note.createdAt ?? note.noteId)}
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note here…"
          />
        </>
      ) : (
        <>
          {note && (
            <div
              className="viewer-header"
              title={`Created ${fullDate(
                note.createdAt ?? note.noteId
              )} • Last edited ${fullDate(
                note.updatedAt ?? note.createdAt ?? note.noteId
              )}`}
            >
              <div className="viewer-meta">
                Created {fullDate(note.createdAt ?? note.noteId)} · Last edited{' '}
                {relTime(note.updatedAt ?? note.createdAt ?? note.noteId)}
              </div>
              <div className="viewer-right">
                {note.locked && (
                  <>
                    <span
                      className={`status-chip ${
                        isLocked ? 'locked' : 'unlocked'
                      }`}
                    >
                      {isLocked ? 'Locked' : 'Unlocked (this session)'}
                    </span>
                    {isLocked && (
                      <span className="viewer-hint">
                        {' '}
                        🔒 Locked — unlock to view
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          <div className="note-content-view">
            <div
              className="note-content-pre"
              style={isLocked ? { color: 'var(--muted)' } : undefined}
            >
              {isLocked ? note?.content || 'No preview' : content}
            </div>
          </div>
        </>
      )}
      <PasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSubmit={handlePasswordSubmit}
        action="lock"
        title={isChangingPassword ? 'Set New Password' : undefined}
      />
    </div>
  )
}

export default NoteEditor
