import { useEffect, useState, type FormEvent } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  Check,
  Eye,
  Save,
} from "lucide-react";
import { useApp } from "../app/context";
import {
  homeContent,
  homeModules,
  homeSections,
  directionGroups,
} from "../domain/home-config";
import { homeContentSchema, type HomeContent } from "../domain/content";
import { campusDirections } from "../domain/campus";
import { emptyProduct, now, uid } from "../domain/seed";
import {
  productSchema,
  statusLabels,
  type Product,
  type RecordNote,
} from "../domain/models";
import { safeTarget } from "../domain/security";
import { repository } from "../storage";
import { currentAdmin, serverMode } from "../storage/http";
import { AdminTitle, AdminAudit, AdminUsers } from "./admin";
import { ImageField } from "./admin-server";
import { NavigationEditor } from "./admin-layout-editor";
import { downloadJson } from "./workspace";
import images from "../domain/image-manifest.json";

export function SimpleHomepage() {
  const { settings, products, allProducts, placements, save, toast } = useApp();
  const [content, setContent] = useState(() =>
    homeContent(settings, products, placements),
  );
  const [modules, setModules] = useState(() =>
    homeModules(settings, placements),
  );
  const [active, setActive] = useState("featured"),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [versions, setVersions] = useState<RecordNote[]>([]);
  useEffect(() => {
    void repository
      .list("records")
      .then((rows) =>
        setVersions(
          rows
            .filter((r) => r.kind === "homepage-content-version")
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      )
      .catch(() => {});
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const directions = directionGroups(products, placements, content);
  const groups = directions.filter((d) => d.id.startsWith("career-"));
  function change(patch: Partial<HomeContent>) {
    setContent((c) => ({ ...c, ...patch }));
    setDirty(true);
    setError("");
  }
  function cardChange(
    id: string,
    patch: Partial<HomeContent["cards"][number]>,
  ) {
    change({
      cards: content.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  }
  function move(index: number, by: number) {
    const next = [...modules];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    setModules(next.map((m, i) => ({ ...m, order: i + 1 })));
    setDirty(true);
  }
  const textField = (
    key: Exclude<keyof HomeContent, "cards">,
    label: string,
    multiline = false,
  ) => (
    <label>
      {label}
      {multiline ? (
        <textarea
          aria-label={label}
          value={content[key]}
          maxLength={400}
          onChange={(e) => change({ [key]: e.target.value })}
        />
      ) : (
        <input
          aria-label={label}
          value={content[key]}
          maxLength={400}
          onChange={(e) => change({ [key]: e.target.value })}
        />
      )}
    </label>
  );
  async function publish() {
    setBusy(true);
    setError("");
    try {
      const parsed = homeContentSchema.parse(content),
        latest = (await repository.get("settings", "site")) ?? settings;
      const snapshot: RecordNote = {
        id: uid(),
        kind: "homepage-content-version",
        title: "首页发布前快照",
        description: "图文、顺序和显示状态",
        enabled: false,
        value: JSON.stringify({
          homeContent: homeContent(latest, products, placements),
          homeModules: homeModules(latest, placements),
        }),
        createdAt: now(),
      };
      await save("records", snapshot, "保留首页版本");
      await save(
        "settings",
        {
          ...latest,
          homeContent: parsed,
          homeModules: modules.map((m, i) => ({ ...m, order: i + 1 })),
        },
        "发布首页",
      );
      setVersions((v) => [snapshot, ...v]);
      setDirty(false);
      toast("首页已发布，前台同步更新");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function cardEditor(id: string) {
    const card = content.cards.find((c) => c.id === id)!;
    const direction = directions.find((d) => d.id === id)!;
    const preset = images[id as keyof typeof images];
    return (
      <details className="home-card-editor" key={id}>
        <summary>
          <img src={card.image || preset.webp[0].src} alt="" />
          <div>
            <strong>{card.title}</strong>
            <small>
              {direction.products.length} 款已发布工具 ·{" "}
              {card.productIds === undefined ? "自动收录" : "手动收录"}
            </small>
          </div>
          <span>编辑方向</span>
        </summary>
        <div className="form">
          <label>
            方向名称
            <input
              aria-label={`${id}方向名称`}
              value={card.title}
              onChange={(e) => cardChange(id, { title: e.target.value })}
            />
          </label>
          <label>
            方向介绍
            <textarea
              aria-label={`${id}方向介绍`}
              value={card.description}
              onChange={(e) => cardChange(id, { description: e.target.value })}
            />
            <small>
              描述这个方向能解决什么问题，不填写某个具体产品的宣传语。首页与合集页共用。
            </small>
          </label>
          <ImageField
            value={card.image}
            onChange={(image) => cardChange(id, { image })}
          />
          <label>
            图片描述
            <input
              value={card.alt}
              onChange={(e) => cardChange(id, { alt: e.target.value })}
            />
          </label>
          <div className="home-binding-note">
            <span>首页方向入口 → 产品合集 → 独立产品</span>
            <Link to={`/directions/${id}`} target="_blank">
              查看已发布合集 <ArrowUpRight size={13} />
            </Link>
          </div>
          <label>
            合集收录方式
            <select
              aria-label={`${id}收录方式`}
              value={card.productIds === undefined ? "auto" : "manual"}
              onChange={(e) =>
                cardChange(id, {
                  productIds:
                    e.target.value === "auto"
                      ? undefined
                      : direction.products.map((p) => p.id),
                })
              }
            >
              <option value="auto">自动收录：按产品分类 / 求职阶段</option>
              <option value="manual">手动选择：一个方向可收录多个产品</option>
            </select>
          </label>
          {card.productIds === undefined ? (
            <div className="home-binding-note">
              <span>
                自动收录本方向的已发布产品。新增符合条件的产品后，这里会自动更新。
              </span>
              <Link to="/admin/products">管理产品</Link>
            </div>
          ) : (
            <fieldset className="direction-product-picker">
              <legend>选择合集产品（可多选）</legend>
              {allProducts
                .filter((p) => !p.demo)
                .map((p) => (
                  <label key={p.id}>
                    <input
                      type="checkbox"
                      checked={card.productIds!.includes(p.id)}
                      aria-label={`${id}收录 ${p.name}`}
                      onChange={(e) =>
                        cardChange(id, {
                          productIds: e.target.checked
                            ? [...card.productIds!, p.id]
                            : card.productIds!.filter((x) => x !== p.id),
                        })
                      }
                    />
                    <span>
                      {p.name}
                      <small>
                        {p.status !== "published" || p.release === "planned"
                          ? "未上线，访客不可见"
                          : "已发布"}
                      </small>
                    </span>
                    <Link to={`/admin/products/${p.id}`}>编辑产品</Link>
                  </label>
                ))}
              {card.productIds
                .filter((id) => !allProducts.some((p) => p.id === id))
                .map((missing) => (
                  <div className="home-binding-note" key={missing}>
                    <span>原收录产品已删除</span>
                    <button
                      className="text-link"
                      onClick={() =>
                        cardChange(id, {
                          productIds: card.productIds!.filter(
                            (x) => x !== missing,
                          ),
                        })
                      }
                    >
                      移除失效关联
                    </button>
                  </div>
                ))}
              {!allProducts.some((p) => !p.demo) && (
                <p>还没有产品，先去产品管理新增。</p>
              )}
            </fieldset>
          )}
          <p className="panel-note">
            当前访客可见 {direction.products.length} 款工具
            {direction.products.length
              ? `：${direction.products.map((p) => p.name).join("、")}`
              : "；首页保留方向入口，合集页显示「敬请期待」"}
            。未发布、已归档和筹备中产品不会出现在合集。
          </p>
        </div>
      </details>
    );
  }

  return (
    <>
      <AdminTitle
        title="首页管理"
        eyebrow="HOME / 与前台一一对应"
        description="按首页实际区域编辑。方向图文、合集产品和模块顺序，在这里统一发布。"
      >
        <a
          className="button secondary"
          href={`/#${active}`}
          target="_blank"
          rel="noreferrer"
        >
          <Eye size={16} />
          查看线上区域
        </a>
      </AdminTitle>
      <div className="home-editor-status">
        <span>
          <i className="local-indicator" />
          {serverMode ? "服务器数据" : "本地数据"}
        </span>
        <span>
          {modules.filter((m) => m.enabled).length} 个区域显示 ·{" "}
          {products.filter((p) => !p.demo).length} 个已发布产品
        </span>
        <strong>{dirty ? "有未发布修改" : "与已保存配置一致"}</strong>
      </div>
      <div className="home-workbench">
        <aside className="home-outline">
          <h2>首页从上到下</h2>
          {modules.map((module, index) => (
            <div
              className={`home-outline-row ${active === module.id ? "selected" : ""}`}
              key={module.id}
            >
              <button
                className="home-select-section"
                onClick={() => setActive(module.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{module.label}</strong>
                  <small>{module.enabled ? "正在显示" : "已隐藏"}</small>
                </div>
              </button>
              <div className="home-outline-controls">
                <label>
                  <input
                    type="checkbox"
                    aria-label={`显示${module.label}`}
                    checked={module.enabled}
                    onChange={(e) => {
                      setModules(
                        modules.map((m) =>
                          m.id === module.id
                            ? { ...m, enabled: e.target.checked }
                            : m,
                        ),
                      );
                      setDirty(true);
                    }}
                  />
                  显示
                </label>
                <button
                  className="icon-button"
                  disabled={!index}
                  aria-label={`上移${module.label}`}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  className="icon-button"
                  disabled={index === modules.length - 1}
                  aria-label={`下移${module.label}`}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </div>
          ))}
          <p>这里只控制首页。站点顶部导航在「系统设置」中管理。</p>
        </aside>
        <section className="home-section-editor">
          <div className="home-section-heading">
            <span className="eyebrow">编辑当前区域</span>
            <h2>{homeSections.find((s) => s.id === active)?.label}</h2>
            <p>{homeSections.find((s) => s.id === active)?.hint}</p>
            {!modules.find((m) => m.id === active)?.enabled && (
              <p className="home-hidden-note">
                此区域已隐藏；内容会保留，勾选「显示」并发布后才能在前台看到。
              </p>
            )}
          </div>
          {active === "stages" ? (
            <div className="form">
              <p>
                五个方向名称与首页漫画、对应的工具合集共用，避免出现多套不同的标题。
              </p>
              <div className="home-stage-preview">
                {groups.map((g) => (
                  <span key={g.id}>
                    {content.cards.find((c) => c.id === g.id)?.title}
                  </span>
                ))}
              </div>
              <button
                className="button secondary"
                onClick={() => setActive("featured")}
              >
                编辑对应卡片
              </button>
            </div>
          ) : active === "featured" ? (
            <div className="form">
              {textField("journeyTitle", "求职区标题")}
              <p className="panel-note">
                每张漫画代表一个方向。编辑方向图文，并选择合集里的多个产品；产品名称、网址和发布状态在产品管理维护。
              </p>
              {groups.map((g) => cardEditor(g.id))}
            </div>
          ) : active === "intro" ? (
            <div className="form">
              {textField("introKicker", "介绍区眉题")}
              {textField("introTitle", "主标题（可换行）", true)}
              {textField("introDescription", "介绍短句", true)}
              <p className="panel-note">
                搜索框和两个探索入口保持前台现有交互。
              </p>
            </div>
          ) : active === "campus" ? (
            <div className="form">
              {textField("campusTitle", "校园区标题")}
              {campusDirections.map((c) => cardEditor(`campus-${c.id}`))}
            </div>
          ) : (
            <div className="form">
              {textField("contributionTitle", "反馈引导标题", true)}
              <p>
                按钮「告诉我们」进入用户反馈页面，提交后在后台「用户反馈」中查看。
              </p>
            </div>
          )}
        </section>
      </div>
      <div className="cms-save-bar">
        <span>
          {dirty ? "修改尚未发布，线上内容不受影响" : "发布后所有访客可见"}
        </span>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button"
          disabled={busy}
          onClick={() => void publish()}
        >
          <Save size={16} />
          {busy ? "正在发布…" : "发布首页"}
        </button>
      </div>
      <details className="home-history">
        <summary>历史版本与恢复（{versions.length}）</summary>
        <p>恢复只载入编辑区，确认后点击「发布首页」才会生效。</p>
        {versions.slice(0, 6).map((v) => (
          <div className="version-row" key={v.id}>
            <span>{new Date(v.createdAt).toLocaleString("zh-CN")}</span>
            <button
              onClick={() => {
                try {
                  const stored = JSON.parse(v.value);
                  const old = stored.cards ? { homeContent: stored } : stored;
                  setContent(
                    homeContent({ ...settings, ...old }, products, placements),
                  );
                  setModules(homeModules({ ...settings, ...old }, placements));
                  setDirty(true);
                  toast("历史配置已载入，请检查后发布");
                } catch {
                  setError("历史版本无法读取");
                }
              }}
            >
              载入此版本
            </button>
          </div>
        ))}
      </details>
    </>
  );
}

export function SimpleProductEditor() {
  const { id } = useParams(),
    navigate = useNavigate();
  const { allProducts, taxonomies, save, toast } = useApp();
  const existing = allProducts.find((p) => p.id === id);
  const [form, setForm] = useState<Product>(() =>
      existing ? { ...existing } : emptyProduct(),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (id && id !== "new" && !existing)
    return (
      <p>
        产品不存在。<Link to="/admin/products">返回列表</Link>
      </p>
    );
  const change = (patch: Partial<Product>) =>
    setForm((p) => ({ ...p, ...patch }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const parsed = productSchema.parse(form);
      if (allProducts.some((p) => p.id !== parsed.id && p.slug === parsed.slug))
        throw new Error("产品标识已存在");
      if (parsed.targetUrl) {
        const host = new URL(parsed.targetUrl).hostname;
        parsed.allowedDomains = [...new Set([...parsed.allowedDomains, host])];
        safeTarget(parsed.targetUrl, parsed.allowedDomains);
      }
      await save("products", { ...parsed, updatedAt: now() });
      toast("产品已保存，前台同步更新");
      navigate("/admin/products");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={(e) => void submit(e)}>
      <AdminTitle
        title={existing ? "编辑产品" : "新增产品"}
        description="这里只管理真实产品。首页漫画代表方向；把产品收录到方向合集，在首页管理中配置。"
      >
        <Link className="button secondary" to="/admin/products">
          返回列表
        </Link>
        <button className="button" disabled={busy}>
          {busy ? "保存中…" : "保存产品"}
        </button>
      </AdminTitle>
      <div className="admin-panel form">
        <div className="form-grid">
          <label>
            产品名称
            <input
              required
              value={form.name}
              onChange={(e) => change({ name: e.target.value })}
            />
          </label>
          <label>
            产品标识 Slug
            <input
              required
              pattern="[a-z0-9-]+"
              value={form.slug}
              onChange={(e) => change({ slug: e.target.value })}
            />
          </label>
        </div>
        <label>
          一句话介绍
          <input
            required
            value={form.tagline}
            onChange={(e) => change({ tagline: e.target.value })}
          />
        </label>
        <label>
          独立产品网址
          <input
            type="url"
            value={form.targetUrl}
            placeholder="https://your-product.com"
            onChange={(e) => change({ targetUrl: e.target.value })}
          />
          <small>填写后自动校验允许域名；留空时前台只打开产品介绍。</small>
        </label>
        <label>
          完整描述
          <textarea
            aria-label="完整描述"
            rows={4}
            value={form.description}
            onChange={(e) => change({ description: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label>
            产品分类
            <select
              value={form.category}
              onChange={(e) => change({ category: e.target.value })}
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
              value={form.stage}
              onChange={(e) => change({ stage: e.target.value })}
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
          <label>
            发布状态
            <select
              value={form.status}
              onChange={(e) =>
                change({ status: e.target.value as Product["status"] })
              }
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            产品阶段
            <select
              value={form.release}
              onChange={(e) =>
                change({ release: e.target.value as Product["release"] })
              }
            >
              <option value="live">已上线</option>
              <option value="beta">测试中</option>
              <option value="planned">敬请期待</option>
            </select>
          </label>
        </div>
        {form.status === "scheduled" && (
          <label>
            计划发布时间
            <input
              required
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => change({ scheduledAt: e.target.value })}
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="home-binding-note">
        <span>
          草稿、已隐藏或未上线产品不出现在方向合集。自动收录按分类 /
          阶段匹配，手动收录在首页管理中勾选。
        </span>
        <Link to="/admin/homepage">
          管理方向合集 <ArrowUpRight size={14} />
        </Link>
      </div>
      {existing && (
        <details className="home-history">
          <summary>更多产品参数</summary>
          <p>
            收费、标签、图标、SEO 等低频参数保留在完整编辑器。请先保存当前修改。
          </p>
          <Link
            className="text-link"
            to={`/admin/products/${existing.id}/advanced`}
          >
            打开完整编辑器
          </Link>
        </details>
      )}
    </form>
  );
}

export function SimpleSettings() {
  const path = useLocation().pathname;
  const owner = !serverMode || currentAdmin?.role === "owner";
  const tabs = [
    ["/admin/settings", "基本设置"],
    ["/admin/navigation", "顶部导航"],
    ...(owner ? [["/admin/users", "管理员"]] : []),
    ["/admin/audit-logs", "操作日志"],
  ];
  return (
    <>
      <nav className="simple-settings-tabs" aria-label="系统设置分类">
        {tabs.map(([url, name]) => (
          <NavLink end to={url} key={url}>
            {name}
          </NavLink>
        ))}
      </nav>
      {path === "/admin/users" || path === "/admin/roles-permissions" ? (
        <AdminUsers />
      ) : path === "/admin/audit-logs" ? (
        <AdminAudit />
      ) : path === "/admin/navigation" ? (
        <NavigationEditor />
      ) : (
        <BasicSettings owner={owner} />
      )}
    </>
  );
}
function BasicSettings({ owner }: { owner: boolean }) {
  const { settings, save, toast } = useApp();
  const [form, setForm] = useState(settings),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <AdminTitle
        title="系统设置"
        description="只保留当前网站实际使用的基础配置。管理员、导航和日志在上方切换。"
      />
      <form
        className="admin-panel form"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          void repository
            .get("settings", "site")
            .then((latest) =>
              save("settings", {
                ...(latest ?? settings),
                brand: form.brand,
                tagline: form.tagline,
                showDemos: form.showDemos,
              }),
            )
            .then(() => toast("站点设置已保存"))
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      >
        <label>
          品牌中文名
          <input
            required
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
          <small>显示在页头和页脚的 NEXT 标识下方。</small>
        </label>
        <label>
          页脚介绍
          <textarea
            aria-label="页脚介绍"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          />
          <small>直接对应前台页脚，不再是未使用的配置项。</small>
        </label>
        <button className="button" disabled={busy}>
          <Check size={16} />
          保存站点配置
        </button>
      </form>
      <details className="home-history">
        <summary>高级维护：演示数据与内容备份</summary>
        <label className="check-label">
          <input
            type="checkbox"
            aria-label="显示演示产品"
            checked={form.showDemos}
            onChange={(e) => setForm({ ...form, showDemos: e.target.checked })}
          />
          显示演示产品（修改后需保存站点配置）
        </label>
        <p>日常运营无需开启。演示产品不参与首页卡片的自动匹配。</p>
        {owner && (
          <div className="cms-actions">
            <button
              className="button secondary"
              onClick={() =>
                void repository
                  .exportData()
                  .then((data) =>
                    downloadJson("next-content-backup.json", data),
                  )
                  .catch((e) => setError(e.message))
              }
            >
              导出内容备份
            </button>
            <label className="button secondary">
              导入内容备份
              <input
                className="sr-only"
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (
                    file &&
                    confirm(
                      serverMode
                        ? "将按 ID 合并并更新服务器内容，是否已做好备份并继续？"
                        : "将替换本机站点数据，确认继续？",
                    )
                  )
                    void file
                      .text()
                      .then(JSON.parse)
                      .then((data) => repository.importData(data))
                      .then(() => location.reload())
                      .catch((e) => setError(e.message));
                }}
              />
            </label>
          </div>
        )}
        <p>
          完整数据库备份、恢复与密码找回，使用服务器维护脚本。不会清除现有数据。
        </p>
      </details>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
