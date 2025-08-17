"use client";

import React, { useState, useEffect } from "react";
import {
  getAllNotesMetadata,
  deleteNote,
  deleteNotes,
  deleteAllNotes,
  getNotesCount,
  getStorageInfo,
} from "@/lib/storage";
import { NoteMetadata } from "@/types/note";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, FileText, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export const NotesManager = ({ onClose, onNotesDeleted }) => {
  const [notes, setNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const metadata = getAllNotesMetadata();
    setNotes(metadata);
  }, []);

  const toggleSelectNote = (id) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotes(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedNotes.size === 0) return;
    if (
      window.confirm(
        `确定要删除选中的 ${selectedNotes.size} 个笔记吗？此操作不可恢复。`,
      )
    ) {
      setLoading(true);
      deleteNotes(Array.from(selectedNotes));
      setNotes(getAllNotesMetadata());
      setSelectedNotes(new Set());
      if (onNotesDeleted) onNotesDeleted();
      setLoading(false);
    }
  };

  const handleDeleteAll = () => {
    const confirmFirst = window.confirm(
      `确定要删除所有 ${notes.length} 个笔记吗？此操作不可恢复！`,
    );
    if (confirmFirst) {
      const userInput = window.prompt(`请输入 "删除全部" 来确认删除所有笔记：`);
      if (userInput === "删除全部") {
        setLoading(true);
        deleteAllNotes();
        setNotes([]);
        setSelectedNotes(new Set());
        if (onNotesDeleted) onNotesDeleted();
        setLoading(false);
      } else if (userInput !== null) {
        alert("输入不正确，已取消删除操作");
      }
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">笔记管理器</h2>
          <p className="text-sm text-muted-foreground mt-1">
            共 {notes.length} 个笔记，已选择 {selectedNotes.size} 个
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (selectedNotes.size === notes.length) {
                setSelectedNotes(new Set());
              } else {
                setSelectedNotes(new Set(notes.map((n) => n.id)));
              }
            }}
            variant="outline"
            size="sm"
          >
            {selectedNotes.size === notes.length ? "取消全选" : "全选"}
          </Button>
          <Button
            onClick={handleDeleteSelected}
            variant="destructive"
            size="sm"
            disabled={loading || selectedNotes.size === 0}
          >
            删除选中 ({selectedNotes.size})
          </Button>
          <Button
            onClick={handleDeleteAll}
            variant="destructive"
            size="sm"
            disabled={loading || notes.length === 0}
          >
            删除全部
          </Button>
        </div>
      </div>
      <ScrollArea className="h-[400px] border rounded-lg p-4">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>暂无笔记</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="flex items-center gap-3 p-3 border-b hover:bg-accent/50 transition-colors rounded-md"
            >
              <Checkbox
                checked={selectedNotes.has(note.id)}
                onCheckedChange={() => toggleSelectNote(note.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {note.title || "无标题"}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(note.updatedAt).toLocaleDateString("zh-CN")}
                  </span>
                  {note.tags && note.tags.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{note.tags.slice(0, 2).join(", ")}</span>
                      {note.tags.length > 2 && (
                        <span>+{note.tags.length - 2}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <Button
                onClick={() => {
                  if (
                    window.confirm(
                      `确定要删除笔记 "${note.title || "无标题"}" 吗？`,
                    )
                  ) {
                    deleteNote(note.id);
                    setNotes(getAllNotesMetadata());
                    if (onNotesDeleted) onNotesDeleted();
                  }
                }}
                variant="ghost"
                size="icon"
                className="hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
};

export default NotesManager;
