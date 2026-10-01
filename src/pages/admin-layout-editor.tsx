import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  History,
  Plus,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../app/context";
import { AdminTitle } from "./admin";
import { defaultSettings, now, uid } from "../domain/seed";
import type { HomeModule, NavigationItem, RecordNote } from "../domain/models";
import { repository } from "../storage";
import { Modal } from "../components/ui";
import { normalizeHomeModules } from "../domain/campus";
export function HomepageEditor() {
  const { settings, save, toast } = useApp();
  const [modules, setModules] = useState<HomeModule[]>(
      normalizeHomeModules(
        settings.homeModules ?? defaultSettings.homeModules!,
      ),
    ),
    [versions, setVersions] = useState<RecordNote[]>([]),
    [restore, setRestore] = useState<RecordNote | null>(null);
  useEffect(() => {
    repository
      .list("records")
      .then((r) =>
        setVersions(
          r
            .filter((x) => x.kind === "homepage-version")
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      );
  }, []);
  function move(i: number, by: number) {
    const next = [...modules];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setModules(next.map((m, j) => ({ ...m, order: j + 1 })));
  }
  async function publish() {
    const snapshot: RecordNote = {
      id: uid(),
      kind: "homepage-version",
      title: "首页配置快照",
      description: "发布前版本",
      enabled: false,
      value: JSON.stringify(
        settings.homeModules ?? defaultSettings.homeModules,
      ),
      createdAt: now(),
    };
    await save("records", snapshot, "保留首页版本");
    await save(
      "settings",
      { ...settings, homeModules: modules },
      "发布首页编排",
    );
    setVersions((v) => [snapshot, ...v]);
    toast("首页编排已生效");
  }
  return (
    <>
      <AdminTitle
        eyebrow="PAGE COMPOSER / 首页编排"
        title="用自己的节奏，讲好产品故事。"
        description="调整求职产品、校园探索与反馈模块的顺序和显示状态。搜索介绍区跟随产品区展示。"
      >
        <Link className="button secondary" target="_blank" to="/">
          <Eye size={16} />
          查看首页
        </Link>
        <button className="button" onClick={() => void publish()}>
          <Check size={16} />
          发布编排
        </button>
      </AdminTitle>
      <div className="editor-layout">
        <div className="admin-panel module-list">
          {modules.map((m, i) => (
            <div className="module-row" key={m.id}>
              <span className="module-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <strong>{m.label}</strong>
                <small>{m.id}</small>
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={m.enabled}
                  onChange={(e) =>
                    setModules(
                      modules.map((x) =>
                        x.id === m.id ? { ...x, enabled: e.target.checked } : x,
                      ),
                    )
                  }
                />
                显示
              </label>
              <button
                className="icon-button"
                disabled={i === 0}
                aria-label={`上移 ${m.label}`}
                onClick={() => move(i, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                className="icon-button"
                disabled={i === modules.length - 1}
                aria-label={`下移 ${m.label}`}
                onClick={() => move(i, 1)}
              >
                <ArrowDown size={16} />
              </button>
            </div>
          ))}
        </div>
        <aside className="admin-panel">
          <div className="panel-heading">
            <h2>
              <History size={16} /> 版本记录
            </h2>
          </div>
          {versions.length ? (
            versions.slice(0, 8).map((v) => (
              <div className="version-row" key={v.id}>
                <span>{new Date(v.createdAt).toLocaleString("zh-CN")}</span>
                <button onClick={() => setRestore(v)}>恢复</button>
              </div>
            ))
          ) : (
            <p className="panel-note">首次发布后自动保留此前配置，支持恢复。</p>
          )}
          <Link className="button secondary small" to="/admin/placements">
            管理具体产品推荐位
          </Link>
        </aside>
      </div>
      <Modal
        open={!!restore}
        onClose={() => setRestore(null)}
        title="恢复这个首页版本？"
        description="当前首页模块设置会被替换，不影响产品内容。"
      >
        <button
          className="button"
          onClick={() => {
            if (restore) {
              const restored = JSON.parse(restore.value) as HomeModule[];
              void save(
                "settings",
                { ...settings, homeModules: restored },
                "恢复首页版本",
              ).then(() => {
                setModules(normalizeHomeModules(restored));
                setRestore(null);
                toast("首页版本已恢复");
              });
            }
          }}
        >
          确认恢复
        </button>
      </Modal>
    </>
  );
}
export function NavigationEditor() {
  const { settings, save, toast } = useApp();
  const [items, setItems] = useState<NavigationItem[]>(
    settings.navigation ?? defaultSettings.navigation!,
  );
  return (
    <>
      <AdminTitle
        eyebrow="NAVIGATION / 导航管理"
        title="让每个入口，都清楚易找。"
        description="默认仅展示品牌、搜索与收藏。下方入口保留但暂不显示，可按需启用；导航仅允许站内路径。"
      >
        <button
          className="button"
          onClick={() => {
            if (
              items.some((i) => !i.label.trim() || !/^\/(?!\/)/.test(i.path))
            ) {
              toast("请填写导航名称和以 / 开头的站内路径");
              return;
            }
            void save(
              "settings",
              { ...settings, navigation: items },
              "保存导航",
            ).then(() => toast("导航已保存"));
          }}
        >
          保存导航
        </button>
      </AdminTitle>
      <div className="admin-panel form">
        {items.map((item, i) => (
          <div className="navigation-row" key={item.id}>
            <label>
              导航名称
              <input
                value={item.label}
                onChange={(e) =>
                  setItems(
                    items.map((x) =>
                      x.id === item.id ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <label>
              站内路径
              <input
                value={item.path}
                onChange={(e) =>
                  setItems(
                    items.map((x) =>
                      x.id === item.id ? { ...x, path: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) =>
                  setItems(
                    items.map((x) =>
                      x.id === item.id
                        ? { ...x, enabled: e.target.checked }
                        : x,
                    ),
                  )
                }
              />
              显示
            </label>
            <button
              className="icon-button"
              aria-label={`上移 ${item.label}`}
              disabled={i === 0}
              onClick={() => {
                const next = [...items];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                setItems(next.map((x, j) => ({ ...x, order: j })));
              }}
            >
              <ArrowUp size={16} />
            </button>
            <button
              className="icon-button"
              aria-label={`移除 ${item.label}`}
              onClick={() => setItems(items.filter((x) => x.id !== item.id))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          className="button secondary"
          onClick={() =>
            setItems([
              ...items,
              {
                id: uid(),
                label: "",
                path: "/",
                enabled: true,
                order: items.length,
              },
            ])
          }
        >
          <Plus size={16} />
          新增导航
        </button>
      </div>
    </>
  );
}
