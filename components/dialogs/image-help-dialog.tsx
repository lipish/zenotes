"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Image as ImageIcon,
  Upload,
  Link,
  Copy,
  MousePointer,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface ImageHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImageHelpDialog: React.FC<ImageHelpDialogProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            图片使用指南
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            了解如何在笔记中插入和管理图片
          </p>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* 推荐方法 */}
          <div className="space-y-4">
            <h3 className="font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              推荐方法
            </h3>

            <div className="space-y-3">
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <MousePointer className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">拖拽图片</h4>
                    <p className="text-sm text-muted-foreground">
                      直接从文件管理器拖拽图片到编辑器中，图片会自动转换为 Base64 格式保存
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Copy className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">复制粘贴</h4>
                    <p className="text-sm text-muted-foreground">
                      复制图片（截图或从其他应用复制），然后在编辑器中按 Ctrl/Cmd+V 粘贴
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Link className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">使用网络图片</h4>
                    <p className="text-sm text-muted-foreground">
                      使用公开的图片 URL，如：https://example.com/image.png
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* 支持的格式 */}
          <div className="space-y-4">
            <h3 className="font-medium">支持的图片格式</h3>
            <div className="flex flex-wrap gap-2">
              {["PNG", "JPG", "JPEG", "GIF", "WebP", "SVG", "BMP"].map(
                (format) => (
                  <span
                    key={format}
                    className="px-3 py-1 bg-secondary rounded-md text-sm"
                  >
                    .{format.toLowerCase()}
                  </span>
                )
              )}
            </div>
          </div>

          {/* 本地图片问题 */}
          <div className="space-y-4">
            <h3 className="font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              关于本地图片路径
            </h3>

            <Card className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                由于浏览器安全限制，直接使用本地文件路径（如
                /Users/xxx/image.png）的图片可能无法显示。
              </p>
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  解决方案：
                </p>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                  <li>使用拖拽或粘贴方式添加图片（推荐）</li>
                  <li>将图片上传到图床服务，使用生成的URL</li>
                  <li>将图片转换为 Base64 格式</li>
                </ul>
              </div>
            </Card>
          </div>

          {/* 常见问题 */}
          <div className="space-y-4">
            <h3 className="font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              常见问题
            </h3>

            <div className="space-y-3">
              <Card className="p-4">
                <h4 className="font-medium mb-2">图片显示为加载失败？</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>检查图片URL是否正确</li>
                  <li>确认图片格式是否支持</li>
                  <li>如果是本地图片，请使用拖拽方式添加</li>
                </ul>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-2">图片太大无法保存？</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>建议图片大小不超过 2MB</li>
                  <li>可以使用图片压缩工具减小文件大小</li>
                  <li>考虑使用外部图床服务</li>
                </ul>
              </Card>
            </div>
          </div>

          {/* 提示 */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  专业提示
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  为了获得最佳体验，建议使用拖拽或粘贴方式添加图片。这样图片会自动转换为
                  Base64 格式，无需担心图片链接失效问题。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end">
          <Button onClick={onClose}>知道了</Button>
        </div>
      </Card>
    </div>
  );
};
