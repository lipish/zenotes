import { Note, NoteMetadata } from "@/types/note";

const STORAGE_KEY = "mynotes_data";
const METADATA_KEY = "mynotes_metadata";

/**
 * 清理存储空间，删除最旧的笔记
 * @param targetFreeSpace 目标释放空间（字节）
 * @returns 删除的笔记数量
 */
export function cleanupStorage(targetFreeSpace: number = 500 * 1024): number {
  console.log(`Attempting to free up ${(targetFreeSpace / 1024).toFixed(2)}KB of space...`);

  // 获取所有笔记元数据
  const metadataStr = localStorage.getItem(METADATA_KEY);
  if (!metadataStr) return 0;

  const metadata: any[] = JSON.parse(metadataStr);

  // 按更新时间排序（最旧的在前）
  metadata.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

  let freedSpace = 0;
  let deletedCount = 0;
  const keepMetadata: any[] = [];

  // 删除旧笔记直到释放足够空间
  for (const note of metadata) {
    const noteKey = `${STORAGE_KEY}_${note.id}`;
    const noteData = localStorage.getItem(noteKey);

    if (noteData && freedSpace < targetFreeSpace) {
      // 计算这个笔记占用的空间
      const noteSize = new Blob([noteData]).size;

      // 删除笔记
      localStorage.removeItem(noteKey);
      freedSpace += noteSize;
      deletedCount++;

      console.log(`Deleted note: ${note.title} (freed ${(noteSize / 1024).toFixed(2)}KB)`);
    } else {
      // 保留这个笔记的元数据
      keepMetadata.push(note);
    }
  }

  // 更新元数据
  if (deletedCount > 0) {
    localStorage.setItem(METADATA_KEY, JSON.stringify(keepMetadata));
    console.log(`Cleanup complete: deleted ${deletedCount} notes, freed ${(freedSpace / 1024).toFixed(2)}KB`);
  }

  return deletedCount;
}

/**
 * 获取存储空间使用详情
 */
export function getStorageDetails(): {
  totalNotes: number;
  totalSize: number;
  largestNotes: Array<{ id: string; title: string; size: number }>;
  availableSpace: number;
  usedPercentage: number;
} {
  const metadataStr = localStorage.getItem(METADATA_KEY);
  if (!metadataStr) {
    return {
      totalNotes: 0,
      totalSize: 0,
      largestNotes: [],
      availableSpace: 5 * 1024 * 1024,
      usedPercentage: 0,
    };
  }

  const metadata: any[] = JSON.parse(metadataStr);
  const noteSizes: Array<{ id: string; title: string; size: number }> = [];
  let totalSize = 0;

  // 计算每个笔记的大小
  for (const note of metadata) {
    const noteKey = `${STORAGE_KEY}_${note.id}`;
    const noteData = localStorage.getItem(noteKey);

    if (noteData) {
      const size = new Blob([noteData]).size;
      totalSize += size;
      noteSizes.push({
        id: note.id,
        title: note.title,
        size: size,
      });
    }
  }

  // 计算元数据大小
  totalSize += new Blob([metadataStr]).size;

  // 按大小排序，找出最大的笔记
  noteSizes.sort((a, b) => b.size - a.size);
  const largestNotes = noteSizes.slice(0, 5);

  // 估算可用空间（Chrome/Edge 通常是 10MB，其他浏览器是 5MB）
  const isChromium = navigator.userAgent.includes("Chrome") || navigator.userAgent.includes("Edge");
  const totalAvailable = isChromium ? 10 * 1024 * 1024 : 5 * 1024 * 1024;

  return {
    totalNotes: metadata.length,
    totalSize: totalSize,
    largestNotes: largestNotes,
    availableSpace: totalAvailable - totalSize,
    usedPercentage: Math.round((totalSize / totalAvailable) * 100),
  };
}

/**
 * 压缩笔记内容
 */
export function compressNoteContent(content: any[]): any[] {
  return content.map((node) => {
    if (node.type === "paragraph" && node.children) {
      return {
        ...node,
        children: node.children.map((child: any) => {
          if (child.text && typeof child.text === "string") {
            // 移除多余空格和换行
            const compressedText = child.text
              .replace(/\s+/g, " ")
              .replace(/\n+/g, "\n")
              .trim();

            return {
              ...child,
              text: compressedText,
            };
          }
          return child;
        }),
      };
    }

    // 递归处理嵌套结构
    if (node.children && Array.isArray(node.children)) {
      return {
        ...node,
        children: compressNoteContent(node.children),
      };
    }

    return node;
  });
}

/**
 * 估算笔记大小
 */
export function estimateNoteSize(note: Omit<Note, "id">): number {
  const testNote = {
    ...note,
    id: "test",
    createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
    updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt,
  };

  return new Blob([JSON.stringify(testNote)]).size;
}

