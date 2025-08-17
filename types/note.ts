import { Descendant } from 'slate'

export interface Note {
  id: string
  title: string
  content: Descendant[]
  createdAt: Date
  updatedAt: Date
  tags?: string[]
  category?: string
  isImported?: boolean
  originalPath?: string
}

export interface NoteMetadata {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  tags?: string[]
  category?: string
  excerpt?: string
}

export interface ImportedNote {
  fileName: string
  content: string
  frontMatter?: Record<string, any>
}
