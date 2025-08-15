import React, { memo } from 'react'
import { Note } from '../../types'
import '../styles.css'

interface NotesListProps {
  notes: Note[]
  selectedId: number | null
  onSelectNote: (note: Note) => void
  onEditNote?: (noteId: number) => void
  onDeleteNote?: (noteId: number) => void
  onTogglePin?: (noteId: number, pinned: boolean) => void
  onRestoreNote?: (noteId: number) => void
  onDeleteForever?: (noteId: number) => void
  mode?: 'active' | 'trash'
  emptyMessage?: string // NEW
}

function NotesList({
  notes,
  selectedId,
  onSelectNote,
  onEditNote,
  onDeleteNote,
  onTogglePin,
  onRestoreNote,
  onDeleteForever,
  mode = 'active',
  emptyMessage,
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
        <p>{emptyMessage ?? 'No notes yet. Create a new note.'}</p>
      </div>
    )
  }
  return (
    <div className="notes-list-container">
      <ul
        className="notes-ul"
        role={mode === 'trash' ? undefined : 'listbox'}
        aria-label={mode === 'trash' ? 'Deleted notes' : 'Notes'}
      >
        {notes.map((note) => {
          const isSelected = selectedId === note.noteId
          const createdAt = note.createdAt ?? note.noteId
          const updatedAt = note.updatedAt ?? createdAt
          const deletedAt = note.deletedAt
          const showPinned = mode !== 'trash' && !!note.pinned

          return (
            <li
              key={note.noteId}
              className={`note-row ${
                mode !== 'trash' && isSelected ? 'selected' : ''
              }`}
              role={mode === 'trash' ? undefined : 'option'}
              aria-selected={mode === 'trash' ? undefined : isSelected}
              aria-label={`Note: ${title(note)}`}
              tabIndex={0}
              onClick={() => {
                if (mode !== 'trash') onSelectNote(note)
              }}
              onKeyDown={(e) => {
                if (mode === 'trash') return
                const k = e.key.toLowerCase()
                if (k === 'enter' || k === ' ') {
                  e.preventDefault()
                  onSelectNote(note)
                }
              }}
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
                {(note.tags?.length ?? 0) > 0 && (
                  <div className="note-tags-row">
                    {note.tags!.map((t, i) => (
                      <span key={`${t}-${i}`} className="tag-chip tiny">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                {/* <div className="note-meta">
                  {note.pinned ? '📌 Pinned · ' : ''}
              
                  {relTime(updatedAt)}
                </div> */}
                <div className="note-meta">
                  {mode === 'trash' ? (
                    <>Deleted {relTime(deletedAt ?? updatedAt)}</>
                  ) : (
                    <>
                      {showPinned ? '📌 Pinned · ' : ''}
                      {relTime(updatedAt)}
                    </>
                  )}
                </div>
              </div>
              <div className="row-actions">
                {mode !== 'trash' ? (
                  <>
                    <button
                      type="button"
                      className={`btn pin ${note.pinned ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onTogglePin?.(note.noteId, !note.pinned)
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
                        onEditNote?.(note.noteId)
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
                        onDeleteNote?.(note.noteId)
                      }}
                      aria-label="Delete note"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRestoreNote?.(note.noteId)
                      }}
                      aria-label="Restore note"
                      title="Restore"
                    >
                      Restore
                    </button>
                    <button
                      className="btn danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteForever?.(note.noteId)
                      }}
                      aria-label="Delete note forever"
                      title="Delete forever"
                    >
                      Delete forever
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default memo(NotesList)
