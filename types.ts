export interface Note {
  noteId: number
  content: string // Plaintext content for unlocked notes
  preview: string
  locked: boolean // Whether the note is locked or not
  iv?: string
  encryptedData?: string
  passwordHash?: string
  createdAt: number
  updatedAt: number
  pinned?: boolean
}
