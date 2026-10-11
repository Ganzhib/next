import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useApp } from "../app/context";
import { homeContent } from "../domain/home-config";
import { homeContentSchema, type ToolCard } from "../domain/content";
import { defaultToolCards } from "../domain/tool-collection";
import { uid } from "../domain/seed";
import { AdminTitle } from "./admin";
import { ImageField } from "./admin-server";

export function ToolCollectionEditor() {
  const { settings, products, placements, save, toast } = useApp();
  const initialContent = homeContent(settings, products, placements);
  const [tools, setTools] = useState<ToolCard[]>(() =>
    [...(initialContent.tools ?? defaultToolCards)].sort((a, b) => a.order - b.order),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function patch(id: string, value: Partial<ToolCard>) {
    setTools((items) => items.map((item) => item.id === id ? { ...item, ...value } : item));
    setError("");
  }

  function move(index: number, by: number) {
    const next = [...tools];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    setTools(next.map((item, order) => ({ ...item, order: order + 1 })));
  }

  function dropBefore(sourceId: string, targetId: string) {
    if (!sourceId || sourceId === targetId) return;
    setTools((items) => {
      const next = [...items];
      const from = next.findIndex((item) => item.id === sourceId);
      const to = next.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return items;
      const [moved] = next.splice(from, 1);
      next.splice(from < to ? to - 1 : to, 0, moved);
      return next.map((item, order) => ({ ...item, order: order + 1 }));
    });
  }

  function addTool() {
    setTools((items) => [
      ...items,
      {
        id: uid(),
        name: "新工具",
        category: "在线工具",
        description: "写一句清楚、简短的工具介绍。",
        action: "打开工具",
        href: "",
        image: defaultToolCards[0].image,
        alt: "工具插画",
        download: false,
        enabled: false,
        order: items.length + 1,
      },
    ]);
  }

  async function publish() {
    setBusy(true);
    setError("");
    try {
      const latest = homeContent(settings, products, placements);
      const parsed = homeContentSchema.parse({
        ...latest,
        tools: tools.map((item, order) => ({ ...item, order: order + 1 })),
      });
      await save("settings", { ...settings, homeContent: parsed }, "发布工具集合");
      toast("工具集合已发布，首页会立即同步");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "发布失败，请检查配置");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminTitle
        title="工具集合"
        eyebrow="TOOLS / 首页卡片"
        description="配置工具名称、介绍、跳转地址与卡片插画。换图不会改变前台原有动画。"
      >
        <button className="button secondary" onClick={addTool}>
          <Plus size={16} />新增工具
        </button>
      </AdminTitle>

      <div className="tool-config-grid">
        {tools.map((tool, index) => (
          <article
            className={`admin-panel form tool-config-card ${dragOverId === tool.id ? "is-drag-over" : ""}`}
            key={tool.id}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDragOverId(tool.id);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverId(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              dropBefore(event.dataTransfer.getData("text/plain") || draggedId || "", tool.id);
              setDraggedId(null);
              setDragOverId(null);
            }}
          >
            <div className="tool-config-heading">
              <img src={tool.image} alt="" />
              <div>
                <span className="eyebrow">工具 {String(index + 1).padStart(2, "0")}</span>
                <h2>{tool.name}</h2>
              </div>
              <div className="tool-config-actions">
                <span
                  className="tool-drag-handle"
                  draggable
                  title="按住拖动排序"
                  aria-label={`拖动${tool.name}排序`}
                  onDragStart={(event) => {
                    setDraggedId(tool.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", tool.id);
                  }}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                ><GripVertical size={17} /></span>
                <button className="icon-button" disabled={!index} onClick={() => move(index, -1)} aria-label={`上移${tool.name}`}><ArrowUp size={16} /></button>
                <button className="icon-button" disabled={index === tools.length - 1} onClick={() => move(index, 1)} aria-label={`下移${tool.name}`}><ArrowDown size={16} /></button>
                <button className="icon-button" onClick={() => setTools((items) => items.filter((item) => item.id !== tool.id))} aria-label={`删除${tool.name}`}><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="form-grid two">
              <label>工具名称<input value={tool.name} onChange={(e) => patch(tool.id, { name: e.target.value })} /></label>
              <label>分类标签<input value={tool.category} onChange={(e) => patch(tool.id, { category: e.target.value })} /></label>
            </div>
            <label>工具介绍<textarea value={tool.description} maxLength={400} onChange={(e) => patch(tool.id, { description: e.target.value })} /></label>
            <div className="form-grid two">
              <label>按钮文字<input value={tool.action} onChange={(e) => patch(tool.id, { action: e.target.value })} /></label>
              <label>工具地址<input type="url" value={tool.href} placeholder="https://…" onChange={(e) => patch(tool.id, { href: e.target.value })} /></label>
            </div>
            <ImageField value={tool.image} onChange={(image) => patch(tool.id, { image })} />
            <label>图片描述<input value={tool.alt} onChange={(e) => patch(tool.id, { alt: e.target.value })} /></label>
            <div className="tool-config-options">
              <label><input type="checkbox" checked={tool.enabled} onChange={(e) => patch(tool.id, { enabled: e.target.checked })} />在首页显示</label>
              <label><input type="checkbox" checked={tool.download} onChange={(e) => patch(tool.id, { download: e.target.checked })} />下载类型按钮</label>
            </div>
          </article>
        ))}
      </div>

      <div className="cms-save-bar">
        <span>{tools.filter((tool) => tool.enabled).length} 个工具将在首页显示</span>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button" disabled={busy} onClick={() => void publish()}>
          <Save size={16} />{busy ? "正在发布…" : "发布工具集合"}
        </button>
      </div>
    </>
  );
}