/**
 * 检查是否有足够空间保存笔记
 */
export function canSaveNote(note: Omit<Note, "id">): boolean {
  const estimatedSize = estimateNoteSize(note);
  const { availableSpace } = getStorageDetails();

  // 保留 100KB 缓冲空间
  return estimatedSize < availableSpace - 100 * 1024;
}

/**
 * 智能清理：删除最旧且最大的笔记
 */
export function smartCleanup(requiredSpace: number): boolean {
  const details = getStorageDetails();

  if (details.availableSpace >= requiredSpace) {
    return true; // 已有足够空间
  }

  const metadataStr = localStorage.getItem(METADATA_KEY);
  if (!metadataStr) return false;

  const metadata: any[] = JSON.parse(metadataStr);

  // 创建笔记评分（越高越应该删除）
  const noteScores = metadata.map((note) => {
    const noteKey = `${STORAGE_KEY}_${note.id}`;
    const noteData = localStorage.getItem(noteKey);
    const size = noteData ? new Blob([noteData]).size : 0;

    // 计算年龄（天数）
    const age = (Date.now() - new Date(note.updatedAt).getTime()) / (1000 * 60 * 60 * 24);

    // 评分公式：大小（KB） * 年龄（天） / 100
    const score = (size / 1024) * (age / 100);

    return {
      id: note.id,
      title: note.title,
      size: size,
      age: age,
      score: score,
    };
  });

  // 按评分排序（高分优先删除）
  noteScores.sort((a, b) => b.score - a.score);

  let freedSpace = 0;
  const toDelete: string[] = [];

  // 删除直到有足够空间
  for (const noteInfo of noteScores) {
    if (freedSpace >= requiredSpace - details.availableSpace) {
      break;
    }

    toDelete.push(noteInfo.id);
    freedSpace += noteInfo.size;

    console.log(
      `Marked for deletion: ${noteInfo.title} (${(noteInfo.size / 1024).toFixed(2)}KB, ${noteInfo.age.toFixed(0)} days old)`
    );
  }

  // 执行删除
  if (toDelete.length > 0) {
    const keepMetadata = metadata.filter((note) => !toDelete.includes(note.id));

    for (const id of toDelete) {
      localStorage.removeItem(`${STORAGE_KEY}_${id}`);
    }

    localStorage.setItem(METADATA_KEY, JSON.stringify(keepMetadata));

    console.log(`Smart cleanup: deleted ${toDelete.length} notes, freed ${(freedSpace / 1024).toFixed(2)}KB`);
    return true;
  }

  return false;
}

/**
 * 导出笔记到文件（用于备份）
 */
export async function exportNotesToFile(notes: Note[]): Promise<Blob> {
  const exportData = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    notes: notes,
  };

  return new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
}

/**
 * 清理损坏的数据
 */
export function cleanupCorruptedData(): number {
  let cleanedCount = 0;

  // 检查元数据
  const metadataStr = localStorage.getItem(METADATA_KEY);
  if (!metadataStr) return 0;

  try {
    const metadata: any[] = JSON.parse(metadataStr);
    const validMetadata: any[] = [];

    for (const note of metadata) {
      const noteKey = `${STORAGE_KEY}_${note.id}`;
      const noteData = localStorage.getItem(noteKey);

      if (noteData) {
        try {
          JSON.parse(noteData); // 验证数据是否有效
          validMetadata.push(note);
        } catch {
          // 删除损坏的笔记
          localStorage.removeItem(noteKey);
          cleanedCount++;
          console.log(`Removed corrupted note: ${note.title}`);
        }
      } else {
        // 元数据存在但笔记不存在
        cleanedCount++;
        console.log(`Removed orphaned metadata: ${note.title}`);
      }
    }

    // 更新元数据
    if (cleanedCount > 0) {
      localStorage.setItem(METADATA_KEY, JSON.stringify(validMetadata));
    }
  } catch (error) {
    console.error("Failed to cleanup corrupted data:", error);
  }

  return cleanedCount;
}

/**
 * 获取存储统计信息
 */
export function getStorageStats() {
  const details = getStorageDetails();

  return {
    totalNotes: details.totalNotes,
    totalSizeMB: (details.totalSize / 1024 / 1024).toFixed(2),
    availableSpaceMB: (details.availableSpace / 1024 / 1024).toFixed(2),
    usedPercentage: details.usedPercentage,
    averageNoteSizeKB: details.totalNotes > 0
      ? ((details.totalSize / details.totalNotes) / 1024).toFixed(2)
      : "0",
    largestNotes: details.largestNotes.map(note => ({
      ...note,
      sizeKB: (note.size / 1024).toFixed(2),
    })),
  };
}
