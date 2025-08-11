// App.tsx
import React, { useState, useEffect } from 'react'
import NoteEditor from './components/NoteEditor'
import NoteList from './components/NoteList'
import PasswordModal from './components/PasswordModal'
import './styles.css'
import { Note } from '../types'

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

  useEffect(() => {
    const fetchNotes = async () => {
      const fetchedNotes = await window.electronAPI.getNotes()
      console.log(fetchedNotes)
      setNotes(fetchedNotes)
      if (fetchedNotes.length > 0) {
        setSelectedNote(fetchedNotes[fetchedNotes.length - 1])
      }
    }
    fetchNotes()
  }, [])

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
        alert('Please enter note content')
        return
      }

      if (shouldLock && !password && !originallyLocked) {
        alert('Please enter password')
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
        const saved: Note =
          'note' in result
            ? result.note
            : {
                noteId: result.noteId,
                content: shouldLock ? 'Locked Note' : content,
                preview,
                locked: shouldLock,
              }
        const uiNote: Note = shouldLock ? { ...saved, content } : saved

        setNotes((prev) =>
          prev.some((n) => n.noteId === uiNote.noteId)
            ? prev.map((n) => (n.noteId === uiNote.noteId ? uiNote : n))
            : [...prev, uiNote]
        )
        setSelectedNote(uiNote)
        if (shouldLock) {
          setSessionUnlocked((prev) => new Set(prev).add(uiNote.noteId))
        }
        setIsEditing(false)
        setLockOnSave(false)
      } else {
        alert(result.error)
      }
    } catch (error) {
      console.log('error', error)
    }
  }

  const handleUnlockNote = async (password: string) => {
    if (modalNoteId == null) return
    const result = await window.electronAPI.unlockNote(modalNoteId, password)
    if (!result.success) {
      alert(result.error)
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
    } else {
      alert('Failed to delete note')
    }
  }

  return (
    <div className="app">
      <div className="notes-list">
        <button className="btn primary new-note-btn" onClick={handleNew}>
          + New Note
        </button>
        <NoteList
          notes={notes}
          selectedId={selectedNote?.noteId ?? null}
          onSelectNote={handleSelectNote}
          onEditNote={onEditNote}
          onDeleteNote={onDeleteNote}
        />
      </div>
      <div className="note-editor">
        {(isEditing || selectedNote) && (
          <NoteEditor
            note={selectedNote}
            setLockOnSave={setLockOnSave}
            lockOnSave={lockOnSave}
            onSave={handleSaveNote}
            isEditing={isEditing}
            originalLocked={!!selectedNote?.locked}
          />
        )}
      </div>

      <PasswordModal
        isOpen={modalOpen}
        action={modalAction}
        onClose={() => setModalOpen(false)}
        onSubmit={handleUnlockNote}
      />
    </div>
  )
}

export default App
