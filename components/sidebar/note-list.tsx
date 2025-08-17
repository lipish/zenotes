"use client";

import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Tag,
  Folder,
  Calendar,
  Trash2,
  FileText,
  Download,
  Upload,
  FolderCog,
  HardDrive,
  Settings,
} from "lucide-react";
import { NoteMetadata } from "@/types/note";
import { StorageDialog } from "@/components/dialogs/storage-dialog";
import {
  getAllNotesMetadata,
  deleteNote,
  getAllTags,
  getAllCategories,
  getStorageInfo,
  getStorageUsagePercentage,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

interface NoteListProps {
  selectedNoteId?: string;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onImportNotes: () => void;
  onManageNotes?: () => void;
}

export const NoteList: React.FC<NoteListProps> = ({
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onImportNotes,
  onManageNotes,
}) => {
  const [notes, setNotes] = useState<NoteMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [storageUsage, setStorageUsage] = useState(0);
  const [storageInfo, setStorageInfo] = useState({ used: 0, available: 0 });
  const [showStorageDialog, setShowStorageDialog] = useState(false);

  // 加载笔记列表
  const loadNotes = () => {
    const allNotes = getAllNotesMetadata();
    // 按更新时间排序
    allNotes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    setNotes(allNotes);
    setTags(getAllTags());
    setCategories(getAllCategories());
  };

  useEffect(() => {
    loadNotes();
    // 设置定时刷新
    const interval = setInterval(loadNotes, 5000);

    // 更新存储信息
    const updateStorageInfo = () => {
      const info = getStorageInfo();
      setStorageInfo(info);
      setStorageUsage(getStorageUsagePercentage());
    };
    updateStorageInfo();
    const storageInterval = setInterval(updateStorageInfo, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(storageInterval);
    };
  }, []);

  // 过滤笔记
  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = !selectedTag || note.tags?.includes(selectedTag);
    const matchesCategory =
      !selectedCategory || note.category === selectedCategory;

    return matchesSearch && matchesTag && matchesCategory;
  });

  // 删除笔记
  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("确定要删除这个笔记吗？")) {
      deleteNote(id);
      loadNotes();
      if (selectedNoteId === id) {
        onCreateNote();
      }
    }
  };

  // 格式化日期
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes === 0 ? "刚刚" : `${minutes}分钟前`;
      }
      return `${hours}小时前`;
    }
    if (days === 1) return "昨天";
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
  };

  return (
    <div className="flex flex-col h-full bg-background border-r w-80 flex-shrink-0">
      {/* 工具栏 */}
      <div className="p-4 border-b space-y-3">
        <div className="flex gap-2">
          <Button onClick={onCreateNote} className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            新建笔记
          </Button>
          <Button onClick={onImportNotes} variant="outline" size="icon">
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            onClick={onManageNotes}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <FolderCog className="h-4 w-4" />
            <span className="ml-2">管理</span>
          </Button>{" "}
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索笔记..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 筛选选项 */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="h-3 w-3" />
              <span>标签</span>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                variant={selectedTag === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag("")}
                className="h-7 text-xs"
              >
                全部
              </Button>
              {tags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                  className="h-7 text-xs"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        )}

        {categories.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Folder className="h-3 w-3" />
              <span>分类</span>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                variant={selectedCategory === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("")}
                className="h-7 text-xs"
              >
                全部
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={
                    selectedCategory === category ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="h-7 text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 笔记列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无笔记</p>
              <p className="text-sm mt-1">点击"新建笔记"开始创建</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <Card
                key={note.id}
                className={cn(
                  "p-3 cursor-pointer hover:bg-accent transition-colors overflow-hidden",
                  selectedNoteId === note.id && "bg-accent border-primary",
                )}
                onClick={() => onSelectNote(note.id)}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-sm truncate flex-1 pr-2 max-w-[200px]">
                    {note.title || "无标题笔记"}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteNote(note.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {note.excerpt && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2 break-words max-w-[250px]">
                    {note.excerpt.slice(0, 60)}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(note.updatedAt)}</span>

                  {note.tags && note.tags.length > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex gap-1">
                        {note.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="bg-muted px-1.5 py-0.5 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > 2 && (
                          <span className="text-xs">
                            +{note.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* 统计信息 */}
      <div className="p-3 border-t text-xs text-muted-foreground space-y-2">
        <div className="flex justify-between">
          <span>共 {notes.length} 个笔记</span>
          {filteredNotes.length !== notes.length && (
            <span>显示 {filteredNotes.length} 个</span>
          )}
        </div>

        {/* 存储空间 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              <span>存储</span>
            </div>
            <span
              className={cn(
                storageUsage > 90
                  ? "text-destructive"
                  : storageUsage > 70
                    ? "text-yellow-600"
                    : "text-muted-foreground",
              )}
            >
              {storageUsage}%
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all",
                storageUsage > 90
                  ? "bg-destructive"
                  : storageUsage > 70
                    ? "bg-yellow-600"
                    : "bg-primary",
              )}
              style={{ width: `${storageUsage}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px]">
            <span>{(storageInfo.used / 1024 / 1024).toFixed(1)} MB</span>
            <span>{(storageInfo.available / 1024 / 1024).toFixed(0)} MB</span>
          </div>
          {/* 存储管理按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 mt-2 text-xs"
            onClick={() => setShowStorageDialog(true)}
          >
            <Settings className="h-3 w-3 mr-1" />
            管理存储空间
          </Button>
        </div>
      </div>

      {/* 存储管理对话框 */}
      <StorageDialog
        isOpen={showStorageDialog}
        onClose={() => setShowStorageDialog(false)}
        onStorageCleared={() => {
          loadNotes();
          const info = getStorageInfo();
          setStorageInfo(info);
          setStorageUsage(getStorageUsagePercentage());
        }}
      />
    </div>
  );
};
