import { contextBridge, ipcRenderer } from 'electron'
import { Note } from './types'

type SaveResult =
  | { success: true; note: Note }
  | { success: false; error: string }
type UnlockResult =
  | { success: true; note: Note }
  | { success: false; error: string }
type EditResult =
  | { success: true; note: Note }
  | { success: false; error: string }
type DeleteResult = { success: true } | { success: false; error: string }
type RestoreResult =
  | { success: true; note: Note }
  | { success: false; error: string }

contextBridge.exposeInMainWorld('electronAPI', {
  saveNote: (
    noteId: number | null,
    content: string,
    password: string | null,
    shouldLock: boolean,
    preview: string,
    tags: string[]
  ): Promise<SaveResult> =>
    ipcRenderer.invoke(
      'save-note',
      noteId,
      content,
      password,
      shouldLock,
      preview,
      tags
    ),

  getNotes: (): Promise<Note[]> => ipcRenderer.invoke('get-notes'),

  unlockNote: (noteId: number, password: string): Promise<UnlockResult> =>
    ipcRenderer.invoke('unlock-note', noteId, password),

  editNote: (
    noteId: number,
    content: string,
    password: string | null,
    shouldLock: boolean,
    preview: string,
    tags: string[]
  ): Promise<EditResult> =>
    ipcRenderer.invoke(
      'edit-note',
      noteId,
      content,
      password,
      shouldLock,
      preview,
      tags
    ),

  deleteNote: (noteId: number): Promise<DeleteResult> =>
    ipcRenderer.invoke('delete-note', noteId),

  getTrash: (): Promise<Note[]> => ipcRenderer.invoke('get-trash'),
  restoreNote: (noteId: number): Promise<RestoreResult> =>
    ipcRenderer.invoke('restore-note', noteId),
  deleteForever: (noteId: number): Promise<DeleteResult> =>
    ipcRenderer.invoke('delete-forever', noteId),

  togglePin: (noteId: number, pinned: boolean): Promise<EditResult> =>
    ipcRenderer.invoke('toggle-pin', noteId, pinned),
})

contextBridge.exposeInMainWorld('appAPI', {
  getVersion: () => ipcRenderer.invoke('app-version'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
})
