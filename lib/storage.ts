import { Note, NoteMetadata } from "@/types/note";
import { v4 as uuidv4 } from "uuid";
import {
  smartCleanup,
  canSaveNote,
  estimateNoteSize,
  cleanupCorruptedData,
} from "./storage-manager";

const STORAGE_KEY = "mynotes_data";
const METADATA_KEY = "mynotes_metadata";

// 获取所有笔记元数据
export function getAllNotesMetadata(): NoteMetadata[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(METADATA_KEY);
  if (!data) return [];

  try {
    const metadata = JSON.parse(data);
    return metadata.map((item: any) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
  } catch (error) {
    console.error("Error parsing notes metadata:", error);
    return [];
  }
}

// 获取单个笔记
export function getNote(id: string): Note | null {
  if (typeof window === "undefined") return null;

  const data = localStorage.getItem(`${STORAGE_KEY}_${id}`);
  if (!data) return null;

  try {
    const note = JSON.parse(data);
    return {
      ...note,
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt),
    };
  } catch (error) {
    console.error("Error parsing note:", error);
    return null;
  }
}

// 保存笔记
export function saveNote(note: Note): void {
  if (typeof window === "undefined") return;

  try {
    // 保存笔记内容
    const noteData = {
      ...note,
      createdAt:
        note.createdAt instanceof Date
          ? note.createdAt.toISOString()
          : new Date(note.createdAt).toISOString(),
      updatedAt:
        note.updatedAt instanceof Date
          ? note.updatedAt.toISOString()
          : new Date(note.updatedAt).toISOString(),
    };

    // 检查存储空间
    const dataStr = JSON.stringify(noteData);
    const dataSize = new Blob([dataStr]).size;

    // 如果单个笔记超过 500KB，可能需要压缩或拒绝
    if (dataSize > 500 * 1024) {
      console.warn(
        `Note ${note.id} is too large: ${(dataSize / 1024).toFixed(2)}KB`,
      );
      // 尝试压缩内容
      const compressedNote = {
        ...noteData,
        content: compressContent(noteData.content),
      };
      localStorage.setItem(
        `${STORAGE_KEY}_${note.id}`,
        JSON.stringify(compressedNote),
      );
    } else {
      localStorage.setItem(`${STORAGE_KEY}_${note.id}`, dataStr);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      // 存储空间已满，尝试智能清理
      console.error("Storage quota exceeded. Attempting smart cleanup...");

      const requiredSpace = estimateNoteSize(note) + 100 * 1024; // 需要的空间 + 缓冲
      const cleanupSuccess = smartCleanup(requiredSpace);

      if (cleanupSuccess) {
        // 重试一次
        try {
          const noteData = {
            ...note,
            createdAt:
              note.createdAt instanceof Date
                ? note.createdAt.toISOString()
                : new Date(note.createdAt).toISOString(),
            updatedAt:
              note.updatedAt instanceof Date
                ? note.updatedAt.toISOString()
                : new Date(note.updatedAt).toISOString(),
          };
          localStorage.setItem(
            `${STORAGE_KEY}_${note.id}`,
            JSON.stringify(noteData),
          );
        } catch (retryError) {
          throw new Error(
            "存储空间已满，无法保存新笔记。请手动删除一些旧笔记。",
          );
        }
      } else {
        throw new Error("存储空间已满，自动清理失败。请手动删除一些笔记。");
      }
    } else {
      throw error;
    }
  }

  // 更新元数据
  const metadata = getAllNotesMetadata();
  const existingIndex = metadata.findIndex((m) => m.id === note.id);

  const noteMetadata: NoteMetadata = {
    id: note.id,
    title: note.title,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    tags: note.tags,
    category: note.category,
    excerpt: extractExcerpt(note.content),
  };

  if (existingIndex >= 0) {
    metadata[existingIndex] = noteMetadata;
  } else {
    metadata.push(noteMetadata);
  }

  const metadataData = metadata.map((m) => ({
    ...m,
    createdAt:
      m.createdAt instanceof Date
        ? m.createdAt.toISOString()
        : new Date(m.createdAt).toISOString(),
    updatedAt:
      m.updatedAt instanceof Date
        ? m.updatedAt.toISOString()
        : new Date(m.updatedAt).toISOString(),
  }));
  localStorage.setItem(METADATA_KEY, JSON.stringify(metadataData));
}

// 创建新笔记
export function createNote(noteData: Omit<Note, "id">): Note {
  const note: Note = {
    ...noteData,
    id: uuidv4(),
  };

  saveNote(note);
  return note;
}

