import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// 处理本地图片文件
export async function POST(request: NextRequest) {
  try {
    const { imagePath, action } = await request.json();

    if (!imagePath) {
      return NextResponse.json(
        { error: "请提供图片路径" },
        { status: 400 }
      );
    }

    // 处理不同的动作
    if (action === "convert") {
      // 将本地图片转换为 base64
      try {
        // 移除 file:// 前缀（如果有）
        const cleanPath = imagePath.replace(/^file:\/\//, "");

        // 检查文件是否存在
        const exists = await fs.access(cleanPath).then(() => true).catch(() => false);

        if (!exists) {
          return NextResponse.json(
            { error: "图片文件不存在", path: cleanPath },
            { status: 404 }
          );
        }

        // 读取文件
        const fileBuffer = await fs.readFile(cleanPath);

        // 获取文件扩展名
        const ext = path.extname(cleanPath).toLowerCase().replace(".", "");
        const mimeType = getMimeType(ext);

        // 转换为 base64
        const base64 = fileBuffer.toString("base64");
        const dataUrl = `data:${mimeType};base64,${base64}`;

        return NextResponse.json({
          success: true,
          dataUrl,
          originalPath: imagePath,
          fileName: path.basename(cleanPath),
        });
      } catch (error) {
        console.error("Error converting image:", error);
        return NextResponse.json(
          {
            error: "无法读取图片文件",
            details: error instanceof Error ? error.message : "未知错误",
            path: imagePath
          },
          { status: 500 }
        );
      }
    }

    // 获取图片信息
    if (action === "info") {
      try {
        const cleanPath = imagePath.replace(/^file:\/\//, "");
        const stats = await fs.stat(cleanPath);

        return NextResponse.json({
          success: true,
          info: {
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            path: cleanPath,
            fileName: path.basename(cleanPath),
          },
        });
      } catch (error) {
        return NextResponse.json(
          { error: "无法获取图片信息" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "不支持的操作" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Image API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理图片失败" },
      { status: 500 }
    );
  }
}

// 获取 MIME 类型
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",
  };

  return mimeTypes[ext] || "image/png";
}
