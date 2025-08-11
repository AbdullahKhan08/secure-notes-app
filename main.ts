import { app, BrowserWindow, ipcMain } from 'electron'
import fs from 'fs-extra'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import path from 'path'
import { config } from 'dotenv'
import type { Note } from './types'
config()

const algorithm = 'aes-256-cbc'
const secretKey = Buffer.from(process.env.SECRET_KEY || '', 'base64')
if (secretKey.length !== 32) {
  console.error(
    'SECRET_KEY must be a 32-byte base64 string (AES-256). ' +
      `Got ${secretKey.length} bytes.`
  )
  app.quit()
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const w = win ?? BrowserWindow.getAllWindows()[0]
    if (w) {
      if (w.isMinimized()) w.restore()
      w.focus()
    }
  })
}

let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1280,
    minHeight: 720,
    resizable: true,
    maximizable: true,
    minimizable: true,
    fullscreenable: true,
    fullscreen: false,
    title: 'Secure Notes App',
    show: false,
    backgroundColor: '#fffdf6',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // devTools: false,
      spellcheck: false,
      zoomFactor: 1.0,
    },
  })

  win.setBounds({ x: 0, y: 0, width: 1600, height: 1000 })
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000').catch((err) => {
      console.error('Error loading React app:', err)
      app.quit()
    })
    win.once('ready-to-show', () => win!.show())
  } else {
    const buildPath = path.join(__dirname, 'frontend', 'build', 'index.html')
    win.loadFile(buildPath).catch((err) => {
      console.error('Error loading production build:', err)
      app.quit()
    })
    win.once('ready-to-show', () => win!.show())
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  win.on('closed', () => {
    win = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

const getNotesFilePath = () => {
  const notesFilePath = path.join(app.getPath('userData'), 'notes.json')

  const fileExists = fs.pathExistsSync(notesFilePath)

  if (!fileExists) {
    try {
      fs.writeJsonSync(notesFilePath, [])
      console.log('notes.json file was created as it did not exist.')
    } catch (error) {
      console.error('Error creating notes.json file:', error)
    }
  }

  return notesFilePath
}

const makePreview = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 10)

// Helpers to keep sensitive fields out of the renderer
function stripSecrets(n: Note) {
  // remove crypto material before sending to the UI
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { iv, encryptedData, passwordHash, ...safe } = n as any
  return safe as Note
}

function maskIfLocked(n: Note) {
  // if locked, hide content; otherwise pass it through
  const safe = stripSecrets(n)
  return { ...safe, content: n.locked ? 'Locked Note' : n.content } as Note
}

const cleanTags = (arr: string[] | undefined) =>
  Array.from(
    new Set(
      (arr ?? [])
        .flatMap((t) => t.split(',')) // let users paste "a, b, c"
        .map((t) => t.trim())
        .filter(Boolean)
    )
  )

ipcMain.handle(
  'save-note',
  async (
    event,
    noteId: number | null,
    content: string,
    password: string | null,
    shouldLock: boolean,
    _preview: string,
    tags: string[]
  ): Promise<
    { success: true; note: Note } | { success: false; error: string }
  > => {
    try {
      if (!content || (shouldLock && !password)) {
        throw new Error('Note content and password are required')
      }
      const file = getNotesFilePath()
      const notes: Note[] = await fs.readJson(file).catch(() => [])
      const now = Date.now()
      const id = noteId ?? Date.now()
      const preview = makePreview(content)
      const tagList = cleanTags(tags)

      const idx = notes.findIndex((n) => n.noteId === id)
      let note: Note

      // const note: Note = {
      //   noteId: id,
      //   content: shouldLock ? 'Locked Note' : content,
      //   preview,
      //   locked: shouldLock,
      //   createdAt: now,
      //   updatedAt: now,
      //   pinned: false,
      // }

      if (idx >= 0) {
        // (rare) overwrite via save-note: preserve createdAt/pinned
        const prev = notes[idx]
        note = {
          ...prev,
          content: shouldLock ? 'Locked Note' : content,
          preview,
          locked: shouldLock,
          updatedAt: now,
          tags: tagList,
        }
      } else {
        note = {
          noteId: id,
          content: shouldLock ? 'Locked Note' : content,
          preview,
          locked: shouldLock,
          createdAt: now,
          updatedAt: now,
          pinned: false,
          tags: tagList,
        }
      }

      if (shouldLock) {
        const iv = crypto.randomBytes(16)
        const cipher = crypto.createCipheriv(algorithm, secretKey, iv)
        let encrypted = cipher.update(content, 'utf8', 'hex')
        encrypted += cipher.final('hex')
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password!, salt)

        note.iv = iv.toString('hex')
        note.encryptedData = encrypted
        note.passwordHash = hashedPassword
      } else {
        // IMPORTANT: ensure no stale crypto fields remain when unlocking via save-note
        delete note.iv
        delete note.encryptedData
        delete note.passwordHash
      }

      if (idx >= 0) notes[idx] = note
      else notes.push(note)

      await fs.writeJson(file, notes, { spaces: 2 })
      return { success: true, note: maskIfLocked(note) }
    } catch (e: any) {
      console.error(e)
      return { success: false, error: e.message }
    }
  }
)

ipcMain.handle('get-notes', async (): Promise<Note[]> => {
  try {
    const file = getNotesFilePath()
    const notes: Note[] = await fs.readJson(file).catch(() => {
      fs.writeJson(file, [])
      console.warn('No notes found, initializing empty notes array.')
      return []
    })
    if (notes.length === 0) {
      console.warn('No notes found in the file.')
      return []
    }

    // return notes.map(maskIfLocked)
    return notes.map((n) => maskIfLocked({ ...n, tags: n.tags ?? [] }))
  } catch (e) {
    console.error(e)
    return []
  }
})

ipcMain.handle(
  'unlock-note',
  async (
    event,
    noteId: number,
    password: string
  ): Promise<
    { success: true; note: Note } | { success: false; error: string }
  > => {
    try {
      const file = getNotesFilePath()
      const notes: Note[] = await fs.readJson(file)
      const note = notes.find((n) => n.noteId === noteId)
      if (!note) throw new Error('Note not found')
      if (!note.locked) return { success: true, note: stripSecrets(note) }

      const ok = await bcrypt.compare(password, note.passwordHash || '')
      if (!ok) throw new Error('Incorrect password')

      const iv = Buffer.from(note.iv!, 'hex')
      const decipher = crypto.createDecipheriv(algorithm, secretKey, iv)
      let decrypted = decipher.update(note.encryptedData!, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return {
        success: true,
        note: stripSecrets({ ...note, content: decrypted }),
      }
    } catch (e: any) {
      console.error(e)
      return { success: false, error: e.message }
    }
  }
)

ipcMain.handle(
  'edit-note',
  async (
    event,
    noteId: number,
    content: string,
    password: string | null,
    shouldLock: boolean,
    _preview: string,
    tags: string[]
  ): Promise<
    { success: true; note: Note } | { success: false; error: string }
  > => {
    try {
      const file = getNotesFilePath()
      const notes = await fs.readJson(file)
      const noteIndex = notes.findIndex((note: Note) => note.noteId === noteId)
      if (noteIndex === -1) throw new Error('Note not found')

      const note = notes[noteIndex]
      const now = Date.now()
      const preview = makePreview(content)
      const tagList = cleanTags(tags)
      note.preview = preview
      note.updatedAt = now
      note.tags = tagList

      if (shouldLock) {
        const wasLocked = note.locked === true
        let passwordHashToUse: string | null = note.passwordHash ?? null

        if (password && password.trim()) {
          const salt = await bcrypt.genSalt(10)
          passwordHashToUse = await bcrypt.hash(password, salt)
        } else if (!wasLocked || !passwordHashToUse) {
          throw new Error('Password is required to lock this note')
        }
        const iv = crypto.randomBytes(16)
        const cipher = crypto.createCipheriv(algorithm, secretKey, iv)
        let encrypted = cipher.update(content, 'utf8', 'hex')
        encrypted += cipher.final('hex')

        // const salt = await bcrypt.genSalt(10)
        // const hashedPassword = await bcrypt.hash(password!, salt)
        // passwordHashToUse = await bcrypt.hash(password!, salt)
        note.locked = true
        note.content = 'Locked Note'
        note.iv = iv.toString('hex')
        note.encryptedData = encrypted
        note.passwordHash = passwordHashToUse
      } else {
        note.locked = false
        note.content = content
        delete note.iv
        delete note.encryptedData
        delete note.passwordHash
      }

      notes[noteIndex] = note
      await fs.writeJson(file, notes, { spaces: 2 })

      return { success: true, note: maskIfLocked(note) }
    } catch (error: any) {
      console.error('Error editing note:', error)
      return { success: false, error: error.message }
    }
  }
)

ipcMain.handle(
  'delete-note',
  async (
    event,
    noteId: number
  ): Promise<{ success: true } | { success: false; error: string }> => {
    try {
      const file = getNotesFilePath()
      let notes: Note[] = await fs.readJson(file)

      notes = notes.filter((n) => n.noteId !== noteId)
      await fs.writeJson(file, notes)
      return { success: true }
    } catch (e: any) {
      console.error(e)
      return { success: false, error: e.message }
    }
  }
)

ipcMain.handle(
  'toggle-pin',
  async (
    event,
    noteId: number,
    pinned: boolean
  ): Promise<
    { success: true; note: Note } | { success: false; error: string }
  > => {
    try {
      const file = getNotesFilePath()
      const notes: Note[] = await fs.readJson(file)
      const i = notes.findIndex((n) => n.noteId === noteId)
      if (i === -1) throw new Error('Note not found')
      const n = notes[i]
      n.pinned = !!pinned
      n.updatedAt = Date.now()
      notes[i] = n
      await fs.writeJson(file, notes, { spaces: 2 })
      return { success: true, note: maskIfLocked(n) }
    } catch (e: any) {
      console.error(e)
      return { success: false, error: e.message }
    }
  }
)
