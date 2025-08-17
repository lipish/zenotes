"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  createEditor,
  Descendant,
  Editor,
  Transforms,
  Element as SlateElement,
  BaseEditor,
  Node,
} from "slate";
import { Slate, Editable, withReact, ReactEditor, useSlate } from "slate-react";
import { withHistory, HistoryEditor } from "slate-history";
import {
  CodeBracketIcon,
  ListBulletIcon,
  PhotoIcon,
  LinkIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  Bars3BottomRightIcon,
  Bars4Icon,
  ArrowUpTrayIcon,
  ChatBubbleBottomCenterTextIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { BoldIcon, ItalicIcon, UnderlineIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ImageElement,
  handlePasteImage,
  handleDropImage,
} from "./image-element";

// Define custom types
type CustomElement =
  | { type: "paragraph"; align?: string; children: CustomText[] }
  | { type: "heading-one"; children: CustomText[] }
  | { type: "heading-two"; children: CustomText[] }
  | { type: "heading-three"; children: CustomText[] }
  | { type: "block-quote"; children: CustomText[] }
  | { type: "numbered-list"; children: CustomElement[] }
  | { type: "bulleted-list"; children: CustomElement[] }
  | { type: "list-item"; children: CustomText[] }
  | { type: "code-block"; children: CustomText[] }
  | { type: "image"; url: string; alt?: string; children: CustomText[] }
  | { type: "link"; url: string; children: CustomText[] };

type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
};

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

const LIST_TYPES = ["numbered-list", "bulleted-list"];
const TEXT_ALIGN_TYPES = ["left", "center", "right", "justify"];

interface SlateEditorProps {
  initialValue?: Descendant[];
  onChange?: (value: Descendant[]) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const SlateEditor: React.FC<SlateEditorProps> = ({
  initialValue,
  onChange,
  placeholder = "开始输入...",
  readOnly = false,
}) => {
  const defaultValue: Descendant[] = [
    {
      type: "paragraph",
      children: [{ text: "" }],
    },
  ];

  const [value, setValue] = useState<Descendant[]>(
    initialValue && Array.isArray(initialValue) && initialValue.length > 0
      ? initialValue
      : defaultValue,
  );

  // 当 initialValue 改变时更新编辑器内容
  useEffect(() => {
    if (
      initialValue &&
      Array.isArray(initialValue) &&
      initialValue.length > 0
    ) {
      setValue(initialValue);
    } else {
      setValue(defaultValue);
    }
  }, [initialValue]);

  const renderElement = useCallback((props: any) => <Element {...props} />, []);
  const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);

  const editor = useMemo(
    () => withImages(withHistory(withReact(createEditor()))),
    [],
  );

  const handleChange = (newValue: Descendant[]) => {
    setValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className="border rounded-lg max-w-full h-full flex flex-col">
      <Slate
        editor={editor}
        initialValue={value}
        onChange={handleChange}
        key={JSON.stringify(value)}
      >
        {!readOnly && <Toolbar />}
        <Editable
          className="slate-editor max-w-full flex-1 p-4"
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder={placeholder}
          readOnly={readOnly}
          spellCheck
          autoFocus
          onPaste={(event) => {
            // 先检查是否是Markdown内容
            const text = event.clipboardData?.getData("text/plain");
            if (text && text.includes("![") && text.includes("](")) {
              // 解析Markdown中的所有图片
              const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
              let match;
              let hasImage = false;

              while ((match = markdownImageRegex.exec(text)) !== null) {
                const alt = match[1] || "";
                const imageUrl = match[2];
                insertImage(editor, imageUrl, alt);
                hasImage = true;
              }

              if (hasImage) {
                event.preventDefault();
                return;
              }
            }

            handlePasteImage(event, (url) => insertImage(editor, url));
          }}
          onDrop={(event) => {
            event.preventDefault();
            handleDropImage(event, (url) => insertImage(editor, url));
          }}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onKeyDown={(event) => {
            // Handle keyboard shortcuts
            if (!event.ctrlKey && !event.metaKey) return;

            switch (event.key) {
              case "b": {
                event.preventDefault();
                toggleMark(editor, "bold");
                break;
              }
              case "i": {
                event.preventDefault();
                toggleMark(editor, "italic");
                break;
              }
              case "u": {
                event.preventDefault();
                toggleMark(editor, "underline");
                break;
              }
              case "`": {
                event.preventDefault();
                toggleMark(editor, "code");
                break;
              }
            }
          }}
        />
      </Slate>
    </div>
  );
};

