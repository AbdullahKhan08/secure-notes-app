import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import fs from 'fs-extra'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import path from 'path'
import type { Note } from './types'
import { autoUpdater } from 'electron-updater'
function loadEnvironment() {
  const isPackaged = app.isPackaged
  const envPathProd = path.join(process.resourcesPath, '.env')
  const envPathDevA = path.join(__dirname, '..', '.env')
  const envPathDevB = path.join(process.cwd(), '.env')

  const envPath = isPackaged
    ? envPathProd
    : fs.existsSync(envPathDevA)
    ? envPathDevA
    : envPathDevB

  try {
    require('dotenv').config({ path: envPath })
    console.log(`Loaded .env from: ${envPath}`)
  } catch (e) {
    console.warn('No .env loaded', e)
  }
}

loadEnvironment()

const algorithm = 'aes-256-cbc'
const secretKey = Buffer.from(process.env.SECRET_KEY || '', 'base64')

autoUpdater.on('update-available', () => {
  // Optional: give the user a heads-up
  if (win) {
    dialog.showMessageBox(win, {
      type: 'info',
      message: 'An update is available. It will download in the background.',
      buttons: ['OK'],
    })
  }
})

autoUpdater.on('update-downloaded', () => {
  // Ask to restart now
  if (!win) return
  dialog
    .showMessageBox(win, {
      type: 'question',
      buttons: ['Install & Restart', 'Later'],
      defaultId: 0,
      cancelId: 1,
      message: 'Update downloaded',
      detail: 'Install the update and restart the app now?',
    })
    .then((res) => {
      if (res.response === 0) autoUpdater.quitAndInstall()
    })
})

let win: BrowserWindow | null = null
let splash: BrowserWindow | null = null

let splashShownAt = 0
let revealed = false
const SPLASH_MIN_MS = 2500

function getSplashHtmlPath() {
  if (app.isPackaged) {
    return path.join(__dirname, 'splash.html')
  }
  return path.join(process.cwd(), 'public', 'splash.html')
}

function createSplash(): Promise<void> {
  return new Promise((resolve) => {
    revealed = false

    splash = new BrowserWindow({
      width: 600,
      height: 400,
      minWidth: 600,
      minHeight: 400,
      backgroundColor: '#fffdf6',
      frame: false,
      center: true,
      alwaysOnTop: true,
      resizable: false,
      show: false,
      skipTaskbar: true,
      movable: false,
      focusable: false,
      webPreferences: {
        devTools: false,
      },
    })

    const splashPath = getSplashHtmlPath()
    splash.once('ready-to-show', () => {
      splashShownAt = Date.now()
      splash!.show()
      resolve()
    })

    splash.loadFile(splashPath).catch((err) => {
      console.error('⚠️ Failed to load splash.html:', err)
      resolve()
    })
  })
}

function safeCloseSplash(minMs = SPLASH_MIN_MS) {
  const elapsed = Date.now() - splashShownAt
  const delay = Math.max(0, minMs - elapsed)
  setTimeout(() => {
    if (splash && !splash.isDestroyed()) splash.close()
    splash = null
  }, delay)
}

function createWindow() {
  if (secretKey.length !== 32) {
    console.error(
      'SECRET_KEY must be a 32-byte base64 string (AES-256). ' +
        `Got ${secretKey.length} bytes.`
    )
    app.quit()
  }

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
    icon: path.join(__dirname, 'build', 'icons', 'secure-notes-icon-1024.png'),
    backgroundColor: '#fffdf6',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: false,
      spellcheck: false,
      zoomFactor: 1.0,
    },
  })
  app.setAppUserModelId?.('com.abdullahkhan.securenotes')

  win.setBounds({ x: 0, y: 0, width: 1600, height: 1000 })
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000').catch((err) => {
      console.error('Error loading React app:', err)
      safeCloseSplash()
      app.quit()
    })
  } else {
    const buildPath = path.join(__dirname, '..', 'renderer', 'index.html')
    win.loadFile(buildPath).catch((err) => {
      console.error('Error loading production build:', err)
      safeCloseSplash()
      app.quit()
    })
  }

  const revealOnce = () => {
    if (revealed) return
    revealed = true
    const elapsed = Date.now() - splashShownAt
    const delay = Math.max(0, SPLASH_MIN_MS - elapsed)

    setTimeout(() => {
      if (splash && !splash.isDestroyed()) splash.close()
      splash = null
      win?.show()
      win?.focus()
    }, delay)
  }

  win.webContents.once('did-finish-load', revealOnce)
  win.webContents.once('dom-ready', () => {
    if (!win?.isVisible()) revealOnce()
  })

  win.on('closed', () => {
    win = null
  })
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

