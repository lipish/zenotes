import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

async function scanMarkdownFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  try {
    // 检查目录是否存在
    await fs.access(dirPath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        // 递归扫描子目录
        const subFiles = await scanMarkdownFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.match(/\.(md|markdown)$/i)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Failed to scan directory ${dirPath}:`, error);
  }

  return files;
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

    // 扫描目录获取所有Markdown文件
    const files = await scanMarkdownFiles(directory);

    return NextResponse.json({
      success: true,
      directory,
      files,
      total: files.length,
    });
  } catch (error) {
    console.error("Scan markdown error:", error);
    return NextResponse.json(
      {
        error: "Failed to scan directory",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
