import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Missing image URL parameter" },
        { status: 400 }
      );
    }

    // 验证URL格式
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // 只允许HTTP和HTTPS协议
    if (!["http:", "https:"].includes(url.protocol)) {
      return NextResponse.json(
        { error: "Only HTTP and HTTPS protocols are allowed" },
        { status: 400 }
      );
    }

    // 获取图片
    const response = await fetch(imageUrl, {
      headers: {
        // 添加常见的请求头，避免被某些服务器拒绝
        "User-Agent": "Mozilla/5.0 (compatible; ImageProxy/1.0)",
        "Accept": "image/*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }

    // 获取内容类型
    const contentType = response.headers.get("content-type");

    // 验证是否为图片类型
    if (!contentType || !contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "URL does not point to an image" },
        { status: 400 }
      );
    }

    // 获取图片数据
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 返回图片，设置适当的响应头
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable", // 缓存一年
        "Access-Control-Allow-Origin": "*", // 允许跨域
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);

    // 判断错误类型
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        { error: "Network error or invalid URL" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 处理OPTIONS请求（CORS预检）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
