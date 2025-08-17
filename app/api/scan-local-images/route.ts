import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// 支持的图片格式
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico",
];

// 递归扫描目录获取所有图片文件
async function scanDirectory(dirPath: string): Promise<string[]> {
  const images: string[] = [];

  try {
    // 检查目录是否存在
    await fs.access(dirPath);

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // 递归扫描子目录
        const subImages = await scanDirectory(fullPath);
        images.push(...subImages);
      } else if (entry.isFile()) {
        // 检查文件扩展名
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          images.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to scan directory ${dirPath}:`, error);
  }

  return images;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { directory } = body;

    if (!directory) {
      return NextResponse.json(
        { error: "Missing directory parameter" },
        { status: 400 }
      );
    }

    // 安全检查：确保路径是绝对路径
    const absolutePath = path.resolve(directory);

    // 扫描目录
    const images = await scanDirectory(absolutePath);

    // 返回找到的图片路径
    return NextResponse.json({
      success: true,
      directory: absolutePath,
      images,
      total: images.length,
    });
  } catch (error) {
    console.error("Scan directory error:", error);
    return NextResponse.json(
      {
        error: "Failed to scan directory",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// GET: 扫描默认的Sync目录
export async function GET(request: NextRequest) {
  try {
    const defaultPaths = [
      "/Users/xinference/Sync/md/pics",
      "/Users/xinference/Sync/md",
      path.join(process.cwd(), "public", "images"),
    ];

    const results = [];

    for (const dirPath of defaultPaths) {
      try {
        await fs.access(dirPath);
        const images = await scanDirectory(dirPath);
        results.push({
          directory: dirPath,
          images,
          total: images.length,
          exists: true,
        });
      } catch {
        results.push({
          directory: dirPath,
          images: [],
          total: 0,
          exists: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      totalImages: results.reduce((sum, r) => sum + r.total, 0),
    });
  } catch (error) {
    console.error("Scan default directories error:", error);
    return NextResponse.json(
      { error: "Failed to scan default directories" },
      { status: 500 }
    );
  }
}
