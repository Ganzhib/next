import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  Copy,
  Download,
  Eye,
  FileClock,
  Flag,
  FolderOpen,
  Globe,
  GripVertical,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  ListChecks,
  LockKeyhole,
  LogOut,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Trash2,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "../app/context";
import { Brand } from "../components/layout";
import { Empty, Modal, ProductIcon } from "../components/ui";
import { hashPin, safeTarget } from "../domain/security";
import { emptyProduct, now, uid } from "../domain/seed";
import { repository } from "../storage";
import {
  productSchema,
  pricingLabels,
  statusLabels,
  type Activity,
  type Audit,
  type Collection,
  type Placement,
  type Product,
  type RecordNote,
  type Submission,
  type Taxonomy,
} from "../domain/models";
import { downloadJson } from "./workspace";
const navGroups: { label: string; links: [string, string, LucideIcon][] }[] = [
  {
    label: "工作空间",
    links: [
      ["", "概览", LayoutDashboard],
      ["products", "产品管理", LayoutGrid],
      ["collections", "精选合集", FolderOpen],
      ["placements", "推荐与编排", GripVertical],
      ["homepage", "首页编排", LayoutDashboard],
      ["navigation", "导航管理", Compass],
      ["categories", "分类与标签", ListChecks],
    ],
  },
  {
    label: "了解你的用户",
    links: [
      ["analytics", "数据分析", BarChart3],
      ["submissions", "提交与反馈", BookOpen],
      ["users", "用户与权限", Users],
      ["link-health", "链接状态", Link2],
    ],
  },
  {
    label: "平台设置",
    links: [
      ["commercial", "商业合作", Globe],
      ["experiments", "实验与开关", Flag],
      ["notifications", "消息管理", Bell],
      ["audit-logs", "操作日志", FileClock],
      ["settings", "站点设置", Settings],
    ],
  },
];
export function AdminLayout() {
  const { admin, setAdmin, settings, save, toast } = useApp();
  const [pin, setPin] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
  async function unlock(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (pin.length < 6) throw new Error("请输入至少 6 位本地访问口令");
      if (settings.adminPinHash) {
        if ((await hashPin(pin, settings.adminSalt)) !== settings.adminPinHash)
          throw new Error("口令不正确，请重试");
      } else {
        const salt = uid();
        await save(
          "settings",
          {
            ...settings,
            adminSalt: salt,
            adminPinHash: await hashPin(pin, salt),
          },
          "设置本地访问口令",
        );
      }
      setAdmin(true);
      toast("已进入本地运营工作台");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!admin)
    return (
      <div className="admin-gate">
        <Brand />
        <div className="gate-card">
          <span className="gate-icon">
            <LockKeyhole size={28} />
          </span>
          <span className="eyebrow">NEXT / OPERATOR WORKSPACE</span>
          <h1>{settings.adminPinHash ? "欢迎回来。" : "建立你的运营空间。"}</h1>
          <p>在这里整理产品、编排首页，了解真实的访问行为。</p>
          <form className="form" onSubmit={(e) => void unlock(e)}>
            <label>
              {settings.adminPinHash ? "本地访问口令" : "设置本地访问口令"}
              <input
                type="password"
                minLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="至少 6 位字符"
                autoComplete={
                  settings.adminPinHash ? "current-password" : "new-password"
                }
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button full" disabled={busy}>
              {busy
                ? "正在打开…"
                : settings.adminPinHash
                  ? "进入运营后台"
                  : "创建并进入"}
            </button>
          </form>
          <p className="gate-note">
            <Shield size={14} />{" "}
            此口令只限制本地界面访问，不是服务端鉴权。所有运营数据保存在当前浏览器。
          </p>
        </div>
        <Link to="/" className="text-link">
          返回下一程
        </Link>
      </div>
    );
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menu ? "open" : ""}`}>
        <Brand />
        <span className="admin-workspace-tag">OPERATOR WORKSPACE</span>
        {navGroups.map((g) => (
          <div className="admin-nav-group" key={g.label}>
            <h3>{g.label}</h3>
            {g.links.map(([path, label, I]) => (
              <NavLink
                key={path}
                end={path === ""}
                to={`/admin${path ? "/" + path : ""}`}
              >
                <I size={17} />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
        <div className="sidebar-bottom">
          <span className="local-indicator" /> 浏览器本地存储{" "}
          <small>IndexedDB · 当前设备</small>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="后台导航"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={20} />
          </button>
          <span>
            工作空间 <ChevronRight size={13} />{" "}
            {navGroups
              .flatMap((g) => g.links)
              .find(
                ([path]) =>
                  location.pathname === `/admin${path ? "/" + path : ""}`,
              )?.[1] ?? "编辑内容"}
          </span>
          <div>
            <Link to="/" target="_blank" className="text-link">
              查看网站 <ArrowUpRight size={14} />
            </Link>
            <button
              className="icon-button"
              onClick={() => setAdmin(false)}
              aria-label="锁定后台"
            >
              <LogOut size={17} />
            </button>
            <span className="avatar">管</span>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
        <footer className="admin-footer">
          NEXT / 运营工作台<span>数据属于你 · 记得定期备份</span>
        </footer>
      </div>
    </div>
  );
}
export function AdminTitle({
  eyebrow = "WORKSPACE",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="admin-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="admin-title-actions">{children}</div>
    </div>
  );
}
import { exposureConversion } from "../domain/analytics";

function useEvents() {
  const [events, setEvents] = useState<Activity[]>([]);
  useEffect(() => {
    repository.list("events").then(setEvents);
  }, []);
  return events;
}
export function AdminOverview() {
  const { allProducts, profile } = useApp();
  const events = useEvents();
  const [audit, setAudit] = useState<Audit[]>([]);
  useEffect(() => {
    repository
      .list("audit")
      .then((a) =>
        setAudit(
          a
            .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
            .slice(0, 5),
        ),
      );
  }, []);
  const clicks = events.filter(
    (e) => e.name === "product_outbound_redirected",
  ).length;
  const impressions = events.filter(
    (e) => e.name === "product_impression",
  ).length;
  return (
    <>
      <AdminTitle
        eyebrow="OVERVIEW / 运营概览"
        title="今天，也让好产品被看见。"
        description="产品、内容与真实反馈，都在这个工作空间里。"
      >
        <Link className="button" to="/admin/products/new">
          <Plus size={17} />
          新增产品
        </Link>
      </AdminTitle>
      <div className="local-banner">
        <span>
          <ActivityIcon size={17} />
          <strong>本地数据模式</strong> 当前统计仅包含本浏览器记录。
        </span>
        <Link to="/settings/privacy">
          {profile.analytics ? "行为记录已开启" : "开启行为记录"}
          <ArrowUpRight size={13} />
        </Link>
      </div>
      <div className="stat-grid">
        {[
          [
            "已发布产品",
            allProducts.filter((p) => p.status === "published" && !p.demo)
              .length,
            "不包含演示产品",
            LayoutGrid,
          ],
          ["产品曝光", impressions, "本浏览器 · 有效曝光", Eye],
          ["产品跳转", clicks, "主动访问独立产品", ArrowUpRight],
          [
            "曝光后跳转率",
            exposureConversion(events),
            "按会话与产品配对去重",
            BarChart3,
          ],
        ].map(([label, value, sub, I]) => {
          const Component = I as typeof Eye;
          return (
            <article className="stat-card" key={String(label)}>
              <span>
                {String(label)}
                <Component size={17} />
              </span>
              <strong>{String(value)}</strong>
              <small>{String(sub)}</small>
            </article>
          );
        })}
      </div>
      <div className="admin-dashboard-grid">
        <div className="admin-panel">
          <div className="panel-heading">
            <h2>近 7 天的访问</h2>
            <span>页面访问 · 本地记录</span>
          </div>
          <EventChart events={events} />
          <div className="chart-legend">
            <i />
            页面访问 <small>统计不会使用模拟数值</small>
          </div>
        </div>
        <div className="admin-panel">
          <div className="panel-heading">
            <h2>上线检查</h2>
            <span>接好每一个入口</span>
          </div>
          <div className="checklist">
            {[
              [
                "配置简历产品网址",
                !!allProducts.find((p) => p.id === "resume")?.targetUrl,
                "/admin/products/resume",
              ],
              [
                "配置面试产品网址",
                !!allProducts.find((p) => p.id === "interview")?.targetUrl,
                "/admin/products/interview",
              ],
              ["设置站点品牌", true, "/admin/settings"],
              ["开启本地行为记录", profile.analytics, "/settings/privacy"],
            ].map(([text, done, to]) => (
              <Link key={String(text)} to={String(to)}>
                <span className={done ? "check-circle done" : "check-circle"}>
                  {done ? <Check size={12} /> : null}
                </span>
                {String(text)}
                <ChevronRight size={14} />
              </Link>
            ))}
          </div>
          <p className="panel-note">真实链接配置后，前台会自动启用访问入口。</p>
        </div>
      </div>
      <div className="admin-dashboard-grid">
        <div className="admin-panel">
          <div className="panel-heading">
            <h2>重点产品</h2>
            <Link to="/admin/products">管理全部</Link>
          </div>
          {allProducts
            .filter((p) => !p.demo)
            .slice(0, 4)
            .map((p) => (
              <Link
                to={`/admin/products/${p.id}`}
                className="admin-product-row"
                key={p.id}
              >
                <ProductIcon product={p} />
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.tagline}</small>
                </div>
                <span className={`status-badge ${p.status}`}>
                  {statusLabels[p.status]}
                </span>
                <ChevronRight size={15} />
              </Link>
            ))}
        </div>
        <div className="admin-panel">
          <div className="panel-heading">
            <h2>最近操作</h2>
            <Link to="/admin/audit-logs">全部日志</Link>
          </div>
          {audit.length ? (
            audit.map((a) => (
              <div className="audit-mini" key={a.id}>
                <span className="audit-dot" />
                <div>
                  <strong>{a.action}</strong>
                  <small>{a.target}</small>
                </div>
                <time>
                  {new Date(a.occurredAt).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            ))
          ) : (
            <p className="panel-note">开始管理产品后，操作记录会显示在这里。</p>
          )}
        </div>
      </div>
    </>
  );
}
function EventChart({ events }: { events: Activity[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      key: d.toLocaleDateString("zh-CN"),
    };
  });
  const counts = days.map(
    (d) =>
      events.filter(
        (e) =>
          e.name === "page_viewed" &&
          new Date(e.occurredAt).toLocaleDateString("zh-CN") === d.key,
      ).length,
  );
  const max = Math.max(1, ...counts);
  return (
    <div
      className="event-chart"
      role="img"
      aria-label={`近七天页面访问：${counts.join("、")}`}
    >
      <div className="chart-y">
        <span>{max}</span>
        <span>{Math.floor(max / 2)}</span>
        <span>0</span>
      </div>
      <div className="chart-bars">
        {days.map((d, i) => (
          <div key={d.key} className="chart-column">
            <span className="chart-value">{counts[i]}</span>
            <div className="bar-track">
              <div style={{ height: `${(counts[i] / max) * 100}%` }} />
            </div>
            <span>{d.label}</span>
          </div>
        ))}
      </div>
      {!counts.some(Boolean) && (
        <div className="chart-empty">等待第一条真实访问记录</div>
      )}
    </div>
  );
}
export function AdminProducts() {
  const { allProducts, taxonomies, save, toast } = useApp();
  const [q, setQ] = useState(""),
    [status, setStatus] = useState("all"),
    [selected, setSelected] = useState<string[]>([]),
    [confirm, setConfirm] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const list = allProducts.filter(
    (p) =>
      `${p.name} ${p.tagline}`.toLowerCase().includes(q.toLowerCase()) &&
      (status === "all" ||
        (status === "demo" && p.demo) ||
        p.status === status),
  );
  async function duplicate(p: Product) {
    const id = uid();
    await save(
      "products",
      {
        ...p,
        id,
        name: p.name + " 副本",
        slug: `${p.slug}-${id.slice(0, 6)}`,
        status: "draft",
        createdAt: now(),
        updatedAt: now(),
      },
      "复制产品",
    );
    toast("产品已复制为草稿");
  }
  async function batch(next: Product["status"]) {
    for (const id of selected) {
      const p = allProducts.find((x) => x.id === id);
      if (p)
        await save(
          "products",
          { ...p, status: next, updatedAt: now() },
          "批量修改状态",
        );
    }
    setSelected([]);
    toast("产品状态已更新");
  }
  return (
    <>
      <AdminTitle
        eyebrow="PRODUCTS / 产品管理"
        title="让好产品，各就其位。"
        description={`${allProducts.filter((p) => !p.demo).length} 个正式产品 · ${allProducts.filter((p) => p.demo).length} 个开发演示产品`}
      >
        <button
          className="button secondary"
          onClick={() => downloadJson("next-products.json", allProducts)}
        >
          <Download size={16} />
          导出
        </button>
        <Link className="button" to="/admin/products/new">
          <Plus size={16} />
          新增产品
        </Link>
      </AdminTitle>
      <div className="admin-tabs">
        {[
          ["all", "全部产品"],
          ["published", "已发布"],
          ["draft", "草稿"],
          ["hidden", "已隐藏"],
          ["archived", "已归档"],
          ["demo", "演示数据"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={status === id ? "active" : ""}
            onClick={() => {
              setStatus(id);
              setPage(1);
            }}
          >
            {label}
            <span>
              {
                allProducts.filter(
                  (p) =>
                    id === "all" ||
                    (id === "demo" && p.demo) ||
                    p.status === id,
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="table-toolbar">
        <div className="table-search">
          <Search size={17} />
          <input
            placeholder="搜索产品名称或介绍…"
            aria-label="搜索后台产品"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <span>{list.length} 个结果</span>
        {selected.length > 0 && (
          <div className="bulk-actions">
            <span>已选 {selected.length}</span>
            <button onClick={() => void batch("published")}>发布</button>
            <button onClick={() => void batch("hidden")}>隐藏</button>
          </div>
        )}
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="选择当前结果"
                  checked={
                    list.length > 0 &&
                    list.every((p) => selected.includes(p.id))
                  }
                  onChange={(e) =>
                    setSelected(e.target.checked ? list.map((p) => p.id) : [])
                  }
                />
              </th>
              <th>产品</th>
              <th>分类</th>
              <th>状态</th>
              <th>访问链接</th>
              <th>最近更新</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.slice((page - 1) * 10, page * 10).map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`选择 ${p.name}`}
                    checked={selected.includes(p.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, p.id]
                          : selected.filter((x) => x !== p.id),
                      )
                    }
                  />
                </td>
                <td>
                  <Link
                    className="table-product"
                    to={`/admin/products/${p.id}`}
                  >
                    <ProductIcon product={p} />
                    <div>
                      <strong>
                        {p.name}
                        {p.demo && <em>演示</em>}
                      </strong>
                      <small>{p.slug}</small>
                    </div>
                  </Link>
                </td>
                <td>
                  {taxonomies.find((t) => t.id === p.category)?.name ??
                    p.category}
                </td>
                <td>
                  <span className={`status-badge ${p.status}`}>
                    {statusLabels[p.status]}
                  </span>
                </td>
                <td>
                  <span className={p.targetUrl ? "muted" : "warning-text"}>
                    {p.targetUrl ? "已配置" : "待配置"}
                  </span>
                </td>
                <td>{new Date(p.updatedAt).toLocaleDateString("zh-CN")}</td>
                <td>
                  <div className="row-actions">
                    <Link
                      className="icon-button"
                      aria-label={`编辑 ${p.name}`}
                      to={`/admin/products/${p.id}`}
                    >
                      <Pencil size={15} />
                    </Link>
                    <button
                      className="icon-button"
                      aria-label={`复制 ${p.name}`}
                      onClick={() => void duplicate(p)}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`归档 ${p.name}`}
                      onClick={() => setConfirm(p)}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <Empty title="没有匹配的产品" />}
      </div>
      <div className="table-pagination">
        <span>
          显示 {list.length ? Math.min((page - 1) * 10 + 1, list.length) : 0}–
          {Math.min(page * 10, list.length)} 条，共 {list.length} 条
        </span>
        <div>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            上一页
          </button>
          <span>{page}</span>
          <button
            disabled={page * 10 >= list.length}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </button>
        </div>
      </div>
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="归档这个产品？"
        description="归档后前台不再展示，已有记录会保留，之后可以恢复。"
      >
        <div className="modal-actions">
          <button className="button secondary" onClick={() => setConfirm(null)}>
            取消
          </button>
          <button
            className="button danger"
            onClick={() => {
              if (confirm)
                void save(
                  "products",
                  { ...confirm, status: "archived", updatedAt: now() },
                  "归档产品",
                ).then(() => setConfirm(null));
            }}
          >
            确认归档
          </button>
        </div>
      </Modal>
    </>
  );
}
export function ProductEditor() {
  const { id } = useParams();
  const { allProducts, taxonomies, save, toast } = useApp();
  const navigate = useNavigate();
  const existing = allProducts.find((p) => p.id === id);
  const [product, setProduct] = useState<Product>(
      () => existing ?? emptyProduct(),
    ),
    [tab, setTab] = useState("basic"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setProduct((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const parsed = productSchema.parse(product);
      if (allProducts.some((p) => p.id !== parsed.id && p.slug === parsed.slug))
        throw new Error("产品标识已存在，请换一个 Slug");
      if (parsed.targetUrl) safeTarget(parsed.targetUrl, parsed.allowedDomains);
      await save(
        "products",
        { ...parsed, updatedAt: now() },
        existing ? "编辑产品" : "创建产品",
      );
      setDirty(false);
      toast("产品已保存，前台同步更新");
      navigate("/admin/products");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  const field = (
    key: keyof Product,
    label: string,
    placeholder = "",
    multiline = false,
  ) => (
    <label key={key}>
      {label}
      {multiline ? (
        <textarea
          rows={4}
          value={String(product[key])}
          onChange={(e) => set(key, e.target.value as never)}
          placeholder={placeholder}
        />
      ) : (
        <input
          value={String(product[key])}
          onChange={(e) => set(key, e.target.value as never)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
  const arrayField = (
    key: "tags" | "roles" | "features" | "pros" | "cons" | "allowedDomains",
    label: string,
  ) => (
    <label>
      {label}
      <textarea
        rows={3}
        value={product[key].join("\n")}
        onChange={(e) => set(key, e.target.value.split("\n"))}
        placeholder="每行一项"
      />
    </label>
  );
  if (id && id !== "new" && !existing) return <Empty title="产品不存在" />;
  return (
    <form onSubmit={(e) => void submit(e)}>
      <AdminTitle
        eyebrow="PRODUCT EDITOR / 产品编辑"
        title={existing ? "编辑产品" : "让一个新产品，被看见。"}
        description="介绍、链接、分类和展示方式，都由这里管理。"
      >
        <Link className="button secondary" to="/admin/products">
          返回列表
        </Link>
        <button className="button" disabled={busy}>
          {busy ? "正在保存…" : "保存产品"}
        </button>
      </AdminTitle>
      <div className="editor-layout">
        <div>
          <div className="admin-tabs">
            {[
              ["basic", "基础信息"],
              ["content", "内容与评价"],
              ["link", "链接与归因"],
              ["display", "展示与发布"],
              ["seo", "SEO"],
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="admin-panel form editor-form">
            {tab === "basic" ? (
              <>
                <div className="form-grid">
                  {field("name", "产品名称", "例如 Magic Resume")}
                  {field("slug", "产品标识 Slug", "magic-resume")}
                </div>
                {field("tagline", "一句话介绍", "它为谁解决什么问题？")}
                {field(
                  "description",
                  "完整描述",
                  "清晰介绍产品价值、使用场景和边界。",
                  true,
                )}
                <div className="form-grid">
                  <label>
                    产品分类
                    <select
                      value={product.category}
                      onChange={(e) => set("category", e.target.value)}
                    >
                      {taxonomies
                        .filter((t) => t.kind === "category")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    求职阶段
                    <select
                      value={product.stage}
                      onChange={(e) => set("stage", e.target.value)}
                    >
                      {taxonomies
                        .filter((t) => t.kind === "stage")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                {arrayField("tags", "标签（每行一项）")}
                {field("audience", "适合人群")}
                {arrayField("roles", "目标岗位（每行一项）")}
              </>
            ) : tab === "content" ? (
              <>
                {arrayField("features", "主要功能")}
                {arrayField("pros", "产品优点")}
                {arrayField("cons", "局限与注意事项")}
                <div className="form-grid">
                  <label>
                    收费方式
                    <select
                      value={product.pricing}
                      onChange={(e) =>
                        set("pricing", e.target.value as Product["pricing"])
                      }
                    >
                      {Object.entries(pricingLabels).map(([k, v]) => (
                        <option value={k} key={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  {field("githubUrl", "开源仓库链接")}
                </div>
                <div className="checkbox-row">
                  {(
                    [
                      ["openSource", "开源产品"],
                      ["chinese", "支持中文"],
                      ["requiresAccount", "需要注册"],
                    ] as const
                  ).map(([key, label]) => (
                    <label className="check-label" key={key}>
                      <input
                        type="checkbox"
                        checked={product[key]}
                        onChange={(e) => set(key, e.target.checked)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </>
            ) : tab === "link" ? (
              <>
                {field("targetUrl", "独立产品网址", "https://your-product.com")}
                {arrayField(
                  "allowedDomains",
                  "允许的目标域名（精确匹配，不含协议）",
                )}
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => {
                    try {
                      set("allowedDomains", [
                        new URL(product.targetUrl).hostname,
                      ]);
                    } catch {
                      toast("先填写一个有效的网址");
                    }
                  }}
                >
                  从网址提取允许域名
                </button>
                <label>
                  产品归属
                  <select
                    value={product.ownership}
                    onChange={(e) =>
                      set("ownership", e.target.value as Product["ownership"])
                    }
                  >
                    <option value="first_party">自有产品</option>
                    <option value="partner">合作产品</option>
                    <option value="external">外部精选</option>
                  </select>
                </label>
                <label>
                  预期追踪模式
                  <select
                    value={product.tracking}
                    onChange={(e) =>
                      set("tracking", e.target.value as Product["tracking"])
                    }
                  >
                    <option value="outbound_only">仅外链点击</option>
                    <option value="shared_analytics">
                      自有产品共享分析（待服务端接入）
                    </option>
                    <option value="conversion_callback">
                      合作回调（待服务端接入）
                    </option>
                  </select>
                </label>
                <div className="callout">
                  <CircleHelp size={20} />
                  <p>
                    当前只记录本地曝光与跳转。签名回调、跨域身份关联与服务端重定向需要后端接入，本地不会生成虚假转化。
                  </p>
                </div>
              </>
            ) : tab === "display" ? (
              <>
                <div className="form-grid">
                  <label>
                    发布状态
                    <select
                      value={product.status}
                      onChange={(e) =>
                        set("status", e.target.value as Product["status"])
                      }
                    >
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    排序权重
                    <input
                      type="number"
                      value={product.order}
                      onChange={(e) => set("order", Number(e.target.value))}
                    />
                  </label>
                  <label>
                    产品阶段
                    <select
                      value={product.release}
                      onChange={(e) =>
                        set("release", e.target.value as Product["release"])
                      }
                    >
                      <option value="live">已上线</option>
                      <option value="beta">Beta</option>
                      <option value="planned">规划中</option>
                    </select>
                  </label>
                  <label>
                    辅助主题色
                    <input
                      type="color"
                      value={product.accent}
                      onChange={(e) => set("accent", e.target.value)}
                    />
                  </label>
                </div>
                <label>
                  产品图标
                  <select
                    value={product.icon}
                    onChange={(e) => set("icon", e.target.value)}
                  >
                    {[
                      "file",
                      "mic",
                      "code",
                      "network",
                      "briefcase",
                      "columns",
                      "chart",
                      "book",
                      "box",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  上传 Logo（PNG / JPEG / WebP，最大 2 MB）
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (
                        f.size > 2 * 1024 * 1024 ||
                        !["image/png", "image/jpeg", "image/webp"].includes(
                          f.type,
                        )
                      ) {
                        toast("请选择 2 MB 以内的 PNG、JPEG 或 WebP 图片");
                        return;
                      }
                      const r = new FileReader();
                      r.onload = () => set("logo", String(r.result));
                      r.readAsDataURL(f);
                    }}
                  />
                </label>
                <div className="checkbox-row">
                  {(
                    [
                      ["featured", "精选产品"],
                      ["detailEnabled", "显示详情页"],
                      ["demo", "演示数据"],
                      ["sponsored", "商业推荐"],
                    ] as const
                  ).map(([key, label]) => (
                    <label className="check-label" key={key}>
                      <input
                        type="checkbox"
                        checked={product[key]}
                        onChange={(e) => set(key, e.target.checked)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {product.status === "scheduled" && (
                  <label>
                    计划发布时间
                    <input
                      type="datetime-local"
                      value={product.scheduledAt}
                      onChange={(e) => set("scheduledAt", e.target.value)}
                    />
                    <small>
                      本地模式仅在页面打开时检查计划时间，后台定时任务待接入。
                    </small>
                  </label>
                )}
              </>
            ) : (
              <>
                {field("seoTitle", "页面标题")}
                {field(
                  "seoDescription",
                  "搜索摘要",
                  "用自然语言介绍这个产品。",
                  true,
                )}
                <div className="seo-preview">
                  <span>next.local / products / {product.slug}</span>
                  <h3>{product.seoTitle || product.name} · 下一程 NEXT</h3>
                  <p>{product.seoDescription || product.tagline}</p>
                </div>
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
        <aside className="editor-preview">
          <span className="eyebrow">LIVE PREVIEW / 预览</span>
          <div className="product-card">
            <ProductIcon product={product} />
            <h3>{product.name || "你的产品名称"}</h3>
            <p>{product.tagline || "在这里，用一句话说清产品价值。"}</p>
            <div className="tag-list">
              {product.tags.filter(Boolean).map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>
          </div>
          <div className="editor-status">
            <span className={`status-badge ${product.status}`}>
              {statusLabels[product.status]}
            </span>
            <span>{dirty ? "有未保存的修改" : "内容已同步"}</span>
          </div>
          <p>
            预览随编辑即时更新。点击保存后，产品库与首页推荐同步使用新内容。
          </p>
          {existing && (
            <Link
              className="text-link"
              target="_blank"
              to={`/products/${product.slug}`}
            >
              查看前台页面 <ArrowUpRight size={14} />
            </Link>
          )}
        </aside>
      </div>
    </form>
  );
}

export function AdminTaxonomies() {
  const { taxonomies, save, remove, allProducts, toast } = useApp();
  const [kind, setKind] = useState<Taxonomy["kind"]>("category"),
    [edit, setEdit] = useState<Taxonomy | null>(null),
    [deleting, setDeleting] = useState<Taxonomy | null>(null);
  const labels = {
    category: "产品分类",
    tag: "产品标签",
    stage: "求职阶段",
    role: "目标岗位",
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (edit) {
      await save("taxonomies", edit, "保存分类");
      setEdit(null);
      toast("分类配置已保存");
    }
  }
  return (
    <>
      <AdminTitle
        eyebrow="TAXONOMY / 内容结构"
        title="每个产品，都有合适的位置。"
        description="分类、标签、求职阶段与岗位，通过统一配置管理。"
      >
        <button
          className="button"
          onClick={() =>
            setEdit({
              id: uid(),
              name: "",
              kind,
              description: "",
              icon: "box",
              order: taxonomies.length,
            })
          }
        >
          <Plus size={17} />
          新增{labels[kind]}
        </button>
      </AdminTitle>
      <div className="admin-tabs">
        {Object.entries(labels).map(([id, label]) => (
          <button
            key={id}
            className={kind === id ? "active" : ""}
            onClick={() => setKind(id as Taxonomy["kind"])}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="taxonomy-admin-grid">
        {taxonomies
          .filter((t) => t.kind === kind)
          .map((t) => (
            <div className="admin-panel" key={t.id}>
              <div className="panel-heading">
                <h3>{t.name}</h3>
                <div>
                  <button
                    className="icon-button"
                    aria-label={`编辑 ${t.name}`}
                    onClick={() => setEdit({ ...t })}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`删除 ${t.name}`}
                    onClick={() => setDeleting(t)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p>{t.description || "可在编辑中添加说明。"}</p>
              <small>
                排序 {t.order} · {t.id.slice(0, 18)}
              </small>
            </div>
          ))}
      </div>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={`编辑${labels[kind]}`}
      >
        <form className="form" onSubmit={(e) => void submit(e)}>
          <label>
            名称
            <input
              required
              value={edit?.name ?? ""}
              onChange={(e) =>
                edit && setEdit({ ...edit, name: e.target.value })
              }
            />
          </label>
          <label>
            说明
            <textarea
              value={edit?.description ?? ""}
              onChange={(e) =>
                edit && setEdit({ ...edit, description: e.target.value })
              }
            />
          </label>
          <label>
            图标
            <select
              value={edit?.icon ?? "box"}
              onChange={(e) =>
                edit && setEdit({ ...edit, icon: e.target.value })
              }
            >
              {[
                "box",
                "file",
                "mic",
                "code",
                "network",
                "briefcase",
                "columns",
                "chart",
                "book",
              ].map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </label>
          <label>
            排序
            <input
              type="number"
              value={edit?.order ?? 0}
              onChange={(e) =>
                edit && setEdit({ ...edit, order: Number(e.target.value) })
              }
            />
          </label>
          <button className="button">保存</button>
        </form>
      </Modal>
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="删除这个分类项？"
        description="仍被产品引用的分类不能删除，请先调整相关产品。"
      >
        <button
          className="button danger"
          onClick={() => {
            if (!deleting) return;
            if (
              allProducts.some(
                (p) =>
                  p.category === deleting.id ||
                  p.stage === deleting.id ||
                  p.tags.includes(deleting.name) ||
                  p.roles.includes(deleting.name),
              )
            ) {
              toast("仍有产品使用这个分类项，请先调整产品");
              return;
            }
            void remove("taxonomies", deleting.id).then(() =>
              setDeleting(null),
            );
          }}
        >
          确认删除
        </button>
      </Modal>
    </>
  );
}
export function AdminCollections() {
  const { collections, allProducts, save, remove, toast } = useApp();
  const [edit, setEdit] = useState<Collection | null>(null),
    [deleting, setDeleting] = useState<Collection | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    if (collections.some((c) => c.id !== edit.id && c.slug === edit.slug)) {
      toast("合集标识已存在");
      return;
    }
    await save("collections", edit, "保存合集");
    setEdit(null);
    toast("合集已保存");
  }
  return (
    <>
      <AdminTitle
        eyebrow="COLLECTIONS / 精选合集"
        title="把好工具，连成一条路线。"
        description="编辑产品组合、使用顺序和每一步的说明。"
      >
        <button
          className="button"
          onClick={() =>
            setEdit({
              id: uid(),
              title: "",
              slug: "",
              description: "",
              eyebrow: "精选路线",
              color: "peach",
              productIds: [],
              steps: [],
              status: "draft",
              order: collections.length + 1,
            })
          }
        >
          <Plus size={17} />
          新建合集
        </button>
      </AdminTitle>
      <div className="collection-grid">
        {collections.map((c) => (
          <article key={c.id} className={`collection-card ${c.color}`}>
            <span className="eyebrow">
              {c.eyebrow} · {c.status === "published" ? "已发布" : "草稿"}
            </span>
            <h3>{c.title}</h3>
            <p>{c.description}</p>
            <div className="collection-meta">
              <span>{c.productIds.length} 个产品</span>
              <div className="row-actions">
                <button
                  className="button secondary small"
                  onClick={() => setEdit({ ...c })}
                >
                  编辑合集
                </button>
                <button
                  className="icon-button"
                  aria-label={`删除合集 ${c.title}`}
                  onClick={() => setDeleting(c)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="编排产品合集">
        <form className="form" onSubmit={(e) => void submit(e)}>
          {(["title", "slug", "eyebrow", "description"] as const).map(
            (key, i) => (
              <label key={key}>
                {["合集名称", "唯一标识", "适用人群标签", "合集说明"][i]}
                <input
                  required
                  value={edit?.[key] ?? ""}
                  pattern={key === "slug" ? "[a-z0-9-]+" : undefined}
                  onChange={(e) =>
                    edit && setEdit({ ...edit, [key]: e.target.value })
                  }
                />
              </label>
            ),
          )}
          <label>
            产品顺序（点击选择，按选择顺序排列）
            <div className="product-picker">
              {allProducts.map((p) => (
                <label className="check-label" key={p.id}>
                  <input
                    type="checkbox"
                    checked={edit?.productIds.includes(p.id) ?? false}
                    onChange={(e) =>
                      edit &&
                      setEdit({
                        ...edit,
                        productIds: e.target.checked
                          ? [...edit.productIds, p.id]
                          : edit.productIds.filter((id) => id !== p.id),
                      })
                    }
                  />
                  {p.name}
                  {p.demo ? "（演示）" : ""}
                </label>
              ))}
            </div>
          </label>
          <label>
            步骤说明（每行对应一个产品）
            <textarea
              rows={4}
              value={edit?.steps.join("\n") ?? ""}
              onChange={(e) =>
                edit && setEdit({ ...edit, steps: e.target.value.split("\n") })
              }
            />
          </label>
          <div className="form-grid">
            <label>
              状态
              <select
                value={edit?.status ?? "draft"}
                onChange={(e) =>
                  edit &&
                  setEdit({
                    ...edit,
                    status: e.target.value as Collection["status"],
                  })
                }
              >
                <option value="draft">草稿</option>
                <option value="published">发布</option>
              </select>
            </label>
            <label>
              展示色
              <select
                value={edit?.color ?? "peach"}
                onChange={(e) =>
                  edit && setEdit({ ...edit, color: e.target.value })
                }
              >
                {["peach", "green", "lavender", "blue"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <button className="button">保存合集</button>
        </form>
      </Modal>
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="删除合集？"
        description="产品本身不会被删除。"
      >
        <button
          className="button danger"
          onClick={() => {
            if (deleting)
              void remove("collections", deleting.id).then(() =>
                setDeleting(null),
              );
          }}
        >
          确认删除
        </button>
      </Modal>
    </>
  );
}
export function AdminPlacements() {
  const { placements, allProducts, save, toast } = useApp();
  const [edit, setEdit] = useState<Placement | null>(null);
  return (
    <>
      <AdminTitle
        eyebrow="PLACEMENTS / 推荐与编排"
        title="把重要的产品，放在对的位置。"
        description="首页核心产品和工具箱由推荐位驱动。选择产品的顺序就是展示顺序。"
      />
      <div className="taxonomy-admin-grid">
        {placements.map((p) => (
          <div className="admin-panel" key={p.id}>
            <div className="panel-heading">
              <h2>{p.name}</h2>
              <input
                type="checkbox"
                aria-label={`启用 ${p.name}`}
                checked={p.enabled}
                onChange={(e) =>
                  void save(
                    "placements",
                    { ...p, enabled: e.target.checked },
                    "切换推荐位",
                  )
                }
              />
            </div>
            <h3>{p.title}</h3>
            <div className="placement-products">
              {p.productIds.map((id, i) => {
                const item = allProducts.find((x) => x.id === id);
                return item ? (
                  <div key={id}>
                    <span>{i + 1}</span>
                    <ProductIcon product={item} />
                    {item.name}
                  </div>
                ) : null;
              })}
            </div>
            <button
              className="button secondary small"
              onClick={() => setEdit({ ...p })}
            >
              <SlidersHorizontal size={15} />
              编辑推荐位
            </button>
          </div>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="编排推荐位">
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (edit)
              void save("placements", edit, "编辑推荐位").then(() => {
                setEdit(null);
                toast("推荐位已更新");
              });
          }}
        >
          <label>
            模块标题
            <input
              required
              value={edit?.title ?? ""}
              onChange={(e) =>
                edit && setEdit({ ...edit, title: e.target.value })
              }
            />
          </label>
          <label>
            选择产品（按勾选顺序）
            <div className="product-picker">
              {allProducts
                .filter((p) => p.status === "published")
                .map((p) => (
                  <label className="check-label" key={p.id}>
                    <input
                      type="checkbox"
                      checked={edit?.productIds.includes(p.id) ?? false}
                      onChange={(e) =>
                        edit &&
                        setEdit({
                          ...edit,
                          productIds: e.target.checked
                            ? [...edit.productIds, p.id]
                            : edit.productIds.filter((id) => id !== p.id),
                        })
                      }
                    />
                    {p.name}
                  </label>
                ))}
            </div>
          </label>
          <button className="button">保存编排</button>
        </form>
      </Modal>
    </>
  );
}
export function AdminAnalytics() {
  const { allProducts, profile } = useApp();
  const events = useEvents();
  const [range, setRange] = useState(7);
  const start = Date.now() - range * 86400000;
  const filtered = events.filter((e) => Date.parse(e.occurredAt) >= start);
  const count = (name: string, id?: string) =>
    filtered.filter((e) => e.name === name && (!id || e.productId === id))
      .length;
  const sessions = new Set(filtered.map((e) => e.sessionId)).size;
  const visits = count("page_viewed"),
    launches = count("product_outbound_redirected"),
    impressions = count("product_impression");
  return (
    <>
      <AdminTitle
        eyebrow="ANALYTICS / 数据分析"
        title="看见真实的使用，做出更好的选择。"
        description="所有指标来自本浏览器事件；没有数据时显示空状态，不生成模拟趋势。"
      >
        <select
          className="standalone-select"
          aria-label="统计时间范围"
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
        >
          <option value={7}>近 7 天</option>
          <option value={30}>近 30 天</option>
          <option value={90}>近 90 天</option>
        </select>
        <button
          className="button secondary"
          onClick={() => downloadJson("next-events.json", filtered)}
        >
          <Download size={16} />
          导出事件
        </button>
      </AdminTitle>
      <div className="local-banner">
        <span>
          <Shield size={17} />
          本地分析{profile.analytics ? "已开启" : "未开启"} · 非全站统计 ·
          不推测第三方使用情况
        </span>
        <Link to="/settings/privacy">管理同意设置</Link>
      </div>
      <div className="stat-grid">
        {[
          ["页面访问", visits, "page_viewed"],
          ["本地会话", sessions, "每次打开页面独立计算"],
          ["产品跳转", launches, "主动继续访问"],
          ["有效曝光", impressions, "50% 可见，持续 1 秒"],
        ].map(([l, v, s]) => (
          <article className="stat-card" key={String(l)}>
            <span>{l}</span>
            <strong>{v}</strong>
            <small>{s}</small>
          </article>
        ))}
      </div>
      <div className="admin-panel">
        <div className="panel-heading">
          <h2>访问趋势</h2>
          <span>最近 7 天</span>
        </div>
        <EventChart events={filtered} />
      </div>
      <div className="admin-panel">
        <div className="panel-heading">
          <h2>产品表现</h2>
          <span>按产品区分曝光、详情与跳转</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>产品</th>
                <th>曝光</th>
                <th>详情访问</th>
                <th>外链跳转</th>
                <th title="按会话与产品配对去重，仅统计曝光之后的跳转">
                  曝光后跳转率
                </th>
                <th>到达 / 核心动作</th>
              </tr>
            </thead>
            <tbody>
              {allProducts
                .filter((p) => !p.demo)
                .map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{count("product_impression", p.id)}</td>
                    <td>{count("product_detail_viewed", p.id)}</td>
                    <td>{count("product_outbound_redirected", p.id)}</td>
                    <td>{exposureConversion(filtered, p.id)}</td>
                    <td>未接入回传</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="admin-dashboard-grid">
        <div className="admin-panel">
          <div className="panel-heading">
            <h2>发现路径</h2>
            <span>事件量，非唯一用户漏斗</span>
          </div>
          <div className="funnel">
            {[
              ["访问页面", visits],
              ["有效曝光", impressions],
              ["查看详情", count("product_detail_viewed")],
              ["创建跳转", count("product_launch_created")],
              ["继续访问", launches],
            ].map(([l, v]) => (
              <div key={String(l)}>
                <span>{l}</span>
                <div>
                  <i
                    style={{
                      width: `${(Number(v) / Math.max(1, visits, impressions)) * 100}%`,
                    }}
                  />
                </div>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="admin-panel">
          <div className="panel-heading">
            <h2>搜索与未满足的需求</h2>
            <span>近期搜索</span>
          </div>
          {filtered
            .filter(
              (e) =>
                e.name === "search_performed" || e.name === "search_no_result",
            )
            .slice(-8)
            .reverse()
            .map((e) => (
              <div className="simple-row" key={e.id}>
                <span>{e.query}</span>
                <span className="muted">
                  {e.name === "search_no_result" ? "无结果" : "有结果"}
                </span>
              </div>
            ))}
          {!filtered.some((e) => e.name.startsWith("search_")) && (
            <p className="panel-note">还没有搜索记录。</p>
          )}
        </div>
      </div>
      <div className="admin-panel">
        <div className="panel-heading">
          <h2>事件调试</h2>
          <span>最近 30 条 · 不含敏感正文</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>事件</th>
                <th>页面</th>
                <th>产品 / 推荐位</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice(-30)
                .reverse()
                .map((e) => (
                  <tr key={e.id}>
                    <td>
                      <code>{e.name}</code>
                    </td>
                    <td>{e.path}</td>
                    <td>
                      {e.productId ?? "—"} / {e.placement ?? "—"}
                    </td>
                    <td>
                      {new Date(e.occurredAt).toLocaleTimeString("zh-CN")}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty
            title="等待第一条真实事件"
            description="在隐私设置中允许本地分析，然后浏览产品、搜索或访问独立产品。"
          />
        )}
      </div>
    </>
  );
}
export function AdminSubmissions() {
  const { save, toast } = useApp();
  const [items, setItems] = useState<Submission[]>([]),
    [filter, setFilter] = useState("all");
  useEffect(() => {
    repository.list("submissions").then(setItems);
  }, []);
  async function review(item: Submission, status: Submission["status"]) {
    await save("submissions", { ...item, status }, "审核提交");
    setItems(items.map((i) => (i.id === item.id ? { ...i, status } : i)));
    toast("审核状态已保存");
  }
  return (
    <>
      <AdminTitle
        eyebrow="INBOX / 提交与反馈"
        title="每条建议，都值得听见。"
        description="产品推荐、用户反馈与认领申请。当前收件箱仅包含本浏览器提交。"
      />
      <div className="admin-tabs">
        {[
          ["all", "全部"],
          ["product", "产品推荐"],
          ["feedback", "意见反馈"],
          ["claim", "认领申请"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={filter === id ? "active" : ""}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {items.filter((i) => filter === "all" || i.kind === filter).length ? (
        items
          .filter((i) => filter === "all" || i.kind === filter)
          .map((i) => (
            <article className="admin-panel submission" key={i.id}>
              <div className="panel-heading">
                <h2>{i.name}</h2>
                <span className="status-badge">
                  {
                    {
                      pending: "待审核",
                      approved: "已通过",
                      rejected: "已拒绝",
                    }[i.status]
                  }
                </span>
              </div>
              <p>{i.description}</p>
              {i.url && <code>{i.url}</code>}
              <div className="modal-actions">
                <small>{new Date(i.createdAt).toLocaleString("zh-CN")}</small>
                <button
                  className="button secondary small"
                  onClick={() => void review(i, "rejected")}
                >
                  拒绝
                </button>
                <button
                  className="button small"
                  onClick={() => void review(i, "approved")}
                >
                  标记通过
                </button>
              </div>
            </article>
          ))
      ) : (
        <Empty
          title="收件箱暂时很安静"
          description="产品推荐、反馈与认领申请会出现在这里。"
        >
          <Link className="button secondary" to="/submit">
            体验提交流程
          </Link>
        </Empty>
      )}
    </>
  );
}
export function AdminAudit() {
  const [items, setItems] = useState<Audit[]>([]);
  useEffect(() => {
    repository
      .list("audit")
      .then((v) =>
        setItems(v.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))),
      );
  }, []);
  return (
    <>
      <AdminTitle
        eyebrow="AUDIT LOG / 操作记录"
        title="每一次调整，都有迹可循。"
        description="本地记录关键管理操作。接入后端后需替换为不可由客户端篡改的审计日志。"
      />
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>操作</th>
              <th>对象</th>
              <th>操作者</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.action}</td>
                <td>{i.target}</td>
                <td>{i.actor}</td>
                <td>{new Date(i.occurredAt).toLocaleString("zh-CN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export function AdminLinkHealth() {
  const { allProducts, save, toast } = useApp();
  async function check(p: Product) {
    try {
      safeTarget(p.targetUrl, p.allowedDomains);
      await save(
        "products",
        { ...p, health: "unknown", verifiedAt: now() },
        "检查链接格式",
      );
      toast("链接格式与域名有效；网络健康需服务端检查");
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return (
    <>
      <AdminTitle
        eyebrow="LINK HEALTH / 链接状态"
        title="每一个入口，都值得维护。"
        description="本地可验证地址格式和允许域名。DNS、TLS、跨域网络可用性无法可靠在浏览器中检测。"
      />
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>产品</th>
              <th>目标链接</th>
              <th>网络状态</th>
              <th>最近格式验证</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {allProducts
              .filter((p) => !p.demo)
              .map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.targetUrl || "待配置"}</td>
                  <td>尚未进行服务端验证</td>
                  <td>
                    {p.verifiedAt
                      ? new Date(p.verifiedAt).toLocaleString("zh-CN")
                      : "—"}
                  </td>
                  <td>
                    <button
                      className="button secondary small"
                      onClick={() => void check(p)}
                    >
                      验证格式
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export function AdminSiteSettings() {
  const { settings, save, refresh, toast } = useApp();
  const [form, setForm] = useState(settings),
    [backup, setBackup] = useState<unknown>(null),
    [error, setError] = useState("");
  return (
    <>
      <AdminTitle
        eyebrow="SITE SETTINGS / 站点设置"
        title="把下一程，做成你的样子。"
        description="品牌设置、演示数据、备份与迁移。所有数据当前保存在本浏览器。"
      />
      <div className="settings-card form">
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            void save("settings", form, "保存站点设置").then(() =>
              toast("站点设置已保存"),
            );
          }}
        >
          <div className="form-grid">
            <label>
              品牌中文名
              <input
                required
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </label>
            <label>
              品牌短句
              <input
                required
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              />
            </label>
          </div>
          <div className="setting-row">
            <div>
              <h3>显示演示产品</h3>
              <p>
                将 20 个带有演示标识的测试产品加入前台，用于验证规模和筛选。
              </p>
            </div>
            <input
              aria-label="显示演示产品"
              type="checkbox"
              checked={form.showDemos}
              onChange={(e) =>
                setForm({ ...form, showDemos: e.target.checked })
              }
            />
          </div>
          <button className="button">保存站点配置</button>
        </form>
        <div className="setting-row">
          <div>
            <h3>导出完整数据</h3>
            <p>
              包含产品、分类、收藏、分析事件和本地访问口令摘要。请保管备份。
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() => {
              void repository
                .exportData()
                .then((b) => downloadJson("next-complete-backup.json", b));
            }}
          >
            <Download size={16} />
            导出备份
          </button>
        </div>
        <div className="setting-row">
          <div>
            <h3>从备份恢复</h3>
            <p>恢复将覆盖当前浏览器全部站点数据。会先验证格式，再二次确认。</p>
          </div>
          <label className="button secondary">
            <Upload size={16} />
            选择备份
            <input
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f)
                  void f.text().then((t) => {
                    try {
                      setBackup(JSON.parse(t));
                      setError("");
                    } catch {
                      setError("无法读取 JSON 备份");
                    }
                  });
              }}
            />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="callout">
          <Shield size={21} />
          <p>
            更换浏览器、设备或网站端口会使用不同的本地数据库。清除浏览器站点数据会删除全部记录。迁移接口与中文说明位于项目的
            src/storage/README.md。
          </p>
        </div>
      </div>
      <Modal
        open={backup !== null}
        onClose={() => setBackup(null)}
        title="用备份覆盖当前数据？"
        description="当前本地资料、产品和事件将被替换。请确保已经导出当前数据。"
      >
        <div className="modal-actions">
          <button className="button secondary" onClick={() => setBackup(null)}>
            取消
          </button>
          <button
            className="button danger"
            onClick={() => {
              void repository
                .importData(backup)
                .then(refresh)
                .then(async () => {
                  setBackup(null);
                  const restored = await repository.get("settings", "site");
                  if (restored) setForm(restored);
                  toast("备份已恢复");
                })
                .catch((e) => {
                  setBackup(null);
                  setError((e as Error).message);
                });
            }}
          >
            确认恢复
          </button>
        </div>
      </Modal>
    </>
  );
}
export function AdminUsers() {
  const { profile } = useApp();
  return (
    <>
      <AdminTitle
        eyebrow="ACCESS / 用户与权限"
        title="清楚知道，谁能做什么。"
        description="当前只有本地个人资料与运营入口。线上注册、RBAC 和多用户隔离将在后端选型后接入。"
      />
      <div className="admin-panel">
        <div className="panel-heading">
          <h2>当前设备用户</h2>
          <span>1 个本地资料</span>
        </div>
        <div className="admin-product-row">
          <span className="avatar">{profile.name[0]}</span>
          <div>
            <strong>{profile.name}</strong>
            <small>
              {profile.role} · {profile.stage}
            </small>
          </div>
          <span className="status-badge">本地资料</span>
        </div>
      </div>
      <div className="admin-panel">
        <h2>权限接入规划</h2>
        <div className="permission-list">
          {[
            ["超级管理员", "站点设置、数据导入导出、权限配置"],
            ["运营管理员", "产品、分类、合集、推荐位管理"],
            ["内容编辑", "产品和合集草稿编辑"],
            ["数据分析师", "只读分析与事件导出"],
            ["审核人员", "产品提交与认领审核"],
            ["产品所有者", "仅提交其认领产品的修改"],
          ].map(([r, d]) => (
            <div key={r}>
              <strong>{r}</strong>
              <span>{d}</span>
              <small>待服务端接入</small>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
const recordKinds: Record<
  string,
  { title: string; description: string; labels: string[] }
> = {
  commercial: {
    title: "商业合作，透明可见。",
    description:
      "登记合作关系和活动。真实支付、佣金结算及服务端回传需接入后启用。",
    labels: ["合作产品或活动", "披露说明", "合作链接"],
  },
  experiments: {
    title: "每个想法，都值得验证。",
    description:
      "记录实验方案与启停配置。当前作为运营配置保存，自动分流与统计显著性计算尚未接入。",
    labels: ["实验名称", "假设与指标", "变体说明"],
  },
  relationships: {
    title: "让产品之间，产生连接。",
    description: "保存产品关系的编辑说明，为后续推荐与接入提供清晰记录。",
    labels: ["关系名称", "关联说明", "产品 ID（逗号分隔）"],
  },
  seo: {
    title: "让合适的人，找到好产品。",
    description:
      "管理页面 SEO 编辑说明。产品标题和摘要请在具体产品编辑页配置。",
    labels: ["页面路径", "搜索摘要", "页面标题"],
  },
  "feature-flags": {
    title: "有序启用每一个能力。",
    description: "记录功能开关，待对应功能接入后生效。",
    labels: ["功能名称", "启用条件", "配置值"],
  },
};
export function AdminRecords() {
  const kind = useLocation().pathname.split("/").pop() ?? "commercial";
  const spec = recordKinds[kind] ?? recordKinds.experiments;
  const [records, setRecords] = useState<RecordNote[]>([]),
    [edit, setEdit] = useState<RecordNote | null>(null);
  const { save, toast } = useApp();
  useEffect(() => {
    repository
      .list("records")
      .then((r) => setRecords(r.filter((x) => x.kind === kind)));
  }, [kind]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    await save("records", edit, "保存运营配置");
    setRecords((prev) => [...prev.filter((r) => r.id !== edit.id), edit]);
    setEdit(null);
    toast("配置已保存");
  }
  return (
    <>
      <AdminTitle
        eyebrow="OPERATIONS / 运营配置"
        title={spec.title}
        description={spec.description}
      >
        <button
          className="button"
          onClick={() =>
            setEdit({
              id: uid(),
              kind,
              title: "",
              description: "",
              value: "",
              enabled: false,
              createdAt: now(),
            })
          }
        >
          <Plus size={16} />
          新增配置
        </button>
      </AdminTitle>
      {records.length ? (
        <div className="taxonomy-admin-grid">
          {records.map((r) => (
            <div className="admin-panel" key={r.id}>
              <div className="panel-heading">
                <h2>{r.title}</h2>
                <span className="status-badge">
                  {r.enabled ? "已启用配置" : "草稿配置"}
                </span>
              </div>
              <p>{r.description}</p>
              <code>{r.value}</code>
              <button
                className="button secondary small"
                onClick={() => setEdit({ ...r })}
              >
                编辑配置
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="从一项明确的计划开始"
          description="新增配置后可在这里查看和编辑。"
        />
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="运营配置">
        <form className="form" onSubmit={(e) => void submit(e)}>
          {(["title", "description", "value"] as const).map((key, i) => (
            <label key={key}>
              {spec.labels[i]}
              <textarea
                required
                value={edit?.[key] ?? ""}
                onChange={(e) =>
                  edit && setEdit({ ...edit, [key]: e.target.value })
                }
              />
            </label>
          ))}
          <label className="check-label">
            <input
              type="checkbox"
              checked={edit?.enabled ?? false}
              onChange={(e) =>
                edit && setEdit({ ...edit, enabled: e.target.checked })
              }
            />
            启用配置记录
          </label>
          <button className="button">保存配置</button>
        </form>
      </Modal>
    </>
  );
}
export function AdminNotifications() {
  const { save, toast } = useApp();
  const [title, setTitle] = useState(""),
    [content, setContent] = useState("");
  return (
    <>
      <AdminTitle
        eyebrow="NOTIFICATIONS / 消息管理"
        title="把值得知道的更新，送到工作台。"
        description="当前消息发布到本浏览器的通知中心，不发送邮件或推送。"
      />
      <form
        className="form settings-card"
        onSubmit={(e) => {
          e.preventDefault();
          void save(
            "notices",
            { id: uid(), title, content, read: false, createdAt: now() },
            "发布本地通知",
          ).then(() => {
            setTitle("");
            setContent("");
            toast("通知已发布");
          });
        }}
      >
        <label>
          通知标题
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          通知内容
          <textarea
            rows={5}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        <button className="button">发布到本地通知中心</button>
        <Link to="/notifications" className="text-link">
          查看通知中心
        </Link>
      </form>
    </>
  );
}
