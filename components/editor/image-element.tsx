"use client";

import React, { useState, useEffect, useRef } from "react";
import { RenderElementProps } from "slate-react";
import {
  Image as ImageIcon,
  AlertCircle,
  Upload,
  Link,
  FileImage,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { processImage } from "@/lib/image-manager";

interface ImageElementProps extends RenderElementProps {
  element: {
    type: "image";
    url: string;
    alt?: string;
    children: any[];
  };
}

export const ImageElement: React.FC<ImageElementProps> = ({
  attributes,
  children,
  element,
}) => {
  const [imageStatus, setImageStatus] = useState<
    "loading" | "loaded" | "error"
  >("loading");
  const [imageSrc, setImageSrc] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 处理不同类型的图片路径
    const processImageUrl = async (url: string) => {
      setImageStatus("loading");

      // 处理已经转换的图片（在public/images目录）
      if (url.startsWith("/images/")) {
        setImageSrc(url);
        setImageStatus("loaded");
        return;
      }

      // 处理 base64 图片
      if (url.startsWith("data:image")) {
        setImageSrc(url);
        setImageStatus("loaded");
        return;
      }

      // 处理 blob URL
      if (url.startsWith("blob:")) {
        setImageSrc(url);
        setImageStatus("loaded");
        return;
      }

      // 处理 HTTP/HTTPS 图片
      if (url.startsWith("http://") || url.startsWith("https://")) {
        // 尝试加载图片
        const img = new Image();
        img.onload = () => {
          setImageSrc(url);
          setImageStatus("loaded");
        };
        img.onerror = () => {
          console.error("Failed to load image:", url);
          // 尝试通过代理加载
          tryProxyLoad(url);
        };
        img.src = url;
        return;
      }

      // 处理本地文件路径 - 自动尝试导入
      if (
        url.startsWith("/") ||
        url.startsWith("file://") ||
        url.match(/^[a-zA-Z]:\\/)
      ) {
        // 尝试自动导入本地图片
        await handleAutoImport(url);
        return;
      }

      // 其他情况
      console.warn("Unsupported image URL format:", url);
      setImageStatus("error");
    };

    // 尝试通过代理加载图片（处理CORS问题）
    const tryProxyLoad = (url: string) => {
      // 如果有CORS问题，可以尝试使用代理
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const img = new Image();
      img.onload = () => {
        setImageSrc(proxyUrl);
        setImageStatus("loaded");
      };
      img.onerror = () => {
        setImageStatus("error");
      };
      img.src = proxyUrl;
    };

    if (element.url) {
      processImageUrl(element.url);
    } else {
      setImageStatus("error");
    }
  }, [element.url]);

  // 自动导入本地图片
  const handleAutoImport = async (localPath: string) => {
    setIsProcessing(true);
    try {
      const result = await processImage(localPath);
      if (result.success && result.newUrl) {
        setImageSrc(result.newUrl);
        setImageStatus("loaded");
        // 可以在这里通知父组件更新element.url
        // updateElementUrl(result.newUrl);
      } else {
        setImageStatus("error");
      }
    } catch (error) {
      console.error("Failed to auto-import image:", error);
      setImageStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  // 手动导入图片
  const handleManualImport = async () => {
    if (!element.url) return;

    setIsProcessing(true);
    try {
      const result = await processImage(element.url);
      if (result.success && result.newUrl) {
        setImageSrc(result.newUrl);
        setImageStatus("loaded");
        // 可以在这里通知父组件更新element.url
        // updateElementUrl(result.newUrl);
      } else {
        alert("导入图片失败: " + (result.error || "未知错误"));
      }
    } catch (error) {
      console.error("Failed to import image:", error);
      alert("导入图片时出错");
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setImageSrc(base64);
        setImageStatus("loaded");
        // 可以在这里调用更新element.url的函数
        // updateElementUrl(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // 检查是否是本地路径
  const isLocalPath = (url: string) => {
    return (
      url.startsWith("/") ||
      url.startsWith("file://") ||
      url.match(/^[a-zA-Z]:\\/)
    );
  };

  return (
    <div {...attributes}>
      <div contentEditable={false} className="relative my-4">
        {(imageStatus === "loading" || isProcessing) && (
          <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">
                {isProcessing ? "正在导入图片..." : "加载图片中..."}
              </span>
            </div>
          </div>
        )}

        {imageStatus === "loaded" && (
          <div className="relative group">
            <img
              src={imageSrc}
              alt={element.alt || ""}
              className={cn(
                "max-w-full h-auto rounded-lg block mx-auto",
                "shadow-md hover:shadow-lg transition-shadow",
              )}
              style={{ maxWidth: "min(100%, 800px)" }}
              onError={() => setImageStatus("error")}
            />
            {/* 图片标题 */}
            {element.alt && (
              <div className="text-center mt-2 text-sm text-muted-foreground italic">
                {element.alt}
              </div>
            )}
          </div>
        )}

        {imageStatus === "error" && (
          <div className="flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="flex flex-col items-center gap-3 max-w-md">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                <AlertCircle className="h-6 w-6" />
                <span className="font-medium">图片无法显示</span>
              </div>

              {/* 显示原始路径信息 */}
              {isLocalPath(element.url) && (
                <div className="w-full">
                  <div className="text-xs text-muted-foreground mb-2">
                    原始路径：
                  </div>
                  <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono break-all">
                    {element.url}
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground text-center space-y-2">
                <p className="text-xs">图片加载失败，您可以：</p>

                {/* 操作按钮 */}
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {/* 如果是本地路径，显示导入按钮 */}
                  {isLocalPath(element.url) && (
                    <button
                      onClick={handleManualImport}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4",
                          isProcessing && "animate-spin",
                        )}
                      />
                      {isProcessing ? "正在导入..." : "导入到项目"}
                    </button>
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    重新上传图片
                  </button>
                </div>

                <div className="text-xs space-y-1 pt-2">
                  <p className="font-medium">支持的方式：</p>
                  <ul className="list-disc list-inside text-left space-y-1">
                    <li>拖拽图片文件到编辑器</li>
                    <li>复制粘贴图片（Ctrl/Cmd+V）</li>
                    <li>使用网络图片URL</li>
                    <li>点击上方按钮上传本地图片</li>
                  </ul>
                </div>
              </div>

              {/* 针对本地路径的特别提示 */}
              {isLocalPath(element.url) && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs w-full">
                  <FileImage className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-600 dark:text-blue-400">
                    <p className="font-medium mb-1">本地文件路径检测</p>
                    <p>
                      点击"导入到项目"按钮将图片复制到项目中，或使用"重新上传图片"选择其他文件。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

// 处理粘贴的图片
export const handlePasteImage = async (
  event: React.ClipboardEvent,
  insertImage: (url: string) => void,
) => {
  const items = event.clipboardData?.items;
  if (!items) return false;

  // 检查是否有图片文件
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      event.preventDefault();
      const file = item.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const url = reader.result as string;
          insertImage(url);
        };
        reader.readAsDataURL(file);
        return true;
      }
    }
  }

  // 检查是否粘贴的是图片URL
  const text = event.clipboardData?.getData("text/plain");
  if (text && isImageUrl(text)) {
    event.preventDefault();
    insertImage(text);
    return true;
  }

  return false;
};

// 处理拖放的图片
export const handleDropImage = async (
  event: React.DragEvent,
  insertImage: (url: string) => void,
) => {
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return false;

  let hasImage = false;
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      hasImage = true;
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        insertImage(url);
      };
      reader.readAsDataURL(file);
    }
  }

  // 检查是否拖放的是图片URL
  if (!hasImage) {
    const text = event.dataTransfer?.getData("text/plain");
    if (text && isImageUrl(text)) {
      insertImage(text);
      return true;
    }
  }

  return hasImage;
};

// 检查是否是图片URL
const isImageUrl = (url: string): boolean => {
  // 检查常见图片扩展名
  if (url.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)$/i)) {
    return true;
  }

  // 检查是否是图片服务的URL（如imgur, cloudinary等）
  if (url.includes("image") || url.includes("img") || url.includes("photo")) {
    return true;
  }

  // 检查data URL
  if (url.startsWith("data:image")) {
    return true;
  }

  return false;
};

// 将File对象转换为base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 从URL下载图片并转换为base64（需要后端支持或CORS）
export const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to convert URL to base64:", error);
    throw error;
  }
};