// 更新笔记
export function updateNote(
  id: string,
  updates: Partial<Omit<Note, "id" | "createdAt">>,
): Note | null {
  const note = getNote(id);
  if (!note) return null;

  const updatedNote: Note = {
    ...note,
    ...updates,
    updatedAt: new Date(),
  };

  saveNote(updatedNote);
  return updatedNote;
}

// 删除笔记
export function deleteNote(id: string): boolean {
  if (typeof window === "undefined") return false;

  // 删除笔记内容
  localStorage.removeItem(`${STORAGE_KEY}_${id}`);

  // 更新元数据
  const metadata = getAllNotesMetadata();
  const filtered = metadata.filter((m) => m.id !== id);

  const metadataData = filtered.map((m) => ({
    ...m,
    createdAt:
      m.createdAt instanceof Date
        ? m.createdAt.toISOString()
        : new Date(m.createdAt).toISOString(),
    updatedAt:
      m.updatedAt instanceof Date
        ? m.updatedAt.toISOString()
        : new Date(m.updatedAt).toISOString(),
  }));
  localStorage.setItem(METADATA_KEY, JSON.stringify(metadataData));

  return true;
}

// 搜索笔记
export function searchNotes(query: string): NoteMetadata[] {
  const metadata = getAllNotesMetadata();
  const lowerQuery = query.toLowerCase();

  return metadata.filter((note) => {
    const titleMatch = note.title.toLowerCase().includes(lowerQuery);
    const tagMatch = note.tags?.some((tag) =>
      tag.toLowerCase().includes(lowerQuery),
    );
    const categoryMatch = note.category?.toLowerCase().includes(lowerQuery);
    const excerptMatch = note.excerpt?.toLowerCase().includes(lowerQuery);

    return titleMatch || tagMatch || categoryMatch || excerptMatch;
  });
}

// 按标签筛选笔记
export function getNotesByTag(tag: string): NoteMetadata[] {
  const metadata = getAllNotesMetadata();
  return metadata.filter((note) => note.tags?.includes(tag));
}

// 按分类筛选笔记
export function getNotesByCategory(category: string): NoteMetadata[] {
  const metadata = getAllNotesMetadata();
  return metadata.filter((note) => note.category === category);
}

// 获取所有标签
export function getAllTags(): string[] {
  const metadata = getAllNotesMetadata();
  const tagsSet = new Set<string>();

  metadata.forEach((note) => {
    note.tags?.forEach((tag) => tagsSet.add(tag));
  });

  return Array.from(tagsSet).sort();
}

// 获取所有分类
export function getAllCategories(): string[] {
  const metadata = getAllNotesMetadata();
  const categoriesSet = new Set<string>();

  metadata.forEach((note) => {
    if (note.category) {
      categoriesSet.add(note.category);
    }
  });

  return Array.from(categoriesSet).sort();
}

