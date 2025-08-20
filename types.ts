export interface Note {
  noteId: number
  content: string
  preview: string
  locked: boolean
  iv?: string
  encryptedData?: string
  passwordHash?: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
  pinned?: boolean
  tags: string[]
}