const Toolbar = () => {
  const editor = useSlate();

  return (
    <div className="flex flex-wrap gap-1 border-b p-2">
      <MarkButton
        format="bold"
        icon={<BoldIcon className="h-4 w-4" />}
        title="粗体"
      />
      <MarkButton
        format="italic"
        icon={<ItalicIcon className="h-4 w-4" />}
        title="斜体"
      />
      <MarkButton
        format="underline"
        icon={<UnderlineIcon className="h-4 w-4" />}
        title="下划线"
      />
      <MarkButton
        format="code"
        icon={<CodeBracketIcon className="h-4 w-4" />}
        title="代码"
      />

      <div className="w-px h-8 bg-border mx-1" />

      <BlockButton
        format="heading-one"
        icon={<span className="font-bold text-sm">H1</span>}
        title="标题 1"
      />
      <BlockButton
        format="heading-two"
        icon={<span className="font-bold text-sm">H2</span>}
        title="标题 2"
      />
      <BlockButton
        format="heading-three"
        icon={<span className="font-bold text-sm">H3</span>}
        title="标题 3"
      />

      <div className="w-px h-8 bg-border mx-1" />

      <BlockButton
        format="block-quote"
        icon={<ChatBubbleBottomCenterTextIcon className="h-4 w-4" />}
        title="引用"
      />
      <BlockButton
        format="numbered-list"
        icon={<QueueListIcon className="h-4 w-4" />}
        title="有序列表"
      />
      <BlockButton
        format="bulleted-list"
        icon={<ListBulletIcon className="h-4 w-4" />}
        title="无序列表"
      />

      <div className="w-px h-8 bg-border mx-1" />

      <AlignButton
        format="left"
        icon={<Bars3BottomLeftIcon className="h-4 w-4" />}
        title="左对齐"
      />
      <AlignButton
        format="center"
        icon={<Bars3Icon className="h-4 w-4" />}
        title="居中对齐"
      />
      <AlignButton
        format="right"
        icon={<Bars3BottomRightIcon className="h-4 w-4" />}
        title="右对齐"
      />
      <AlignButton
        format="justify"
        icon={<Bars4Icon className="h-4 w-4" />}
        title="两端对齐"
      />

      <div className="w-px h-8 bg-border mx-1" />

      <InsertImageButton />
      <InsertLinkButton />

      {/* 图片提示 */}
      <div className="ml-auto mr-2 text-xs text-muted-foreground hidden sm:flex items-center gap-2">
        <span>支持：拖拽/粘贴/上传图片</span>
        <span className="text-muted-foreground/60">|</span>
        <span>Markdown: ![alt](url)</span>
      </div>
    </div>
  );
};

const MarkButton = ({
  format,
  icon,
  title,
}: {
  format: string;
  icon: React.ReactNode;
  title?: string;
}) => {
  const editor = useSlate();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", isMarkActive(editor, format) && "bg-muted")}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
      title={title}
    >
      {icon}
    </Button>
  );
};

const BlockButton = ({
  format,
  icon,
  title,
}: {
  format: string;
  icon: React.ReactNode;
  title?: string;
}) => {
  const editor = useSlate();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", isBlockActive(editor, format) && "bg-muted")}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
      title={title}
    >
      {icon}
    </Button>
  );
};

const AlignButton = ({
  format,
  icon,
  title,
}: {
  format: string;
  icon: React.ReactNode;
  title?: string;
}) => {
  const editor = useSlate();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", isAlignActive(editor, format) && "bg-muted")}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleAlign(editor, format);
      }}
      title={title}
    >
      {icon}
    </Button>
  );
};

const InsertImageButton = () => {
  const editor = useSlate();

  const handleImageInsert = () => {
    const url = window.prompt(
      "输入图片 URL:\n\n" +
        "支持的格式：\n" +
        "• 网络图片：https://example.com/image.png\n" +
        "• Markdown语法：![alt text](image.png)\n" +
        "• 或直接拖拽/粘贴图片到编辑器\n\n" +
        "注意：本地文件请通过拖拽或粘贴方式添加",
    );
    if (!url) return;

    // 检查是否是Markdown图片语法
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
    const match = url.match(markdownImageRegex);

    if (match) {
      const alt = match[1] || "";
      const imageUrl = match[2];
      insertImage(editor, imageUrl, alt);
    } else {
      insertImage(editor, url);
    }
  };

  const handleFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        for (const file of files) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            insertImage(editor, dataUrl, file.name);
          };
          reader.readAsDataURL(file);
        }
      }
    };

    input.click();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onMouseDown={(event) => {
          event.preventDefault();
          handleImageInsert();
        }}
        title="插入图片URL"
      >
        <PhotoIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onMouseDown={(event) => {
          event.preventDefault();
          handleFileUpload();
        }}
        title="上传本地图片"
      >
        <ArrowUpTrayIcon className="h-4 w-4" />
      </Button>
    </>
  );
};

