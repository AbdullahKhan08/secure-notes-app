import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
    shouldLock: boolean,
    tags: string[]
  ) => void
  notify: (text: string, kind?: 'info' | 'success' | 'error') => void
  onDirtyChange?: (dirty: boolean) => void
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
  onDirtyChange,
}) => {
  const [content, setContent] = useState<string>('')
  const [passwordModalOpen, setPasswordModalOpen] = useState<boolean>(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [pendingLockPassword, setPendingLockPassword] = useState('')
  const [completeSaveAfterPassword, setCompleteSaveAfterPassword] =
    useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // --- Dirty tracking baselines ---
  const baseContentRef = useRef<string>('')
  const baseTagsRef = useRef<string[]>([])
  const baseLockRef = useRef<boolean>(lockOnSave)

  // tracks which note we've initialized the editor for
  const initForNoteRef = useRef<number | 'new' | null>(null)

  // helper
  const arraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v, i) => v === b[i])

  const recomputeDirty = useCallback(() => {
    const dirty =
      content !== baseContentRef.current ||
      !arraysEqual(tags, baseTagsRef.current) ||
      lockOnSave !== baseLockRef.current
    onDirtyChange?.(dirty)
  }, [content, tags, lockOnSave, onDirtyChange])

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '')
    if (!t) return
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]))
  }

  const removeTag = (idx: number) =>
    setTags((prev) => prev.filter((_, i) => i !== idx))

  useEffect(() => {
    setTags(note?.tags ?? [])
  }, [note?.noteId, note?.tags, isEditing])

  const onTagKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault()
      addTag(tagInput.replace(',', ''))
      setTagInput('')
    } else if (e.key === 'Backspace' && !tagInput) {
      // quick backspace to remove last tag
      setTags((prev) => prev.slice(0, -1))
    }
  }

  // Commit any pending tag on blur (tiny UX nicety)
  const onTagBlur: React.FocusEventHandler<HTMLInputElement> = () => {
    if (tagInput.trim()) {
      addTag(tagInput)
      setTagInput('')
    }
  }

  useEffect(() => {
    if (!isEditing) {
      initForNoteRef.current = null // allow re-init next time we enter edit
      return
    }

    // New note being created
    if (note?.noteId == null) {
      if (initForNoteRef.current !== 'new') {
        setContent('') // start blank for new note
        initForNoteRef.current = 'new'
      }
      return
    }

    // Existing note: only initialize once per noteId while editing
    if (initForNoteRef.current !== note.noteId) {
      setContent(note.content ?? '')
      initForNoteRef.current = note.noteId
    }
  }, [isEditing, note?.noteId, note?.content])

  // When NOT editing, mirror live content so viewer reacts to lock/unlock/autolock
  useEffect(() => {
    if (isEditing) return
    setContent(note?.content ?? '')
  }, [isEditing, note?.content])

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

  // establish dirty baselines whenever we enter editing or switch notes
  useEffect(() => {
    if (isEditing) {
      baseContentRef.current = note?.content ?? ''
      baseTagsRef.current = (note?.tags ?? []).slice()
      baseLockRef.current = lockOnSave
      onDirtyChange?.(false)
    } else {
      onDirtyChange?.(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, note?.noteId])

  // recompute dirty when relevant fields change
  useEffect(() => {
    if (isEditing) recomputeDirty()
  }, [isEditing, content, tags, lockOnSave, recomputeDirty])

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
    onSave(note?.noteId ?? null, trimmed, passwordToSend, lockOnSave, tags)

    // Optimistically reset dirty baseline to current state
    baseContentRef.current = trimmed
    baseTagsRef.current = tags.slice()
    baseLockRef.current = lockOnSave
    onDirtyChange?.(false)

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
    tags,
    onDirtyChange,
  ])

  const handlePasswordSubmit = useCallback(
    (password: string) => {
      const trimmedPw = password.trim()
      if (!trimmedPw) {
        notify('Please enter a password', 'error')
        return
      }
      // STAGE the password; do NOT save yet
      setPendingLockPassword(trimmedPw)
      setPasswordModalOpen(false)

      if (completeSaveAfterPassword) {
        onSave(note?.noteId ?? null, content.trim(), trimmedPw, true, tags)
        // reset dirty baseline to saved state
        baseContentRef.current = content.trim()
        baseTagsRef.current = tags.slice()
        baseLockRef.current = true
        onDirtyChange?.(false)
        if (!note?.noteId) setContent('')
        setIsChangingPassword(false)
        setPendingLockPassword('')
        setCompleteSaveAfterPassword(false)
      }
    },
    [
      completeSaveAfterPassword,
      content,
      note?.noteId,
      onSave,
      notify,
      tags,
      onDirtyChange,
    ]
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

  const isNewNote = !note?.noteId
  const willLockOnSave =
    lockOnSave && (isNewNote || !originalLocked || isChangingPassword)

  const saveLabel = willLockOnSave ? 'Lock & Save' : 'Save Note'
  const saveTitle = willLockOnSave
    ? isChangingPassword
      ? 'Save with new password'
      : 'Save and encrypt this note'
    : 'Save without changing lock status'

  const saveDisabled = useMemo(
    () => !content.trim() || (!!note?.locked && !unlockedThisSession),
    [content, note?.locked, unlockedThisSession]
  )

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
              disabled={saveDisabled}
              aria-disabled={saveDisabled}
              title={saveTitle}
            >
              {saveLabel}
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
          <div className="tag-editor" aria-label="Tags">
            {tags.map((t, i) => (
              <span key={`${t}-${i}`} className="tag-chip on">
                #{t}
                <button
                  className="tag-x"
                  aria-label={`Remove ${t}`}
                  onClick={() => removeTag(i)}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              className="tag-input"
              placeholder={tags.length ? 'Add tag…' : 'Add tags…'}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={onTagBlur}
              aria-label="Add tag"
            />
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note here…"
          />
        </>
      ) : (
        <>
          {note && (
            <>
              <div
                className="viewer-header"
                title={`Created ${fullDate(
                  note.createdAt ?? note.noteId
                )} • Last edited ${fullDate(
                  note.updatedAt ?? note.createdAt ?? note.noteId
                )}`}
              >
                <div className="viewer-left">
                  <div className="viewer-meta">
                    Created {fullDate(note.createdAt ?? note.noteId)} · Last
                    edited{' '}
                    {relTime(note.updatedAt ?? note.createdAt ?? note.noteId)}
                  </div>
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
              {(note.tags?.length ?? 0) > 0 && (
                <div className="viewer-tags-row">
                  {note.tags!.map((t, i) => (
                    <span key={`${t}-${i}`} className="tag-chip tiny">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </>
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