app.whenReady().then(async () => {
  await createSplash()
  createWindow()
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify()
  }, 1500)
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSplash()
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

/////

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

function stripSecrets(n: Note) {
  const { iv, encryptedData, passwordHash, ...safe } = n as any
  return safe as Note
}

function maskIfLocked(n: Note) {
  const safe = stripSecrets(n)
  return { ...safe, content: n.locked ? 'Locked Note' : n.content } as Note
}

const cleanTags = (arr: string[] | undefined) =>
  Array.from(
    new Set(
      (arr ?? [])
        .flatMap((t) => t.split(','))
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
      const id = noteId ?? now
      const preview = makePreview(content)
      const tagList = cleanTags(tags)

      const idx = notes.findIndex((n) => n.noteId === id)
      let note: Note

      if (idx >= 0) {
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
    return notes
      .filter((n) => !n.deletedAt)
      .map((n) => maskIfLocked({ ...n, tags: n.tags ?? [] }))
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
      if (note.deletedAt) throw new Error('This note is in Trash')
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
      if (note.deletedAt) throw new Error('This note is in Trash')
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
      const notes: Note[] = await fs.readJson(file)
      const i = notes.findIndex((n) => n.noteId === noteId)
      if (i === -1) throw new Error('Note not found')
      const ts = Date.now()
      notes[i].deletedAt = ts
      notes[i].updatedAt = ts
      await fs.writeJson(file, notes, { spaces: 2 })
      return { success: true }
    } catch (e: any) {
      console.error(e)
      return { success: false, error: e.message }
    }
  }
)

ipcMain.handle(
  'restore-note',
  async (
    event,
    noteId: number
  ): Promise<
    { success: true; note: Note } | { success: false; error: string }
  > => {
    try {
      const file = getNotesFilePath()
      const notes: Note[] = await fs.readJson(file)
      const i = notes.findIndex((n) => n.noteId === noteId)
      if (i === -1) throw new Error('Note not found')

      notes[i].deletedAt = undefined
      notes[i].updatedAt = Date.now()
      await fs.writeJson(file, notes, { spaces: 2 })
      return { success: true, note: maskIfLocked(notes[i]) }
    } catch (e: any) {
      console.error(e)
      return { success: false, error: e.message }
    }
  }
)

ipcMain.handle(
  'delete-forever',
  async (
    event,
    noteId: number
  ): Promise<{ success: true } | { success: false; error: string }> => {
    try {
      const file = getNotesFilePath()
      const notes: Note[] = await fs.readJson(file)
      const filtered = notes.filter((n) => n.noteId !== noteId)
      await fs.writeJson(file, filtered, { spaces: 2 })
      return { success: true }
    } catch (e: any) {
      console.error(e)
      return { success: false, error: e.message }
    }
  }
)

ipcMain.handle('get-trash', async (): Promise<Note[]> => {
  try {
    const file = getNotesFilePath()
    const notes: Note[] = await fs.readJson(file).catch(() => [])
    return notes
      .filter((n) => !!n.deletedAt)
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
      .map((n) => maskIfLocked({ ...n, tags: n.tags ?? [] }))
  } catch (e) {
    console.error(e)
    return []
  }
})

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
      if (n.deletedAt) throw new Error('This note is in Trash')
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

// auto updater

ipcMain.handle('app-version', () => app.getVersion())
ipcMain.handle('open-external', (_e, url: string) => {
  if (url) shell.openExternal(url)
})
