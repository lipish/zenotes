import { Descendant } from "slate";

// 生成唯一的文件名（客户端版本）
function generateUniqueFilename(originalPath: string): string {
  const ext = originalPath.substring(originalPath.lastIndexOf(".")) || ".jpg";
  const randomStr = Math.random().toString(36).substring(7);
  const timestamp = Date.now();
  return `${timestamp}-${randomStr}${ext}`;
}

// 图片处理结果
interface ImageProcessResult {
  originalUrl: string;
  newUrl: string;
  success: boolean;
  error?: string;
}

// Markdown导入选项
export interface MarkdownImportOptions {
  sourceDir?: string;
  imageDir?: string;
  processImages?: boolean;
  baseUrl?: string;
}

export class MarkdownImporter {
  private imageMap: Map<string, string> = new Map();
  private processedImages: ImageProcessResult[] = [];

  constructor(private options: MarkdownImportOptions = {}) {
    this.options = {
      sourceDir: "/Users/xinference/Sync/md",
      imageDir: "public/images",
      processImages: true,
      baseUrl: "/images",
      ...options,
    };
  }

  // 处理单个Markdown文件（需要在服务器端调用）
  async processMarkdownFile(filePath: string): Promise<{
    content: string;
    images: ImageProcessResult[];
  }> {
    throw new Error("processMarkdownFile must be called on server side");
  }

  // 处理Markdown内容中的图片
  async processMarkdownContent(
    content: string,
    sourceDir: string,
  ): Promise<string> {
    if (!this.options.processImages) {
      return content;
    }

    // 匹配所有图片引用
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches = Array.from(content.matchAll(imageRegex));

    let processedContent = content;

    for (const match of matches) {
      const [fullMatch, altText, imagePath] = match;

      try {
        const newImageUrl = await this.processImage(imagePath, sourceDir);
        if (newImageUrl) {
          // 替换原始图片路径为新路径
          const newMarkdown = `![${altText}](${newImageUrl})`;
          processedContent = processedContent.replace(fullMatch, newMarkdown);

          this.processedImages.push({
            originalUrl: imagePath,
            newUrl: newImageUrl,
            success: true,
          });
        }
      } catch (error) {
        console.error(`Failed to process image ${imagePath}:`, error);
        this.processedImages.push({
          originalUrl: imagePath,
          newUrl: imagePath,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return processedContent;
  }

  // 处理单个图片（客户端版本 - 调用API）
  async processImage(
    imagePath: string,
    sourceDir: string,
  ): Promise<string | null> {
    // 如果已经处理过，返回缓存的URL
    if (this.imageMap.has(imagePath)) {
      return this.imageMap.get(imagePath)!;
    }

    // 如果已经是处理后的路径，直接返回
    if (imagePath.startsWith("/images/")) {
      return imagePath;
    }

    // 调用API处理图片
    try {
      const response = await fetch("/api/manage-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl: imagePath }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.newUrl) {
          this.imageMap.set(imagePath, data.newUrl);
          return data.newUrl;
        }
      }
    } catch (error) {
      console.error(`Failed to process image ${imagePath}:`, error);
    }

    return null;
  }

  // 清理已处理的图片映射
  clearCache() {
    this.imageMap.clear();
    this.processedImages = [];
  }

  // 获取处理统计
  getStatistics() {
    return {
      totalProcessed: this.processedImages.length,
      successful: this.processedImages.filter((img) => img.success).length,
      failed: this.processedImages.filter((img) => !img.success).length,
      images: this.processedImages,
    };
  }
}

// 将Markdown转换为Slate格式（增强版）
export function markdownToSlate(markdown: string): Descendant[] {
  const lines = markdown.split("\n");
  const nodes: Descendant[] = [];
  let currentList: any = null;
  let currentListType: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 跳过空行
    if (line.trim() === "") {
      if (currentList) {
        nodes.push(currentList);
        currentList = null;
        currentListType = null;
      }
      nodes.push({
        type: "paragraph",
        children: [{ text: "" }],
      });
      continue;
    }

    // 处理标题
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      if (currentList) {
        nodes.push(currentList);
        currentList = null;
        currentListType = null;
      }

      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const type =
        level === 1
          ? "heading-one"
          : level === 2
            ? "heading-two"
            : "heading-three";

      nodes.push({
        type: type as any,
        children: parseInlineElements(text),
      });
      continue;
    }

    // 处理图片（独立行）
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      if (currentList) {
        nodes.push(currentList);
        currentList = null;
        currentListType = null;
      }

      const alt = imageMatch[1] || "";
      const url = imageMatch[2];
      nodes.push({
        type: "image" as any,
        url,
        alt,
        children: [{ text: "" }],
      });
      continue;
    }

    // 处理其他元素...
    if (currentList) {
      nodes.push(currentList);
      currentList = null;
      currentListType = null;
    }

    nodes.push({
      type: "paragraph",
      children: parseInlineElements(line),
    });
  }

  if (currentList) {
    nodes.push(currentList);
  }

  if (nodes.length === 0) {
    return [
      {
        type: "paragraph",
        children: [{ text: "" }],
      },
    ];
  }

  return nodes;
}

// 解析内联元素
function parseInlineElements(text: string): any[] {
  const elements: any[] = [];
  let currentText = "";
  let i = 0;

  while (i < text.length) {
    // 处理加粗
    if (text.substring(i, i + 2) === "**" && i + 2 < text.length) {
      const endIndex = text.indexOf("**", i + 2);
      if (endIndex !== -1) {
        if (currentText) {
          elements.push({ text: currentText });
          currentText = "";
        }
        const boldText = text.substring(i + 2, endIndex);
        elements.push({ text: boldText, bold: true });
        i = endIndex + 2;
        continue;
      }
    }

    // 处理斜体
    if (text[i] === "*" && i + 1 < text.length) {
      const endIndex = text.indexOf("*", i + 1);
      if (endIndex !== -1) {
        if (currentText) {
          elements.push({ text: currentText });
          currentText = "";
        }
        const italicText = text.substring(i + 1, endIndex);
        elements.push({ text: italicText, italic: true });
        i = endIndex + 1;
        continue;
      }
    }

    // 处理代码
    if (text[i] === "`") {
      const endIndex = text.indexOf("`", i + 1);
      if (endIndex !== -1) {
        if (currentText) {
          elements.push({ text: currentText });
          currentText = "";
        }
        const codeText = text.substring(i + 1, endIndex);
        elements.push({ text: codeText, code: true });
        i = endIndex + 1;
        continue;
      }
    }

    currentText += text[i];
    i++;
  }

  if (currentText) {
    elements.push({ text: currentText });
  }

  if (elements.length === 0) {
    return [{ text: "" }];
  }

  return elements;
}
