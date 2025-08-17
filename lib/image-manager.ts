import { Descendant } from "slate";

interface ImageInfo {
  originalUrl: string;
  newUrl?: string;
  type: "local" | "web" | "base64";
  alt?: string;
}

interface ProcessResult {
  originalUrl: string;
  newUrl: string | null;
  success: boolean;
  error?: string;
}

export class ImageManager {
  // 检测图片URL类型
  static detectImageType(url: string): "local" | "web" | "base64" | "relative" {
    if (url.startsWith("data:image")) {
      return "base64";
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return "web";
    }
    if (url.startsWith("/images/")) {
      return "relative"; // 已经是相对路径，不需要处理
    }
    if (url.startsWith("/") || url.startsWith("file://") || /^[a-zA-Z]:[\\/]/.test(url)) {
      return "local";
    }
    return "web"; // 默认作为web处理
  }

  // 从Slate节点中提取所有图片
  static extractImagesFromSlate(nodes: Descendant[]): ImageInfo[] {
    const images: ImageInfo[] = [];

    const traverse = (node: any) => {
      if (node.type === "image" && node.url) {
        const type = this.detectImageType(node.url);
        if (type !== "relative") {
          images.push({
            originalUrl: node.url,
            type: type as "local" | "web" | "base64",
            alt: node.alt,
          });
        }
      }

      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any) => traverse(child));
      }
    };

    nodes.forEach((node) => traverse(node));
    return images;
  }

  // 从Markdown文本中提取所有图片
  static extractImagesFromMarkdown(markdown: string): ImageInfo[] {
    const images: ImageInfo[] = [];
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = imageRegex.exec(markdown)) !== null) {
      const alt = match[1];
      const url = match[2];
      const type = this.detectImageType(url);

      if (type !== "relative") {
        images.push({
          originalUrl: url,
          type: type as "local" | "web" | "base64",
          alt,
        });
      }
    }

    return images;
  }

  // 处理单个图片
  static async processImage(imageUrl: string): Promise<ProcessResult> {
    try {
      const response = await fetch("/api/manage-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          originalUrl: imageUrl,
          newUrl: null,
          success: false,
          error: data.error || "Failed to process image",
        };
      }

      return {
        originalUrl: imageUrl,
        newUrl: data.newUrl,
        success: true,
      };
    } catch (error) {
      console.error("Failed to process image:", error);
      return {
        originalUrl: imageUrl,
        newUrl: null,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // 批量处理图片
  static async processBatchImages(imageUrls: string[]): Promise<ProcessResult[]> {
    try {
      const response = await fetch("/api/manage-images", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images: imageUrls }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process images");
      }

      return data.results;
    } catch (error) {
      console.error("Failed to process batch images:", error);
      // 返回失败结果
      return imageUrls.map((url) => ({
        originalUrl: url,
        newUrl: null,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }

  // 更新Slate节点中的图片URL
  static updateSlateImages(
    nodes: Descendant[],
    urlMap: Map<string, string>
  ): Descendant[] {
    const updateNode = (node: any): any => {
      if (node.type === "image" && node.url && urlMap.has(node.url)) {
        return {
          ...node,
          url: urlMap.get(node.url),
        };
      }

      if (node.children && Array.isArray(node.children)) {
        return {
          ...node,
          children: node.children.map((child: any) => updateNode(child)),
        };
      }

      return node;
    };

    return nodes.map((node) => updateNode(node));
  }

  // 更新Markdown中的图片URL
  static updateMarkdownImages(
    markdown: string,
    urlMap: Map<string, string>
  ): string {
    let updatedMarkdown = markdown;

    urlMap.forEach((newUrl, originalUrl) => {
      // 转义特殊字符
      const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // 替换Markdown中的图片URL
      const regex = new RegExp(`(!\\[[^\\]]*\\]\\()${escapedUrl}(\\))`, "g");
      updatedMarkdown = updatedMarkdown.replace(regex, `$1${newUrl}$2`);
    });

    return updatedMarkdown;
  }

  // 处理并更新所有图片
  static async processAndUpdateImages(
    content: string | Descendant[],
    isMarkdown: boolean = false
  ): Promise<{
    content: string | Descendant[];
    processedCount: number;
    failedCount: number;
    results: ProcessResult[];
  }> {
    // 提取图片
    const images = isMarkdown
      ? this.extractImagesFromMarkdown(content as string)
      : this.extractImagesFromSlate(content as Descendant[]);

    if (images.length === 0) {
      return {
        content,
        processedCount: 0,
        failedCount: 0,
        results: [],
      };
    }

    // 处理图片
    const imageUrls = images.map((img) => img.originalUrl);
    const results = await this.processBatchImages(imageUrls);

    // 创建URL映射
    const urlMap = new Map<string, string>();
    results.forEach((result) => {
      if (result.success && result.newUrl) {
        urlMap.set(result.originalUrl, result.newUrl);
      }
    });

    // 更新内容
    const updatedContent = isMarkdown
      ? this.updateMarkdownImages(content as string, urlMap)
      : this.updateSlateImages(content as Descendant[], urlMap);

    return {
      content: updatedContent,
      processedCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      results,
    };
  }

  // 获取所有已管理的图片
  static async getManagedImages(): Promise<{
    images: Array<{
      name: string;
      url: string;
      size: number;
      created: string;
      modified: string;
    }>;
    total: number;
  }> {
    try {
      const response = await fetch("/api/manage-images");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get images");
      }

      return data;
    } catch (error) {
      console.error("Failed to get managed images:", error);
      return {
        images: [],
        total: 0,
      };
    }
  }

  // 删除图片
  static async deleteImage(imageName: string): Promise<boolean> {
    try {
      const response = await fetch("/api/manage-images", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageName }),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to delete image:", error);
      return false;
    }
  }

  // 处理本地Sync目录的图片
  static async processSyncImages(syncPath: string = "/Users/xinference/Sync/md/pics"): Promise<{
    processedCount: number;
    failedCount: number;
    results: ProcessResult[];
  }> {
    // 获取目录中的所有图片文件
    // 注意：这需要后端API支持扫描目录
    try {
      const response = await fetch("/api/scan-local-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ directory: syncPath }),
      });

      if (!response.ok) {
        throw new Error("Failed to scan local images");
      }

      const { images } = await response.json();

      if (!images || images.length === 0) {
        return {
          processedCount: 0,
          failedCount: 0,
          results: [],
        };
      }

      // 批量处理找到的图片
      const results = await this.processBatchImages(images);

      return {
        processedCount: results.filter((r) => r.success).length,
        failedCount: results.filter((r) => !r.success).length,
        results,
      };
    } catch (error) {
      console.error("Failed to process sync images:", error);
      return {
        processedCount: 0,
        failedCount: 0,
        results: [],
      };
    }
  }
}

// 导出便捷函数
export const processImage = ImageManager.processImage;
export const processBatchImages = ImageManager.processBatchImages;
export const processAndUpdateImages = ImageManager.processAndUpdateImages;
export const getManagedImages = ImageManager.getManagedImages;
export const processSyncImages = ImageManager.processSyncImages;
