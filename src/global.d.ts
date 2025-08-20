import { Note } from '../types'

declare global {
  interface Window {
    electronAPI: {
      saveNote: (
        noteId: number | null,
        content: string,
        password: string | null,
        shouldLock: boolean,
        preview: string,
        tags: string[]
      ) => Promise<
        { success: true; note: Note } | { success: false; error: string }
      >

      getNotes: () => Promise<Note[]>

      unlockNote: (
        noteId: number,
        password: string
      ) => Promise<
        { success: true; note: Note } | { success: false; error: string }
      >

      editNote: (
        noteId: number,
        content: string,
        password: string | null,
        shouldLock: boolean,
        preview: string,
        tags: string[]
      ) => Promise<
        { success: true; note: Note } | { success: false; error: string }
      >

      deleteNote: (
        noteId: number
      ) => Promise<{ success: true } | { success: false; error: string }>

      getTrash: () => Promise<Note[]>

      restoreNote: (
        noteId: number
      ) => Promise<
        { success: true; note: Note } | { success: false; error: string }
      >

      deleteForever: (
        noteId: number
      ) => Promise<{ success: true } | { success: false; error: string }>

      togglePin: (
        noteId: number,
        pinned: boolean
      ) => Promise<
        { success: true; note: Note } | { success: false; error: string }
      >
    }
    appAPI: {
      getVersion: () => Promise<string>
      openExternal: (url: string) => Promise<void>
    }
  }
}

export {}
