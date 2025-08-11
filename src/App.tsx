// App.tsx
import React, { useState, useEffect } from 'react'
import NoteEditor from './components/NoteEditor'
import NoteList from './components/NoteList'
import PasswordModal from './components/PasswordModal'
import './styles.css'
import { Note } from '../types'

type ToastKind = 'info' | 'success' | 'error'
type Toast = { id: number; kind: ToastKind; text: string }

function App() {
  const [notes, setNotes] = useState<Note[]>([])
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

  const pushToast = (text: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }

  const sortNotes = (arr: Note[]) =>
    [...arr].sort((a, b) => {
      if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0))
        return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
      return b.updatedAt - a.updatedAt
    })

  const filtered = sortNotes(
    notes.filter((n) => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      // search preview always; search content only if not locked
      const inPreview = (n.preview || '').toLowerCase().includes(q)
      // const inContent = !n.locked && (n.content || '').toLowerCase().includes(q)
      const contentForSearch =
        n.content && n.content !== 'Locked Note' ? n.content : ''
      const inContent = contentForSearch.toLowerCase().includes(q)
      return inPreview || inContent
    })
  )

  useEffect(() => {
    const fetchNotes = async () => {
      const fetchedNotes = await window.electronAPI.getNotes()
      const sorted = sortNotes(fetchedNotes)
      setNotes(sorted)
      if (sorted.length > 0) {
        setSelectedNote(sorted[0])
      }
    }
    fetchNotes()
  }, [])

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
    const hasDecrypted = note.locked && note.content !== 'Locked Note'
    const unlockedThisSession = note.locked && sessionUnlocked.has(note.noteId)

    if (note.locked && !hasDecrypted && !unlockedThisSession) {
      setSelectedNote(note)
      setUnlockThenEdit(false)
      setModalAction('unlock')
      setModalNoteId(note.noteId)
      setModalOpen(true)
      setIsEditing(false)
      return
    } else {
      setSelectedNote(note)
      setLockOnSave(false)
      setIsEditing(false)
    }
  }

  const handleNew = () => {
    setIsEditing(true)
    setSelectedNote(null)
    setLockOnSave(false)
  }

  const handleSaveNote = async (
    noteId: number | null,
    content: string,
    password: string,
    shouldLock: boolean
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
          preview
        )
      } else {
        result = await window.electronAPI.saveNote(
          null,
          content,
          password,
          shouldLock,
          preview
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

  const onDeleteNote = async (noteId: number) => {
    const result = await window.electronAPI.deleteNote(noteId)
    if (result.success) {
      setNotes(notes.filter((note) => note.noteId !== noteId))
      if (selectedNote?.noteId === noteId) setSelectedNote(null)
      pushToast('Deleted', 'success')
    } else {
      // alert('Failed to delete note')
      pushToast('Failed to delete note', 'error')
    }
  }
  const unlockedThisSession =
    !!selectedNote?.locked &&
    (selectedNote.content !== 'Locked Note' ||
      (selectedNote.noteId != null && sessionUnlocked.has(selectedNote.noteId)))

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          {' '}
          <span className="brand-mark">🗒️</span> Secure Notes
        </div>
        <div className="header-meta">
          <span>
            {filtered.length} of {notes.length} notes
          </span>
          <span className="dot">•</span>
          <span>{notes.filter((n) => n.pinned).length} pinned</span>
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
                {filtered.length} result{filtered.length === 1 ? '' : 's'}
              </div>
            )}
          </div>

          <NoteList
            notes={filtered}
            selectedId={selectedNote?.noteId ?? null}
            onSelectNote={handleSelectNote}
            onEditNote={onEditNote}
            onDeleteNote={onDeleteNote}
            onTogglePin={handleTogglePin}
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
      {/* Toasts */}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
