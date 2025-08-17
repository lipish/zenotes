import { Descendant } from "slate";

// Markdown 到 Slate 格式转换
export function markdownToSlate(markdown: string): Descendant[] {
  const lines = markdown.split("\n");
  const nodes: Descendant[] = [];
  let currentList: any = null;
  let currentListType: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 跳过空行
    if (line.trim() === "") {
      // 如果在列表中，结束列表
      if (currentList) {
        nodes.push(currentList);
        currentList = null;
        currentListType = null;
      }
      // 添加空段落
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

    // 处理引用块
    if (line.startsWith("> ")) {
      if (currentList) {
        nodes.push(currentList);
        currentList = null;
        currentListType = null;
      }

      nodes.push({
        type: "block-quote",
        children: parseInlineElements(line.substring(2)),
      });
      continue;
    }

    // 处理代码块
    if (line.startsWith("```")) {
      if (currentList) {
        nodes.push(currentList);
        currentList = null;
        currentListType = null;
      }

      const codeLines: string[] = [];
      i++; // 跳过开始的```
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push({
        type: "code-block",
        children: [{ text: codeLines.join("\n") }],
      });
      continue;
    }

    // 处理有序列表
    const orderedListMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedListMatch) {
      const text = orderedListMatch[1];
      const listItem = {
        type: "list-item" as const,
        children: parseInlineElements(text),
      };

      if (currentListType === "numbered-list") {
        currentList.children.push(listItem);
      } else {
        if (currentList) {
          nodes.push(currentList);
        }
        currentList = {
          type: "numbered-list",
          children: [listItem],
        };
        currentListType = "numbered-list";
      }
      continue;
    }

    // 处理无序列表
    const unorderedListMatch = line.match(/^[-*+]\s+(.*)$/);
    if (unorderedListMatch) {
      const text = unorderedListMatch[1];
      const listItem = {
        type: "list-item" as const,
        children: parseInlineElements(text),
      };

      if (currentListType === "bulleted-list") {
        currentList.children.push(listItem);
      } else {
        if (currentList) {
          nodes.push(currentList);
        }
        currentList = {
          type: "bulleted-list",
          children: [listItem],
        };
        currentListType = "bulleted-list";
      }
      continue;
    }

    // 处理图片
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

    // 处理普通段落
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

  // 处理最后的列表
  if (currentList) {
    nodes.push(currentList);
  }

  // 如果没有内容，返回默认段落
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

// 解析内联元素（加粗、斜体、代码、链接等）
function parseInlineElements(text: string): any[] {
  const elements: any[] = [];
  let currentText = "";
  let i = 0;

  while (i < text.length) {
    // 处理图片
    if (text.substring(i).startsWith("![")) {
      if (currentText) {
        elements.push({ text: currentText });
        currentText = "";
      }

      const imageMatch = text.substring(i).match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (imageMatch) {
        const alt = imageMatch[1] || "";
        const url = imageMatch[2];
        // 在段落中的图片需要特殊处理
        elements.push({ text: `[图片: ${alt || url}]` });
        i += imageMatch[0].length;
        continue;
      }
    }

    // 处理链接
    if (text[i] === "[" && !text.substring(i - 1, i + 1).includes("![")) {
      if (currentText) {
        elements.push({ text: currentText });
        currentText = "";
      }

      const linkMatch = text.substring(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        const url = linkMatch[2];
        // 解析链接文本中的格式
        const linkChildren = parseInlineFormats(linkText);
        elements.push({
          type: "link",
          url,
          children: linkChildren,
        });
        i += linkMatch[0].length;
        continue;
      }
    }

    // 处理加粗 **text** 或 __text__
    if (
      (text.substring(i, i + 2) === "**" ||
        text.substring(i, i + 2) === "__") &&
      i + 2 < text.length
    ) {
      const delimiter = text.substring(i, i + 2);
      const endIndex = text.indexOf(delimiter, i + 2);
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

    // 处理斜体 *text* 或 _text_
    if (
      (text[i] === "*" || text[i] === "_") &&
      i + 1 < text.length &&
      text[i + 1] !== text[i]
    ) {
      const delimiter = text[i];
      const endIndex = text.indexOf(delimiter, i + 1);
      if (endIndex !== -1 && text[endIndex - 1] !== "\\") {
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

    // 处理行内代码 `code`
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

    // 处理下划线 ~~text~~
    if (text.substring(i, i + 2) === "~~" && i + 2 < text.length) {
      const endIndex = text.indexOf("~~", i + 2);
      if (endIndex !== -1) {
        if (currentText) {
          elements.push({ text: currentText });
          currentText = "";
        }
        const underlineText = text.substring(i + 2, endIndex);
        elements.push({ text: underlineText, underline: true });
        i = endIndex + 2;
        continue;
      }
    }

    // 普通字符
    currentText += text[i];
    i++;
  }

  // 添加剩余文本
  if (currentText) {
    elements.push({ text: currentText });
  }

  // 如果没有元素，返回空文本
  if (elements.length === 0) {
    return [{ text: "" }];
  }

  return elements;
}

// 解析纯格式（用于链接文本等）
function parseInlineFormats(text: string): any[] {
  const elements: any[] = [];
  let currentText = "";
  let i = 0;

  while (i < text.length) {
    // 处理加粗
    if (
      (text.substring(i, i + 2) === "**" ||
        text.substring(i, i + 2) === "__") &&
      i + 2 < text.length
    ) {
      const delimiter = text.substring(i, i + 2);
      const endIndex = text.indexOf(delimiter, i + 2);
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
    if (
      (text[i] === "*" || text[i] === "_") &&
      i + 1 < text.length &&
      text[i + 1] !== text[i]
    ) {
      const delimiter = text[i];
      const endIndex = text.indexOf(delimiter, i + 1);
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

    // 处理行内代码
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
    return [{ text }];
  }

  return elements;
}

// Slate 到 Markdown 格式转换
export function slateToMarkdown(nodes: Descendant[]): string {
  let markdown = "";

  for (const node of nodes) {
    if ("type" in node) {
      switch (node.type) {
        case "heading-one":
          markdown += `# ${getNodeText(node)}\n\n`;
          break;
        case "heading-two":
          markdown += `## ${getNodeText(node)}\n\n`;
          break;
        case "heading-three":
          markdown += `### ${getNodeText(node)}\n\n`;
          break;
        case "block-quote":
          markdown += `> ${getNodeText(node)}\n\n`;
          break;
        case "code-block":
          markdown += `\`\`\`\n${getNodeText(node)}\n\`\`\`\n\n`;
          break;
        case "numbered-list":
          node.children.forEach((item: any, index: number) => {
            markdown += `${index + 1}. ${getNodeText(item)}\n`;
          });
          markdown += "\n";
          break;
        case "bulleted-list":
          node.children.forEach((item: any) => {
            markdown += `- ${getNodeText(item)}\n`;
          });
          markdown += "\n";
          break;
        case "image":
          markdown += `![${(node as any).alt || ""}](${(node as any).url})\n\n`;
          break;
        case "paragraph":
        default:
          const text = getNodeText(node);
          if (text) {
            markdown += `${text}\n\n`;
          }
          break;
      }
    }
  }

  return markdown.trim();
}

// 获取节点文本
function getNodeText(node: any): string {
  if ("text" in node) {
    let text = node.text;
    if (node.bold) text = `**${text}**`;
    if (node.italic) text = `*${text}*`;
    if (node.underline) text = `~~${text}~~`;
    if (node.code) text = `\`${text}\``;
    return text;
  }

  if (node.children) {
    return node.children.map((child: any) => getNodeText(child)).join("");
  }

  return "";
}

// 检测是否包含Markdown格式
export function detectMarkdown(text: string): boolean {
  // 检查常见的Markdown标记
  const markdownPatterns = [
    /^#{1,6}\s+/m, // 标题
    /^\s*[-*+]\s+/m, // 无序列表
    /^\s*\d+\.\s+/m, // 有序列表
    /^>/m, // 引用
    /```/, // 代码块
    /\*\*[^*]+\*\*/, // 加粗
    /\*[^*]+\*/, // 斜体
    /\[[^\]]+\]\([^)]+\)/, // 链接
    /!\[[^\]]*\]\([^)]+\)/, // 图片
    /`[^`]+`/, // 行内代码
  ];

  return markdownPatterns.some((pattern) => pattern.test(text));
}

// 处理粘贴的Markdown内容
export function processMarkdownPaste(text: string): Descendant[] | null {
  if (!detectMarkdown(text)) {
    return null;
  }

  try {
    return markdownToSlate(text);
  } catch (error) {
    console.error("Failed to parse markdown:", error);
    return null;
  }
}