const InsertLinkButton = () => {
  const editor = useSlate();

  const handleLinkInsert = () => {
    const url = window.prompt("输入链接 URL:");
    if (!url) return;

    insertLink(editor, url);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onMouseDown={(event) => {
        event.preventDefault();
        handleLinkInsert();
      }}
    >
      <LinkIcon className="h-4 w-4" />
    </Button>
  );
};

const Element = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align };

  switch (element.type) {
    case "block-quote":
      return (
        <blockquote style={style} {...attributes}>
          {children}
        </blockquote>
      );
    case "bulleted-list":
      return (
        <ul style={style} {...attributes}>
          {children}
        </ul>
      );
    case "heading-one":
      return (
        <h1 style={style} {...attributes}>
          {children}
        </h1>
      );
    case "heading-two":
      return (
        <h2 style={style} {...attributes}>
          {children}
        </h2>
      );
    case "heading-three":
      return (
        <h3 style={style} {...attributes}>
          {children}
        </h3>
      );
    case "list-item":
      return (
        <li style={style} {...attributes}>
          {children}
        </li>
      );
    case "numbered-list":
      return (
        <ol style={style} {...attributes}>
          {children}
        </ol>
      );
    case "code-block":
      return (
        <pre {...attributes}>
          <code>{children}</code>
        </pre>
      );
    case "image":
      return (
        <ImageElement
          attributes={attributes}
          children={children}
          element={element}
        />
      );
    case "link":
      return (
        <a
          {...attributes}
          href={element.url}
          className="text-blue-600 underline"
        >
          {children}
        </a>
      );
    default:
      return (
        <p style={style} {...attributes}>
          {children}
        </p>
      );
  }
};

const Leaf = ({ attributes, children, leaf }: any) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
};

// Helper functions
const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor) as any;
  return marks ? marks[format] === true : false;
};

const toggleMark = (editor: Editor, format: string) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isBlockActive = (editor: Editor, format: string, blockType = "type") => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (n as any)[blockType] === format,
    }),
  );

  return !!match;
};

const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes((n as any).type),
    split: true,
  });

  const newProperties: Partial<SlateElement> = {
    type: isActive ? "paragraph" : isList ? "list-item" : (format as any),
  };

  Transforms.setNodes<SlateElement>(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] } as any;
    Transforms.wrapNodes(editor, block);
  }
};

const isAlignActive = (editor: Editor, format: string) => {
  const [match] = Array.from(
    Editor.nodes(editor, {
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (n as any).align === format,
    }),
  );

  return !!match;
};

const toggleAlign = (editor: Editor, format: string) => {
  const isActive = isAlignActive(editor, format);

  Transforms.setNodes(editor, { align: isActive ? undefined : format } as any, {
    match: (n) => Editor.isBlock(editor, n as SlateElement),
  });
};

const withImages = (editor: Editor) => {
  const { insertData, isVoid } = editor;

  editor.isVoid = (element) => {
    return (element as any).type === "image" ? true : isVoid(element);
  };

  editor.insertData = (data) => {
    const text = data.getData("text/plain");
    const { files } = data;

    if (files && files.length > 0) {
      for (const file of files) {
        const reader = new FileReader();
        const [mime] = file.type.split("/");

        if (mime === "image") {
          reader.addEventListener("load", () => {
            const url = reader.result as string;
            insertImage(editor, url);
          });

          reader.readAsDataURL(file);
        }
      }
    } else {
      // 检查是否是Markdown图片语法或图片URL
      const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
      const markdownMatch = text?.match(markdownImageRegex);

      if (markdownMatch) {
        const alt = markdownMatch[1] || "";
        const imageUrl = markdownMatch[2];
        insertImage(editor, imageUrl, alt);
      } else if (
        text &&
        (text.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)$/i) ||
          (text.startsWith("http") && text.includes("image")))
      ) {
        insertImage(editor, text);
      } else {
        insertData(data);
      }
    }
  };

  return editor;
};

const insertImage = (editor: Editor, url: string, alt: string = "") => {
  const text = { text: "" };
  const image = { type: "image", url, alt, children: [text] } as any;
  Transforms.insertNodes(editor, image);
  Transforms.insertNodes(editor, {
    type: "paragraph",
    children: [{ text: "" }],
  } as any);
};

const insertLink = (editor: Editor, url: string) => {
  if (editor.selection) {
    const link = { type: "link", url, children: [{ text: url }] } as any;
    Transforms.wrapNodes(editor, link, { split: true });
    Transforms.collapse(editor, { edge: "end" });
  }
};

export default SlateEditor;
