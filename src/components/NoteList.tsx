import React, { memo } from 'react'
import { Note } from '../../types'
import '../styles.css'

interface NotesListProps {
  notes: Note[]
  selectedId: number | null
  onSelectNote: (note: Note) => void
  onEditNote: (noteId: number) => void
  onDeleteNote: (noteId: number) => void
  onTogglePin: (noteId: number, pinned: boolean) => void
}

function NotesList({
  notes,
  selectedId,
  onSelectNote,
  onEditNote,
  onDeleteNote,
  onTogglePin,
}: NotesListProps) {
  const title = (n: Note) =>
    n.preview?.trim() || (n.locked ? 'Locked Note' : 'Untitled')

  function relTime(ms?: number) {
    if (!ms) return ''
    const now = Date.now()
    const diff = Math.max(0, Math.floor((now - ms) / 1000)) // seconds
    if (diff < 10) return 'Just now'
    if (diff < 60) return `${diff}s ago`
    const m = Math.floor(diff / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d === 1) return 'Yesterday'
    const date = new Date(ms)
    const sameYear = date.getFullYear() === new Date().getFullYear()
    const opts: Intl.DateTimeFormatOptions = sameYear
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' }
    return date.toLocaleDateString(undefined, opts)
  }

  function fullDate(ms?: number) {
    if (!ms) return ''
    const d = new Date(ms)
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (notes.length === 0) {
    return (
      <div className="notes-list-container">
        <p>No notes yet. Create a new note.</p>
      </div>
    )
  }
  return (
    <div className="notes-list-container">
      <ul className="notes-ul" role="listbox" aria-label="Notes">
        {notes.map((note) => {
          const isSelected = selectedId === note.noteId
          const createdAt = note.createdAt ?? note.noteId
          const updatedAt = note.updatedAt ?? createdAt
          return (
            <li
              key={note.noteId}
              className={`note-row ${isSelected ? 'selected' : ''}`}
              role="option"
              aria-selected={isSelected}
              aria-label={`Note: ${title(note)}`}
              tabIndex={0}
              onClick={() => onSelectNote(note)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectNote(note)}
              // title={title(note)}
              title={`Created ${fullDate(createdAt)}`}
            >
              <div className="note-main">
                <div className="note-title">
                  {note.locked && (
                    <span className="lock-badge" aria-label="locked">
                      🔒
                    </span>
                  )}
                  {title(note)}
                </div>
                <div className="note-meta">
                  {note.pinned ? '📌 Pinned · ' : ''}
                  {/* {formatCreated(note.createdAt)} */}
                  {relTime(updatedAt)}
                </div>
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className={`btn pin ${note.pinned ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onTogglePin(note.noteId, !note.pinned)
                  }}
                  aria-pressed={!!note.pinned}
                  aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                  title={note.pinned ? 'Unpin' : 'Pin'}
                >
                  {note.pinned ? '★' : '☆'}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditNote(note.noteId)
                  }}
                  aria-label="Edit note"
                  title="Edit"
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn danger"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteNote(note.noteId)
                  }}
                  aria-label="Delete note"
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default memo(NotesList)
