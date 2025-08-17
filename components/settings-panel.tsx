"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  FolderOpen,
  Image,
  FileText,
  Download,
  Upload,
  Save,
  RotateCcw,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  settingsManager,
  Settings as SettingsType,
  DEFAULT_SETTINGS,
  SettingsManager,
} from "@/lib/settings";

interface SettingsPanelProps {
  onClose?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeTab, setActiveTab] = useState("markdown");

  useEffect(() => {
    // 加载当前设置
    const currentSettings = settingsManager.getSettings();
    setSettings(currentSettings);

    // 订阅设置变化
    const unsubscribe = settingsManager.subscribe((newSettings) => {
      setSettings(newSettings);
    });

    return unsubscribe;
  }, []);

  // 处理设置更改
  const handleSettingChange = <K extends keyof SettingsType, F extends keyof SettingsType[K]>(
    group: K,
    field: F,
    value: SettingsType[K][F]
  ) => {
    const newSettings = {
      ...settings,
      [group]: {
        ...settings[group],
        [field]: value,
      },
    };
    setSettings(newSettings);
    setHasChanges(true);
  };

  // 保存设置
  const handleSave = () => {
    setSaveStatus("saving");
    try {
      settingsManager.updateSettings(settings);
      setHasChanges(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // 重置设置
  const handleReset = () => {
    if (confirm("确定要重置所有设置为默认值吗？")) {
      settingsManager.resetSettings();
      setSettings(DEFAULT_SETTINGS);
      setHasChanges(false);
    }
  };

  // 导出设置
  const handleExport = () => {
    const json = settingsManager.exportSettings();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mynotes-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入设置
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          settingsManager.importSettings(text);
          alert("设置导入成功！");
        } catch (error) {
          alert("导入失败：无效的设置文件");
        }
      }
    };
    input.click();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h2 className="text-2xl font-bold">设置</h2>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saved" && (
            <div className="flex items-center gap-1 text-green-600">
              <Check className="h-4 w-4" />
              <span className="text-sm">已保存</span>
            </div>
          )}
          {saveStatus === "error" && (
            <div className="flex items-center gap-1 text-red-600">
              <X className="h-4 w-4" />
              <span className="text-sm">保存失败</span>
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveStatus === "saving"}
            size="sm"
          >
            {saveStatus === "saving" ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                保存中
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                保存设置
              </>
            )}
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="outline" size="sm">
              关闭
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="markdown">Markdown</TabsTrigger>
          <TabsTrigger value="images">图片</TabsTrigger>
          <TabsTrigger value="editor">编辑器</TabsTrigger>
          <TabsTrigger value="import">导入</TabsTrigger>
          <TabsTrigger value="export">导出</TabsTrigger>
        </TabsList>

        {/* Markdown设置 */}
        <TabsContent value="markdown">
          <Card>
            <CardHeader>
              <CardTitle>Markdown 设置</CardTitle>
              <CardDescription>配置Markdown文件的导入和处理选项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sourceDirectory">源文件目录</Label>
                <div className="flex gap-2">
                  <Input
                    id="sourceDirectory"
                    value={settings.markdown.sourceDirectory}
                    onChange={(e) =>
                      handleSettingChange("markdown", "sourceDirectory", e.target.value)
                    }
                    placeholder="/Users/xinference/Sync/md"
                  />
                  <Button variant="outline" size="icon">
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Markdown文件的默认导入目录
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="importSubdirectories">递归导入子目录</Label>
                  <p className="text-xs text-muted-foreground">
                    导入时包含所有子目录中的文件
                  </p>
                </div>
                <Switch
                  id="importSubdirectories"
                  checked={settings.markdown.importSubdirectories}
                  onCheckedChange={(checked) =>
                    handleSettingChange("markdown", "importSubdirectories", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoProcessImages">自动处理图片</Label>
                  <p className="text-xs text-muted-foreground">
                    导入时自动复制和转换图片
                  </p>
                </div>
                <Switch
                  id="autoProcessImages"
                  checked={settings.markdown.autoProcessImages}
                  onCheckedChange={(checked) =>
                    handleSettingChange("markdown", "autoProcessImages", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 图片设置 */}
        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>图片设置</CardTitle>
              <CardDescription>配置图片存储和处理选项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="saveDirectory">保存目录</Label>
                <Input
                  id="saveDirectory"
                  value={settings.images.saveDirectory}
                  onChange={(e) =>
                    handleSettingChange("images", "saveDirectory", e.target.value)
                  }
                  placeholder="public/images"
                />
                <p className="text-xs text-muted-foreground">
                  图片文件的保存位置（相对于项目根目录）
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl">基础URL</Label>
                <Input
                  id="baseUrl"
                  value={settings.images.baseUrl}
                  onChange={(e) =>
                    handleSettingChange("images", "baseUrl", e.target.value)
                  }
                  placeholder="/images"
                />
                <p className="text-xs text-muted-foreground">
                  图片访问的URL前缀
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quality">图片质量 ({settings.images.quality}%)</Label>
                <Slider
                  id="quality"
                  min={1}
                  max={100}
                  step={1}
                  value={[settings.images.quality]}
                  onValueChange={(value) =>
                    handleSettingChange("images", "quality", value[0])
                  }
                />
                <p className="text-xs text-muted-foreground">
                  JPEG图片的压缩质量
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="keepOriginalNames">保留原始文件名</Label>
                  <p className="text-xs text-muted-foreground">
                    使用原始文件名而不是生成唯一名称
                  </p>
                </div>
                <Switch
                  id="keepOriginalNames"
                  checked={settings.images.keepOriginalNames}
                  onCheckedChange={(checked) =>
                    handleSettingChange("images", "keepOriginalNames", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="organizeByDate">按日期组织</Label>
                  <p className="text-xs text-muted-foreground">
                    按年/月创建子目录组织图片
                  </p>
                </div>
                <Switch
                  id="organizeByDate"
                  checked={settings.images.organizeByDate}
                  onCheckedChange={(checked) =>
                    handleSettingChange("images", "organizeByDate", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 编辑器设置 */}
        <TabsContent value="editor">
          <Card>
            <CardHeader>
              <CardTitle>编辑器设置</CardTitle>
              <CardDescription>配置编辑器的显示和行为</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoSave">自动保存</Label>
                  <p className="text-xs text-muted-foreground">
                    自动保存编辑的内容
                  </p>
                </div>
                <Switch
                  id="autoSave"
                  checked={settings.editor.autoSave}
                  onCheckedChange={(checked) =>
                    handleSettingChange("editor", "autoSave", checked)
                  }
                />
              </div>

              {settings.editor.autoSave && (
                <div className="space-y-2">
                  <Label htmlFor="autoSaveInterval">
                    自动保存间隔 ({settings.editor.autoSaveInterval / 1000}秒)
                  </Label>
                  <Slider
                    id="autoSaveInterval"
                    min={1000}
                    max={10000}
                    step={500}
                    value={[settings.editor.autoSaveInterval]}
                    onValueChange={(value) =>
                      handleSettingChange("editor", "autoSaveInterval", value[0])
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fontSize">字体大小 ({settings.editor.fontSize}px)</Label>
                <Slider
                  id="fontSize"
                  min={12}
                  max={24}
                  step={1}
                  value={[settings.editor.fontSize]}
                  onValueChange={(value) =>
                    handleSettingChange("editor", "fontSize", value[0])
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">主题</Label>
                <Select
                  value={settings.editor.theme}
                  onValueChange={(value: "light" | "dark" | "system") =>
                    handleSettingChange("editor", "theme", value)
                  }
                >
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">浅色</SelectItem>
                    <SelectItem value="dark">深色</SelectItem>
                    <SelectItem value="system">跟随系统</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 导入设置 */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>导入设置</CardTitle>
              <CardDescription>配置文件导入的处理选项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="preserveMetadata">保留元数据</Label>
                  <p className="text-xs text-muted-foreground">
                    导入时保留文件的元数据信息
                  </p>
                </div>
                <Switch
                  id="preserveMetadata"
                  checked={settings.import.preserveMetadata}
                  onCheckedChange={(checked) =>
                    handleSettingChange("import", "preserveMetadata", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cleanupHTML">清理HTML</Label>
                  <p className="text-xs text-muted-foreground">
                    移除不必要的HTML标签和样式
                  </p>
                </div>
                <Switch
                  id="cleanupHTML"
                  checked={settings.import.cleanupHTML}
                  onCheckedChange={(checked) =>
                    handleSettingChange("import", "cleanupHTML", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="convertToMarkdown">转换为Markdown</Label>
                  <p className="text-xs text-muted-foreground">
                    自动将HTML内容转换为Markdown格式
                  </p>
                </div>
                <Switch
                  id="convertToMarkdown"
                  checked={settings.import.convertToMarkdown}
                  onCheckedChange={(checked) =>
                    handleSettingChange("import", "convertToMarkdown", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 导出设置 */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>导出设置</CardTitle>
              <CardDescription>配置文件导出的选项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="includeImages">包含图片</Label>
                  <p className="text-xs text-muted-foreground">
                    导出时包含相关的图片文件
                  </p>
                </div>
                <Switch
                  id="includeImages"
                  checked={settings.export.includeImages}
                  onCheckedChange={(checked) =>
                    handleSettingChange("export", "includeImages", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="embedImages">嵌入图片</Label>
                  <p className="text-xs text-muted-foreground">
                    将图片转换为Base64嵌入文档
                  </p>
                </div>
                <Switch
                  id="embedImages"
                  checked={settings.export.embedImages}
                  onCheckedChange={(checked) =>
                    handleSettingChange("export", "embedImages", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="includeMetadata">包含元数据</Label>
                  <p className="text-xs text-muted-foreground">
                    导出时包含笔记的元数据信息
                  </p>
                </div>
                <Switch
                  id="includeMetadata"
                  checked={settings.export.includeMetadata}
                  onCheckedChange={(checked) =>
                    handleSettingChange("export", "includeMetadata", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 底部操作按钮 */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t">
        <div className="flex gap-2">
          <Button onClick={handleReset} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            重置为默认
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleImport} variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            导入设置
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出设置
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
