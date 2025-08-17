"use client";

import React, { useState, useEffect } from "react";
import {
  Image as ImageIcon,
  Download,
  Trash2,
  RefreshCw,
  FolderSync,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getManagedImages,
  processSyncImages,
  ImageManager,
} from "@/lib/image-manager";

interface ManagedImage {
  name: string;
  url: string;
  size: number;
  created: string;
  modified: string;
}

interface ProcessResult {
  originalUrl: string;
  newUrl: string | null;
  success: boolean;
  error?: string;
}

export const ImageGallery: React.FC = () => {
  const [images, setImages] = useState<ManagedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<ProcessResult[]>([]);
  const [showSyncResults, setShowSyncResults] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ManagedImage | null>(null);

  // 加载已管理的图片
  const loadImages = async () => {
    setLoading(true);
    try {
      const data = await getManagedImages();
      setImages(data.images);
    } catch (error) {
      console.error("Failed to load images:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  // 同步本地Sync目录的图片
  const handleSyncImages = async () => {
    setSyncing(true);
    setSyncResults([]);
    setShowSyncResults(false);

    try {
      // 扫描本地目录
      const scanResponse = await fetch("/api/scan-local-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          directory: "/Users/xinference/Sync/md/pics",
        }),
      });

      if (!scanResponse.ok) {
        throw new Error("Failed to scan directory");
      }

      const scanData = await scanResponse.json();
      const localImages = scanData.images || [];

      if (localImages.length === 0) {
        alert("没有在目录中找到图片");
        return;
      }

      // 批量处理图片
      const response = await fetch("/api/manage-images", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images: localImages }),
      });

      const data = await response.json();
      setSyncResults(data.results || []);
      setShowSyncResults(true);

      // 重新加载图片列表
      await loadImages();

      // 显示结果
      alert(
        `同步完成!\n成功: ${data.processed || 0} 个\n失败: ${
          data.failed || 0
        } 个`
      );
    } catch (error) {
      console.error("Failed to sync images:", error);
      alert("同步图片失败: " + (error instanceof Error ? error.message : "未知错误"));
    } finally {
      setSyncing(false);
    }
  };

  // 删除图片
  const handleDeleteImage = async (imageName: string) => {
    if (!confirm(`确定要删除图片 ${imageName} 吗？`)) {
      return;
    }

    try {
      const response = await fetch("/api/manage-images", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageName }),
      });

      if (response.ok) {
        await loadImages();
      } else {
        alert("删除图片失败");
      }
    } catch (error) {
      console.error("Failed to delete image:", error);
      alert("删除图片时出错");
    }
  };

  // 复制图片URL
  const copyImageUrl = (url: string) => {
    // 获取完整URL
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    alert("图片URL已复制到剪贴板");
  };

  // 复制Markdown格式
  const copyMarkdown = (image: ManagedImage) => {
    const markdown = `![${image.name}](${image.url})`;
    navigator.clipboard.writeText(markdown);
    alert("Markdown格式已复制到剪贴板");
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 格式化日期
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("zh-CN");
  };

  return (
    <div className="w-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">图片管理器</h2>
          <span className="text-sm text-muted-foreground">
            ({images.length} 个图片)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSyncImages}
            disabled={syncing}
            variant="outline"
            size="sm"
          >
            <FolderSync
              className={cn("h-4 w-4 mr-2", syncing && "animate-spin")}
            />
            {syncing ? "同步中..." : "同步本地图片"}
          </Button>
          <Button onClick={loadImages} disabled={loading} variant="outline" size="sm">
            <RefreshCw
              className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
            />
            刷新
          </Button>
        </div>
      </div>

      {/* 同步结果对话框 */}
      {showSyncResults && syncResults.length > 0 && (
        <Dialog open={showSyncResults} onOpenChange={setShowSyncResults}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>图片同步结果</DialogTitle>
              <DialogDescription>
                成功: {syncResults.filter((r) => r.success).length} | 失败:{" "}
                {syncResults.filter((r) => !r.success).length}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px] w-full">
              <div className="space-y-2">
                {syncResults.map((result, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded text-sm",
                      result.success
                        ? "bg-green-50 dark:bg-green-900/20"
                        : "bg-red-50 dark:bg-red-900/20"
                    )}
                  >
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs break-all">
                        {result.originalUrl}
                      </p>
                      {result.newUrl && (
                        <p className="text-xs text-muted-foreground mt-1">
                          → {result.newUrl}
                        </p>
                      )}
                      {result.error && (
                        <p className="text-xs text-red-600 mt-1">{result.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* 图片网格 */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">还没有管理的图片</p>
          <Button onClick={handleSyncImages} disabled={syncing}>
            <FolderSync className="h-4 w-4 mr-2" />
            同步本地图片
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((image) => (
            <div
              key={image.name}
              className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* 图片预览 */}
              <div
                className="aspect-square bg-gray-100 dark:bg-gray-800 cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* 图片信息 */}
              <div className="p-2">
                <p className="text-xs font-mono truncate" title={image.name}>
                  {image.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(image.size)}
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col gap-1">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => copyImageUrl(image.url)}
                    title="复制URL"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => copyMarkdown(image)}
                    title="复制Markdown"
                  >
                    <ImageIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => handleDeleteImage(image.name)}
                    title="删除"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 图片详情对话框 */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedImage.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.name}
                  className="max-w-full max-h-[500px] object-contain"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">文件名</p>
                  <p className="font-mono">{selectedImage.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">大小</p>
                  <p>{formatFileSize(selectedImage.size)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">创建时间</p>
                  <p>{formatDate(selectedImage.created)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">修改时间</p>
                  <p>{formatDate(selectedImage.modified)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">URL</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs break-all">
                      {selectedImage.url}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyImageUrl(selectedImage.url)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Markdown</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                      {`![${selectedImage.name}](${selectedImage.url})`}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyMarkdown(selectedImage)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ImageGallery;
