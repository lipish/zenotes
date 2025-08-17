# MyNotes - 个人笔记应用

一个功能强大的个人笔记管理应用，支持实时 Markdown 编辑、图片插入和批量导入功能。

## 功能特点

- 📝 **实时 Markdown 编辑器** - 基于 Slate.js 构建的富文本编辑器
- 🖼️ **图片支持** - 支持插入和显示图片
- 📂 **批量导入** - 从本地目录批量导入 Markdown 文件
- 🏷️ **标签和分类** - 组织和管理笔记
- 🔍 **搜索功能** - 快速查找笔记
- 💾 **自动保存** - 编辑时自动保存，防止数据丢失
- 📤 **导出功能** - 将笔记导出为 Markdown 文件
- 🎨 **现代 UI** - 使用 shadcn/ui 组件库构建的美观界面

## 技术栈

- **Next.js 15** - React 框架
- **TypeScript** - 类型安全
- **Slate.js** - 富文本编辑器
- **Tailwind CSS** - 样式框架
- **shadcn/ui** - UI 组件库
- **LocalStorage** - 本地数据存储

## 安装和运行

### 前置要求

- Node.js 18+ 
- npm 或 yarn

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/yourusername/mynotes.git
cd mynotes
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 在浏览器中访问 http://localhost:3000

## 使用指南

### 创建笔记

1. 点击左侧边栏的"新建笔记"按钮
2. 在编辑器中输入内容
3. 笔记会自动保存

### 编辑功能

编辑器支持以下格式：

- **标题** - H1, H2, H3
- **文本格式** - 粗体、斜体、下划线、代码
- **段落格式** - 引用、代码块
- **列表** - 有序列表、无序列表
- **对齐** - 左对齐、居中、右对齐、两端对齐
- **链接和图片** - 插入链接和图片

### 快捷键

- `Ctrl/Cmd + B` - 粗体
- `Ctrl/Cmd + I` - 斜体
- `Ctrl/Cmd + U` - 下划线
- `Ctrl/Cmd + `` ` - 代码

### 导入笔记

1. 点击导入按钮（上传图标）
2. 系统会自动从 `/Users/xinference/Sync/md` 目录导入所有 Markdown 文件
3. 支持的文件格式：`.md`, `.markdown`
4. 自动解析 Front Matter 元数据

### 组织笔记

- **标签** - 为笔记添加标签，方便分类和搜索
- **分类** - 设置笔记分类
- **搜索** - 使用搜索框快速查找笔记

### 导出笔记

点击笔记编辑器顶部的下载按钮，将当前笔记导出为 Markdown 文件。

## 数据存储

应用使用浏览器的 LocalStorage 存储笔记数据。所有数据都保存在本地，不会上传到服务器。

### 存储限制

- LocalStorage 通常有 5-10MB 的存储限制
- 建议定期导出重要笔记作为备份

## 项目结构

```
mynotes/
├── app/
│   ├── api/
│   │   └── import/      # 导入 API
│   ├── globals.css       # 全局样式
│   ├── layout.tsx        # 应用布局
│   └── page.tsx          # 主页面
├── components/
│   ├── editor/           # 编辑器组件
│   │   └── slate-editor.tsx
│   ├── sidebar/          # 侧边栏组件
│   │   └── note-list.tsx
│   ├── dialogs/          # 对话框组件
│   │   └── import-dialog.tsx
│   └── ui/               # UI 组件
├── lib/
│   ├── import-notes.ts   # 导入功能
│   ├── storage.ts        # 存储功能
│   └── utils.ts          # 工具函数
├── types/
│   └── note.ts           # 类型定义
└── public/               # 静态资源
```

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 类型检查
npm run type-check
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 作者

[Your Name]

## 更新日志

### v1.0.0 (2024-01-xx)
- 初始版本发布
- 支持 Markdown 编辑
- 支持图片插入
- 批量导入功能
- 标签和分类系统