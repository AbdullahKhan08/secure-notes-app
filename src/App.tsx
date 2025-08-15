// App.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import NoteEditor from './components/NoteEditor'
import NoteList from './components/NoteList'
import PasswordModal from './components/PasswordModal'
import ConfirmModal from './components/ConfirmModal'
import './styles.css'
import { Note } from '../types'

type ToastKind = 'info' | 'success' | 'error'
type Toast = {
  id: number
  kind: ToastKind
  text: string
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
}

function App() {
  const [notes, setNotes] = useState<Note[]>([])
  const [trash, setTrash] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [lockOnSave, setLockOnSave] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalNoteId, setModalNoteId] = useState<number | null>(null)
  const [modalAction, setModalAction] = useState<'lock' | 'unlock'>('unlock')
  const [unlockThenEdit, setUnlockThenEdit] = useState(false)
  const [sessionUnlocked, setSessionUnlocked] = useState<Set<number>>(new Set())

  const [toasts, setToasts] = useState<Toast[]>([])
  const [query, setQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showTrash, setShowTrash] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmNoteId, setConfirmNoteId] = useState<number | null>(null)

  const allTags = useMemo(() => {
    const src = showTrash ? trash : notes
    return Array.from(new Set(src.flatMap((n) => n.tags ?? []))).sort()
  }, [showTrash, notes, trash])

  const toggleFilterTag = (t: string) =>
    setSelectedTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )

  const openConfirm = (id: number) => {
    setConfirmNoteId(id)
    setConfirmOpen(true)
  }

  const closeConfirm = () => {
    setConfirmOpen(false)
    setConfirmNoteId(null)
  }

  const pushToast = (
    text: string,
    kind: ToastKind = 'info',
    opts?: { actionLabel?: string; onAction?: () => void; durationMs?: number }
  ) => {
    const id = Date.now() + Math.random()
    const toast: Toast = { id, kind, text, ...opts }
    // setToasts((t) => [...t, toast])
    // setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
    // }
    setToasts((t) => [...t, toast])
    const ms = opts?.durationMs ?? 3000
    const timer = setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      ms
    )
    return {
      id,
      dismiss: () => {
        clearTimeout(timer)
        setToasts((t) => t.filter((x) => x.id !== id))
      },
    }
  }

  const sortNotes = useCallback(
    (arr: Note[]) =>
      [...arr].sort((a, b) => {
        const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
        if (pinDiff !== 0) return pinDiff
        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
      }),
    []
  )

  const sortTrash = useCallback(
    (arr: Note[]) =>
      [...arr].sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    []
  )

  // const filtered = sortNotes(
  //   notes.filter((n) => {
  //     // tokenize query: OR across tokens
  //     const raw = query.trim().toLowerCase()
  //     const tokens = raw ? raw.split(/[\s,\/]+/).filter(Boolean) : []

  //     // search content only if not masked
  //     const contentForSearch =
  //       n.content && n.content !== 'Locked Note' ? n.content : ''

  //     const textMatch =
  //       tokens.length === 0 ||
  //       tokens.some((q) => {
  //         const inPreview = (n.preview || '').toLowerCase().includes(q)
  //         const inContent = contentForSearch.toLowerCase().includes(q)
  //         const inTags = (n.tags || []).some((t) => t.toLowerCase().includes(q))
  //         return inPreview || inContent || inTags
  //       })

  //     const tags = n.tags ?? []
  //     // const tagMatch =
  //     //   selectedTags.length === 0 || selectedTags.every((t) => tags.includes(t)) // AND filter on chips
  //     const tagMatch =
  //       selectedTags.length === 0 || selectedTags.some((t) => tags.includes(t)) // OR

  //     return textMatch && tagMatch
  //   })
  // )

  // const filterList = (list: Note[]) =>
  //   sortNotes(
  //     list.filter((n) => {
  //       const q = query.trim().toLowerCase()
  //       const inPreview = (n.preview || '').toLowerCase().includes(q)
  //       const contentForSearch =
  //         n.content && n.content !== 'Locked Note' ? n.content : ''
  //       const inContent = contentForSearch.toLowerCase().includes(q)
  //       const inTags = (n.tags || []).some((t) => t.toLowerCase().includes(q))
  //       const textMatch = !q || inPreview || inContent || inTags

  //       const tags = n.tags ?? []
  //       const tagMatch = selectedTags.every((t) => tags.includes(t)) // AND

  //       return textMatch && tagMatch
  //     })
  //   )

  // Shared filtering (text + tag match)
  const passesFilters = useCallback(
    (n: Note) => {
      const q = query.trim().toLowerCase()
      const inPreview = (n.preview || '').toLowerCase().includes(q)
      const contentForSearch =
        n.content && n.content !== 'Locked Note' ? n.content : ''
      const inContent = contentForSearch.toLowerCase().includes(q)
      const inTags = (n.tags || []).some((t) => t.toLowerCase().includes(q))
      const textMatch = !q || inPreview || inContent || inTags

      const tags = n.tags ?? []
      const tagMatch = selectedTags.every((t) => tags.includes(t)) // AND

      return textMatch && tagMatch
    },
    [query, selectedTags]
  )

  const filtered = useMemo(
    () => sortNotes(notes.filter(passesFilters)),
    [notes, passesFilters, sortNotes]
  )
  const filteredTrash = useMemo(
    () => sortTrash(trash.filter(passesFilters)),
    [trash, passesFilters, sortTrash]
  )

  // const filtered = filterList(notes)
  // const filteredTrash = filterList(trash)

  // useEffect(() => {
  //   const fetchNotes = async () => {
  //     const fetchedNotes = await window.electronAPI.getNotes()
  //     const sorted = sortNotes(fetchedNotes)
  //     setNotes(sorted)
  //     if (sorted.length > 0) {
  //       setSelectedNote(sorted[0])
  //     }
  //   }
  //   fetchNotes()
  // }, [])

  // Fetch notes + trash (stable function to satisfy eslint)
  const fetchNotes = useCallback(async () => {
    const fetchedNotes = await window.electronAPI.getNotes()
    const fetchedTrash = await window.electronAPI.getTrash()
    setNotes(sortNotes(fetchedNotes))
    setTrash(sortTrash(fetchedTrash))
    if (fetchedNotes.length > 0) {
      setSelectedNote(sortNotes(fetchedNotes)[0])
    }
  }, [sortNotes, sortTrash])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleTogglePin = async (noteId: number, pinned: boolean) => {
    const res = await window.electronAPI.togglePin(noteId, pinned)
    if (!res.success) {
      pushToast(res.error, 'error')
      return
    }
    setNotes((prev) =>
      sortNotes(
        prev.map((n) =>
          n.noteId === noteId
            ? { ...n, pinned: res.note.pinned, updatedAt: res.note.updatedAt }
            : n
        )
      )
    )
    if (selectedNote?.noteId === noteId) {
      // setSelectedNote({ ...selectedNote, pinned })
      setSelectedNote((prev) =>
        prev
          ? { ...prev, pinned: res.note.pinned, updatedAt: res.note.updatedAt }
          : prev
      )
    }
    // const serverNote = res.note

    // // Replace with authoritative note from main + resort
    // setNotes((prev) =>
    //   sortNotes(prev.map((n) => (n.noteId === noteId ? serverNote : n)))
    // )

    // // If this note is selected, preserve any decrypted content currently shown
    // if (selectedNote?.noteId === noteId) {
    //   setSelectedNote((prev) =>
    //     prev ? { ...serverNote, content: prev.content } : prev
    //   )
    // }
  }

  const handleSelectNote = (note: Note) => {
    if (showTrash) {
      setSelectedNote(note)
      setIsEditing(false)
      return
    }
    const hasDecrypted = note.locked && note.content !== 'Locked Note'
    const unlockedThisSession = note.locked && sessionUnlocked.has(note.noteId)

    if (note.locked && !hasDecrypted && !unlockedThisSession) {
      setSelectedNote(note)
      setUnlockThenEdit(false)
      setModalAction('unlock')
      setModalNoteId(note.noteId)
      setModalOpen(true)
      setIsEditing(false)
      // return
    } else {
      setSelectedNote(note)
      setLockOnSave(false)
      setIsEditing(false)
    }
  }

  const handleNew = () => {
    if (showTrash) {
      setShowTrash(false)
      setIsEditing(true)
      setSelectedNote(null)
      setLockOnSave(false)
    }
    setIsEditing(true)
    setSelectedNote(null)
    setLockOnSave(false)
  }

  const handleSaveNote = async (
    noteId: number | null,
    content: string,
    password: string,
    shouldLock: boolean,
    tags: string[]
  ) => {
    try {
      const originallyLocked =
        noteId != null
          ? notes.find((n) => n.noteId === noteId)?.locked === true
          : false

      const trimmed = content.trim()
      if (!trimmed) {
        pushToast('Please enter note content', 'error')
        return
      }

      if (shouldLock && !password && !originallyLocked) {
        pushToast('Please enter a password to lock this note', 'error')
        return
      }

      const preview = content.slice(0, 10)
      let result

      if (noteId) {
        result = await window.electronAPI.editNote(
          noteId,
          content,
          password,
          shouldLock,
          preview,
          tags
        )
      } else {
        result = await window.electronAPI.saveNote(
          null,
          content,
          password,
          shouldLock,
          preview,
          tags
        )
      }

      if (result.success) {
        // const saved: Note =
        //   'note' in result
        //     ? result.note
        //     : {
        //         noteId: result.noteId,
        //         content: shouldLock ? 'Locked Note' : content,
        //         preview,
        //         locked: shouldLock,
        //       }

        const saved = result.note

        const uiNote: Note = saved.locked ? { ...saved, content } : saved

        // setNotes((prev) =>
        //   prev.some((n) => n.noteId === uiNote.noteId)
        //     ? prev.map((n) => (n.noteId === uiNote.noteId ? uiNote : n))
        //     : [...prev, uiNote]
        // )
        setNotes((prev) =>
          sortNotes(
            prev.some((n) => n.noteId === uiNote.noteId)
              ? prev.map((n) => (n.noteId === uiNote.noteId ? uiNote : n))
              : [...prev, uiNote]
          )
        )

        setSelectedNote(uiNote)
        if (uiNote.locked) {
          setSessionUnlocked((prev) => new Set(prev).add(uiNote.noteId))
        }
        setIsEditing(false)
        setLockOnSave(false)
        pushToast('Saved', 'success')
      } else {
        // alert(result.error)
        pushToast(result.error, 'error')
      }
    } catch (error) {
      console.log('error', error)
      pushToast('Failed to save note', 'error')
    }
  }

  const handleUnlockNote = async (password: string) => {
    if (modalNoteId == null) return
    const result = await window.electronAPI.unlockNote(modalNoteId, password)
    if (!result.success) {
      // alert(result.error)
      pushToast(result.error, 'error')
      setModalOpen(false)
      return
    }
    setNotes((prev) =>
      prev.map((n) =>
        n.noteId === result.note.noteId
          ? { ...n, content: result.note.content }
          : n
      )
    )
    setSelectedNote(result.note)
    setSessionUnlocked((prev) => new Set(prev).add(result.note.noteId))
    // setLockOnSave(false)
    setLockOnSave(unlockThenEdit ? true : false)
    setIsEditing(unlockThenEdit)
    setUnlockThenEdit(false)
    setModalOpen(false)
  }

  const onEditNote = (noteId: number) => {
    const note = notes.find((n) => n.noteId === noteId)
    if (!note) return

    const needsUnlock =
      note.locked &&
      note.content === 'Locked Note' &&
      !sessionUnlocked.has(noteId)

    if (needsUnlock) {
      setSelectedNote(note)
      setUnlockThenEdit(true)
      setModalAction('unlock')
      setModalNoteId(noteId)
      setModalOpen(true)
      return
    }
    setSelectedNote(note)
    setIsEditing(true)
    setLockOnSave(note.locked)
  }

  // const onDeleteNote = async (noteId: number) => {
  //   const result = await window.electronAPI.deleteNote(noteId)
  //   if (result.success) {
  //     setNotes(notes.filter((note) => note.noteId !== noteId))
  //     if (selectedNote?.noteId === noteId) setSelectedNote(null)
  //     pushToast('Deleted', 'success')
  //   } else {
  //     // alert('Failed to delete note')
  //     pushToast('Failed to delete note', 'error')
  //   }
  // }

  const onDeleteNote = async (noteId: number) => {
    const result = await window.electronAPI.deleteNote(noteId)
    if (result.success) {
      const removed = notes.find((n) => n.noteId === noteId) || null
      setNotes((prev) => prev.filter((n) => n.noteId !== noteId))
      if (selectedNote?.noteId === noteId) setSelectedNote(null)
      if (removed) {
        setTrash((prev) =>
          sortTrash([...prev, { ...removed, deletedAt: Date.now() }])
        )
      }

      const undo = async () => {
        const r = await window.electronAPI.restoreNote(noteId)
        if (r.success) {
          setTrash((prev) => prev.filter((n) => n.noteId !== noteId))
          setNotes((prev) => sortNotes([...prev, r.note]))
          pushToast('Restored', 'success')
        } else {
          pushToast(r.error, 'error')
        }
      }

      pushToast('Moved to Trash', 'success', {
        actionLabel: 'Undo',
        onAction: undo,
        durationMs: 5000,
      })
    } else {
      pushToast('Failed to delete note', 'error')
    }
  }

  const handleRestoreNote = async (noteId: number) => {
    const r = await window.electronAPI.restoreNote(noteId)
    if (r.success) {
      setTrash((prev) => prev.filter((n) => n.noteId !== noteId))
      setNotes((prev) => sortNotes([...prev, r.note]))
      pushToast('Restored', 'success')
    } else {
      pushToast(r.error, 'error')
    }
  }

  // const handleDeleteForever = async (noteId: number) => {
  const handleDeleteForever = async () => {
    if (confirmNoteId == null) return
    // const r = await window.electronAPI.deleteForever(noteId)
    const r = await window.electronAPI.deleteForever(confirmNoteId)
    if (r.success) {
      setTrash((prev) => prev.filter((n) => n.noteId !== confirmNoteId))
      if (selectedNote?.noteId === confirmNoteId) setSelectedNote(null)
      pushToast('Deleted forever', 'success')
    } else {
      pushToast(r.error, 'error')
    }
    closeConfirm()
  }

  const unlockedThisSession =
    !!selectedNote?.locked &&
    (selectedNote.content !== 'Locked Note' ||
      (selectedNote.noteId != null && sessionUnlocked.has(selectedNote.noteId)))

  const visibleList = showTrash ? filteredTrash : filtered
  const totalInTab = showTrash ? trash.length : notes.length

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          {' '}
          <span className="brand-mark">🗒️</span> Secure Notes
        </div>
        <div className="tabs">
          <button
            className={`tab ${!showTrash ? 'active' : ''}`}
            // onClick={() => setShowTrash(false)}
            onClick={() => {
              setShowTrash(false)
              setSelectedNote((prev) => (prev && prev.deletedAt ? null : prev))
            }}
          >
            Notes
          </button>
          <button
            className={`tab ${showTrash ? 'active' : ''}`}
            onClick={() => {
              setShowTrash(true)
              setIsEditing(false)
              setSelectedNote(null)
            }}
          >
            Trash
          </button>
        </div>
        {/* <div className="header-meta">
          <span>
            {filtered.length} of {notes.length} notes
          </span>
          <span className="dot">•</span>
          <span>{notes.filter((n) => n.pinned).length} pinned</span>
        </div> */}
        <div className="header-meta">
          <span>
            {/* {!showTrash ? filtered.length : filteredTrash.length} of{' '}
            {!showTrash ? notes.length : trash.length}{' '}
            {!showTrash ? 'notes' : 'trashed'} */}
            {visibleList.length} of {totalInTab}{' '}
            {showTrash ? 'trashed' : 'notes'}
          </span>
          {!showTrash && (
            <>
              <span className="dot">•</span>
              <span>{notes.filter((n) => n.pinned).length} pinned</span>
            </>
          )}
        </div>
      </header>
      <div className="app-body">
        <div className="notes-list">
          <div className="sidebar-header">
            <button className="btn primary new-note-btn" onClick={handleNew}>
              + New Note
            </button>
            <input
              className="search-input"
              type="search"
              placeholder="Search notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search notes"
            />
            {query.trim() && (
              <div className="search-stats" role="status" aria-live="polite">
                {visibleList.length} result{visibleList.length === 1 ? '' : 's'}
                {/* {filtered.length} result{filtered.length === 1 ? '' : 's'} */}
              </div>
            )}
          </div>
          {allTags.length > 0 && (
            <div className="tag-filter" aria-label="Filter by tag">
              {allTags.map((t) => {
                const on = selectedTags.includes(t)
                return (
                  <button
                    key={t}
                    className={`tag-chip ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleFilterTag(t)}
                    title={on ? `Remove filter: ${t}` : `Filter by: ${t}`}
                  >
                    #{t}
                  </button>
                )
              })}
              {selectedTags.length > 0 && (
                <button
                  className="btn ghost small"
                  onClick={() => setSelectedTags([])}
                >
                  Clear
                </button>
              )}
            </div>
          )}
          <NoteList
            // notes={filtered}
            // notes={!showTrash ? filtered : filteredTrash}
            notes={visibleList}
            selectedId={selectedNote?.noteId ?? null}
            onSelectNote={handleSelectNote}
            // onEditNote={onEditNote}
            // onDeleteNote={onDeleteNote}
            // onTogglePin={handleTogglePin}
            onEditNote={!showTrash ? onEditNote : undefined}
            onDeleteNote={!showTrash ? onDeleteNote : undefined}
            onTogglePin={!showTrash ? handleTogglePin : undefined}
            onRestoreNote={showTrash ? handleRestoreNote : undefined}
            // onDeleteForever={showTrash ? handleDeleteForever : undefined}
            onDeleteForever={showTrash ? (id) => openConfirm(id) : undefined}
            mode={showTrash ? 'trash' : 'active'}
            emptyMessage={
              showTrash
                ? 'No deleted notes'
                : query.trim()
                ? 'No matching notes'
                : 'No notes yet. Create a new note.'
            }
          />
        </div>
        <div className="note-editor">
          {isEditing || selectedNote ? (
            <NoteEditor
              note={selectedNote}
              setLockOnSave={setLockOnSave}
              lockOnSave={lockOnSave}
              onSave={handleSaveNote}
              isEditing={isEditing}
              originalLocked={!!selectedNote?.locked}
              unlockedThisSession={unlockedThisSession}
              notify={(text, kind) => pushToast(text, kind)}
            />
          ) : (
            <div className="empty-editor">
              <div className="empty-card">
                <div className="empty-icon">🗒️</div>
                <div className="empty-title">No note selected</div>
                <div className="empty-subtitle">
                  Create a new note or pick one from the list.
                </div>
                <div className="empty-actions">
                  <button className="btn primary" onClick={handleNew}>
                    New note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <PasswordModal
        isOpen={modalOpen}
        action={modalAction}
        onClose={() => setModalOpen(false)}
        onSubmit={handleUnlockNote}
      />
      <ConfirmModal
        isOpen={confirmOpen}
        title="Delete forever?"
        message="This note will be permanently removed. This action cannot be undone."
        confirmText="Delete forever"
        onClose={closeConfirm}
        onConfirm={handleDeleteForever}
      />
      {/* Toasts */}
      {/* <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div> */}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span className="toast-text">{t.text}</span>
            {t.actionLabel && t.onAction && (
              <button
                className="toast-action"
                onClick={() => {
                  t.onAction?.()
                  setToasts((x) => x.filter((z) => z.id !== t.id))
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