// 批量导入笔记
export function batchSaveNotes(notes: Omit<Note, "id">[]): Note[] {
  const savedNotes: Note[] = [];
  const failedNotes: { note: Omit<Note, "id">; error: string }[] = [];

  // 先清理损坏的数据
  const corruptedCleaned = cleanupCorruptedData();
  if (corruptedCleaned > 0) {
    console.log(`Cleaned ${corruptedCleaned} corrupted entries before import`);
  }

  // 检查可用存储空间
  const { used, available } = getStorageInfo();
  const remainingSpace = available - used;

  console.log(
    `Storage info: Used ${(used / 1024 / 1024).toFixed(2)}MB, Available ${(remainingSpace / 1024 / 1024).toFixed(2)}MB`,
  );

  // 按大小排序，优先导入小的笔记
  const sortedNotes = [...notes].sort((a, b) => {
    const sizeA = estimateNoteSize(a);
    const sizeB = estimateNoteSize(b);
    return sizeA - sizeB;
  });

  for (const noteData of sortedNotes) {
    try {
      // 检查是否有足够空间
      if (!canSaveNote(noteData)) {
        // 尝试智能清理
        const requiredSpace = estimateNoteSize(noteData) + 100 * 1024;
        const cleanupSuccess = smartCleanup(requiredSpace);

        if (!cleanupSuccess) {
          console.warn(
            `Skipping note "${noteData.title}" - insufficient space even after cleanup`,
          );
          failedNotes.push({
            note: noteData,
            error: "存储空间不足",
          });
          continue;
        }
      }

      const note = createNote(noteData);
      savedNotes.push(note);
    } catch (error) {
      console.error(`Failed to save note: ${noteData.title}`, error);
      failedNotes.push({
        note: noteData,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // 如果连续失败太多，停止导入
      if (failedNotes.length > 5) {
        console.error(
          `Too many failures. Successfully imported ${savedNotes.length} notes.`,
        );
        break;
      }
    }
  }

  if (failedNotes.length > 0) {
    console.warn(
      `Import complete: ${savedNotes.length} succeeded, ${failedNotes.length} failed`,
    );
  }

  if (failedNotes.length > 0 && savedNotes.length === 0) {
    throw new Error(`无法导入任何笔记。存储空间严重不足，请清理后重试。`);
  }

  return savedNotes;
}

// 导出所有笔记
export function exportAllNotes(): Note[] {
  const metadata = getAllNotesMetadata();
  const notes: Note[] = [];

  metadata.forEach((meta) => {
    const note = getNote(meta.id);
    if (note) {
      notes.push(note);
    }
  });

  return notes;
}

// 清空所有笔记
export function clearAllNotes(): void {
  if (typeof window === "undefined") return;

  const metadata = getAllNotesMetadata();
  metadata.forEach((meta) => {
    localStorage.removeItem(`${STORAGE_KEY}_${meta.id}`);
  });

  localStorage.removeItem(METADATA_KEY);
}

// 从内容中提取摘要
function extractExcerpt(content: any[]): string {
  let text = "";

  for (const node of content) {
    if (node.type === "paragraph" && node.children) {
      for (const child of node.children) {
        if (typeof child.text === "string") {
          text += child.text + " ";
        }
      }
    } else if (node.type === "heading-one" && node.children) {
      for (const child of node.children) {
        if (typeof child.text === "string") {
          text += child.text + " ";
        }
      }
    } else if (node.type === "heading-two" && node.children) {
      for (const child of node.children) {
        if (typeof child.text === "string") {
          text += child.text + " ";
        }
      }
    }

    if (text.length > 150) break;
  }

  text = text.trim();
  if (text.length > 150) {
    return text.slice(0, 147) + "...";
  }
  return text || "无内容";
}

// 检查存储空间
export function getStorageInfo(): { used: number; available: number } {
  if (typeof window === "undefined") {
    return { used: 0, available: 0 };
  }

  let used = 0;
  let available = 5 * 1024 * 1024; // 假设 5MB 限制

  // 某些浏览器支持 10MB
  if (
    navigator.userAgent.includes("Chrome") ||
    navigator.userAgent.includes("Edge")
  ) {
    available = 10 * 1024 * 1024;
  }

  try {
    for (let key in localStorage) {
      if (key.startsWith(STORAGE_KEY) || key === METADATA_KEY) {
        const value = localStorage.getItem(key);
        if (value) {
          used += new Blob([value]).size;
        }
      }
    }
  } catch (error) {
    console.error("Error calculating storage:", error);
  }

  return { used, available };
}

// 压缩内容（简单实现，移除多余空格等）
function compressContent(content: any[]): any[] {
  return content.map((node) => {
    if (node.type === "paragraph" && node.children) {
      return {
        ...node,
        children: node.children.map((child: any) => {
          if (child.text) {
            return {
              ...child,
              text: child.text.replace(/\s+/g, " ").trim(),
            };
          }
          return child;
        }),
      };
    }
    return node;
  });
}

// 获取存储使用百分比
export function getStorageUsagePercentage(): number {
  const { used, available } = getStorageInfo();
  return Math.round((used / available) * 100);
}

// 检查是否有足够空间
export function hasEnoughSpace(sizeInBytes: number = 100 * 1024): boolean {
  const { used, available } = getStorageInfo();
  return available - used > sizeInBytes;
}

// 删除单个笔记


// 删除多个笔记
export function deleteNotes(ids: string[]): boolean {
  if (typeof window === "undefined") return false;

  try {
    ids.forEach(id => {
      localStorage.removeItem(`${STORAGE_KEY}_${id}`);
    });
    
    const metadata = getAllNotesMetadata();
    const updatedMetadata = metadata.filter(m => !ids.includes(m.id));
    saveMetadata(updatedMetadata);
    
    return true;
  } catch (error) {
    console.error("Error deleting notes:", error);
    return false;
  }
}

// 清空所有笔记
export function deleteAllNotes(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const metadata = getAllNotesMetadata();
    metadata.forEach(m => {
      localStorage.removeItem(`${STORAGE_KEY}_${m.id}`);
    });
    
    localStorage.removeItem(METADATA_KEY);
    return true;
  } catch (error) {
    console.error("Error deleting all notes:", error);
    return false;
  }
}

// 获取笔记数量
export function getNotesCount(): number {
  const metadata = getAllNotesMetadata();
  return metadata.length;
}
