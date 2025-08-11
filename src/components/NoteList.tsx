import React, { memo } from 'react'
import { Note } from '../../types'
import '../styles.css'

interface NotesListProps {
  notes: Note[]
  selectedId: number | null
  onSelectNote: (note: Note) => void
  onEditNote: (noteId: number) => void
  onDeleteNote: (noteId: number) => void
}

function NotesList({
  notes,
  selectedId,
  onSelectNote,
  onEditNote,
  onDeleteNote,
}: NotesListProps) {
  const title = (n: Note) =>
    n.preview?.trim() || (n.locked ? 'Locked Note' : 'Untitled')

  if (notes.length === 0) {
    return (
      <div className="notes-list-container">
        <p>No notes yet. Create a new note.</p>
      </div>
    )
  }
  return (
    <div className="notes-list-container">
      <ul className="notes-ul">
        {notes.map((note) => {
          const isSelected = selectedId === note.noteId
          return (
            <li
              key={note.noteId}
              className={`note-row ${isSelected ? 'selected' : ''}`}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => onSelectNote(note)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectNote(note)}
              title={title(note)}
            >
              <span className="note-title">
                {note.locked && (
                  <span className="lock-badge" aria-label="locked">
                    🔒
                  </span>
                )}
                {title(note)}
              </span>
              <div className="row-actions">
                <button
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
