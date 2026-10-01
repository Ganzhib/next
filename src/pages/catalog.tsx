import { useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  ExternalLink,
  Grid2X2,
  List,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useApp } from "../app/context";
import {
  Empty,
  Icon,
  PageIntro,
  ProductCard,
  ProductIcon,
  SearchInput,
  SectionTitle,
} from "../components/ui";
import { ownershipLabels, pricingLabels } from "../domain/models";
import { repository } from "../storage";
import { safeTarget } from "../domain/security";
import { now, uid } from "../domain/seed";

export function Catalog() {
  const { products, taxonomies, track, profile } = useApp();
  const { slug } = useParams();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState("grid");
  const [filters, setFilters] = useState(false);
  const category = location.pathname.startsWith("/categories/")
    ? slug
    : (params.get("category") ?? "");
  const role = location.pathname.startsWith("/roles/")
    ? slug
    : (params.get("role") ?? "");
  const stage = location.pathname.startsWith("/stages/")
    ? slug
    : (params.get("stage") ?? "");
  const q = params.get("q") ?? "";
  const pricing = params.get("pricing") ?? "";
  const source = params.get("source") ?? "";
  const sort = params.get("sort") ?? "recommended";
  const activeTaxonomy = taxonomies.find(
    (t) => t.id === (category || stage || role),
  );
  const filtered = useMemo(
    () =>
      products
        .filter((p) =>
          `${p.name} ${p.tagline} ${p.description} ${p.tags.join(" ")} ${p.features.join(" ")}`
            .toLowerCase()
            .includes(q.toLowerCase()),
        )
        .filter((p) => !category || p.category === category)
        .filter((p) => !stage || p.stage === stage)
        .filter(
          (p) =>
            !role ||
            p.roles.includes(
              taxonomies.find((t) => t.id === role)?.name ?? role,
            ),
        )
        .filter((p) => !pricing || p.pricing === pricing)
        .filter((p) => !source || p.ownership === source)
        .filter((p) => params.get("open") !== "1" || p.openSource)
        .filter((p) => params.get("chinese") !== "1" || p.chinese)
        .filter((p) => !profile.hidden.includes(p.id))
        .sort((a, b) =>
          sort === "new"
            ? b.updatedAt.localeCompare(a.updatedAt)
            : sort === "name"
              ? a.name.localeCompare(b.name)
              : a.order - b.order,
        ),
    [
      products,
      q,
      category,
      stage,
      role,
      pricing,
      source,
      sort,
      params,
      profile.hidden,
      taxonomies,
    ],
  );
  useEffect(() => {
    if (!q) return;
    const timer = setTimeout(
      () =>
        void track(filtered.length ? "search_performed" : "search_no_result", {
          query: q.replace(/[\w.+-]+@[\w.-]+|\b\d{7,}\b/g, "[已隐藏]"),
        }),
      600,
    );
    return () => clearTimeout(timer);
  }, [q, filtered.length, track]);
  const rawPage = Number(params.get("page") ?? 1);
  const page = Number.isFinite(rawPage) ? Math.floor(rawPage) : 1;
  const total = Math.max(1, Math.ceil(filtered.length / 9));
  const safePage = Math.min(Math.max(page, 1), total);
  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
    void track("filter_changed", { query: `${key}:${value}` });
  }
  return (
    <div className="container catalog-page">
      <PageIntro
        eyebrow="PRODUCT DIRECTORY / 产品库"
        title={
          activeTaxonomy?.name ??
          (location.pathname === "/search"
            ? "找到你的下一步"
            : "好工具，值得被发现。")
        }
        description={
          activeTaxonomy?.description ||
          "为每一次认真准备，找到一款真正适合的产品。"
        }
      />
      <div className="catalog-search">
        <SearchInput value={q} onChange={(v) => set("q", v)} />
        <button
          className="button secondary filter-toggle"
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={17} />
          筛选
        </button>
      </div>
      <div className="catalog-layout">
        <aside className={`filter-sidebar ${filters ? "open" : ""}`}>
          <div className="filter-title">
            筛选产品 <button onClick={() => setParams({})}>重置</button>
          </div>
          <div className="filter-group">
            <h3>产品分类</h3>
            <Link to="/products" className={!category ? "selected" : ""}>
              全部产品 <span>{products.length}</span>
            </Link>
            {taxonomies
              .filter((t) => t.kind === "category")
              .map((t) => (
                <Link
                  key={t.id}
                  to={`/products?category=${t.id}`}
                  className={category === t.id ? "selected" : ""}
                >
                  <Icon name={t.icon} size={16} />
                  {t.name}
                  <span>
                    {products.filter((p) => p.category === t.id).length}
                  </span>
                </Link>
              ))}
          </div>
          <div className="filter-group">
            <h3>收费方式</h3>
            {[
              ["", "不限"],
              ["free", "完全免费"],
              ["freemium", "免费体验"],
              ["paid", "付费产品"],
            ].map(([id, label]) => (
              <label key={id}>
                <input
                  type="radio"
                  name="pricing"
                  checked={pricing === id}
                  onChange={() => set("pricing", id)}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="filter-group">
            <h3>产品属性</h3>
            <label>
              <input
                type="checkbox"
                checked={params.get("open") === "1"}
                onChange={(e) => set("open", e.target.checked ? "1" : "")}
              />
              开放源代码
            </label>
            <label>
              <input
                type="checkbox"
                checked={params.get("chinese") === "1"}
                onChange={(e) => set("chinese", e.target.checked ? "1" : "")}
              />
              支持中文
            </label>
            <label>
              产品来源
              <select
                value={source}
                onChange={(e) => set("source", e.target.value)}
              >
                <option value="">全部来源</option>
                <option value="first_party">自有产品</option>
                <option value="partner">合作产品</option>
                <option value="external">精选工具</option>
              </select>
            </label>
          </div>
          <div className="sidebar-note">
            <ShieldCheck size={22} />
            <p>
              少一点噪声，
              <br />
              多一点真正有用的选择。
            </p>
            <Link to="/about">了解我们的筛选原则</Link>
          </div>
        </aside>
        <div className="catalog-content">
          <div className="result-toolbar">
            <span>
              发现 <strong>{filtered.length}</strong> 款产品
            </span>
            <div>
              <select
                aria-label="产品排序"
                value={sort}
                onChange={(e) => set("sort", e.target.value)}
              >
                <option value="recommended">编辑推荐</option>
                <option value="new">最近更新</option>
                <option value="name">按名称</option>
              </select>
              <button
                className={`icon-button ${view === "grid" ? "active" : ""}`}
                aria-label="网格视图"
                onClick={() => setView("grid")}
              >
                <Grid2X2 size={17} />
              </button>
              <button
                className={`icon-button ${view === "list" ? "active" : ""}`}
                aria-label="列表视图"
                onClick={() => setView("list")}
              >
                <List size={19} />
              </button>
            </div>
          </div>
          {filtered.length ? (
            <>
              <div
                className={`product-grid catalog-grid ${view === "list" ? "list-view" : ""}`}
              >
                {filtered
                  .slice((safePage - 1) * 9, safePage * 9)
                  .map((p, i) => (
                    <ProductCard key={p.id} product={p} position={i} />
                  ))}
              </div>
              <div className="pagination">
                {Array.from({ length: total }, (_, i) => (
                  <button
                    key={i}
                    className={safePage === i + 1 ? "active" : ""}
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.set("page", String(i + 1));
                      setParams(next);
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <Empty
              title="这次还没有找到"
              description="试试减少一个筛选条件，或告诉我们你正在寻找什么。"
            >
              <button
                className="button secondary"
                onClick={() => setParams({})}
              >
                清除筛选
              </button>
              <Link className="text-link" to="/submit">
                推荐一个产品
              </Link>
            </Empty>
          )}
          <div className="catalog-end">
            每一个好工具，都值得认真选择。<span>NEXT / PRODUCT DIRECTORY</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductDetail() {
  const { slug } = useParams();
  const {
    products,
    taxonomies,
    profile,
    favorite,
    toggleCompare,
    compare,
    track,
  } = useApp();
  const p = products.find((p) => p.slug === slug);
  const [tab, setTab] = useState("overview");
  useEffect(() => {
    if (p?.detailEnabled) {
      document.title = `${p.seoTitle || p.name} · 下一程 NEXT`;
      void track("product_detail_viewed", { productId: p.id });
    }
  }, [p?.id, p?.detailEnabled, track]);
  if (p && !p.detailEnabled) return <Navigate to={`/go/${p.slug}`} replace />;
  if (!p)
    return (
      <div className="container section">
        <Empty
          title="暂时找不到这个产品"
          description="产品可能尚未发布，或者已被归档。"
        >
          <Link className="button" to="/products">
            回到产品库
          </Link>
        </Empty>
      </div>
    );
  return (
    <div className="container detail-page">
      <div className="breadcrumbs">
        <Link to="/products">产品库</Link>
        <ChevronRight size={13} />
        <Link to={`/categories/${p.category}`}>
          {taxonomies.find((t) => t.id === p.category)?.name}
        </Link>
        <ChevronRight size={13} />
        <span>{p.name}</span>
      </div>
      <div className="detail-header">
        <ProductIcon product={p} large />
        <div>
          <div className="detail-title">
            <h1>{p.name}</h1>
            <span className="pill">
              {p.release === "beta" ? "BETA" : ownershipLabels[p.ownership]}
            </span>
            {p.demo && <span className="pill">演示产品</span>}
          </div>
          <p>{p.tagline}</p>
          <div className="tag-list">
            {p.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
        <button
          className={`icon-button ${profile.favorites.includes(p.id) ? "active" : ""}`}
          aria-label="收藏产品"
          onClick={() => void favorite(p.id)}
        >
          <Bookmark size={22} />
        </button>
      </div>
      <div className="detail-layout">
        <div className="detail-content">
          <div
            className={`detail-cover ${p.icon === "mic" ? "sage" : "peach"}`}
          >
            <span className="eyebrow">NEXT / SELECTED PRODUCT</span>
            <Icon name={p.icon} size={65} />
            <h2>{p.name}</h2>
            <p>{p.tagline}</p>
            <div>
              {p.features.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
            <small>产品介绍示意 · 实际功能以独立产品为准</small>
          </div>
          <div className="tabs">
            {[
              ["overview", "产品介绍"],
              ["features", "功能与评价"],
              ["updates", "更新记录"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "overview" ? (
            <div className="prose">
              <h2>让下一步，更有把握。</h2>
              <p>{p.description}</p>
              <h3>适合谁使用</h3>
              <p>{p.audience}</p>
              <h3>开始之前</h3>
              <p>
                点击「立即使用」会打开独立产品。下一程负责帮助你发现和连接工具，实际功能、账户与数据由对应产品管理。
              </p>
              <div className="callout">
                <ShieldCheck size={22} />
                <div>
                  <strong>透明推荐，认真选择</strong>
                  <p>
                    {p.sponsored
                      ? "本产品包含商业合作推荐。"
                      : "本页面未设置付费推荐。"}
                    {p.ownership === "first_party"
                      ? "这是我们的自有产品。"
                      : "使用前请核对独立产品的收费和隐私说明。"}
                  </p>
                </div>
              </div>
            </div>
          ) : tab === "features" ? (
            <div className="prose">
              <h2>核心能力</h2>
              <div className="feature-list">
                {p.features.map((f) => (
                  <div key={f}>
                    <Check size={18} />
                    {f}
                  </div>
                ))}
              </div>
              <div className="pros-cons">
                <div>
                  <h3>值得关注</h3>
                  {p.pros.map((f) => (
                    <p key={f}>＋ {f}</p>
                  ))}
                </div>
                <div>
                  <h3>使用边界</h3>
                  {p.cons.map((f) => (
                    <p key={f}>— {f}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="prose">
              <h3>最近更新</h3>
              <p>
                {new Date(p.updatedAt).toLocaleDateString("zh-CN")} ·
                产品介绍信息更新
              </p>
              <p className="muted">独立产品的版本更新，以其官方页面为准。</p>
            </div>
          )}
          <SectionTitle title="也许是你的下一步" to="/products" />
          <div className="product-grid related-grid">
            {products
              .filter((x) => x.id !== p.id)
              .slice(0, 2)
              .map((x) => (
                <ProductCard key={x.id} product={x} />
              ))}
          </div>
        </div>
        <aside className="detail-aside">
          <div className="detail-action-card">
            <span className="eyebrow">开始下一步</span>
            <h3>{pricingLabels[p.pricing]}</h3>
            <p>从这个产品开始你的准备</p>
            <Link
              className="button full"
              to={`/go/${p.slug}?placement=product_detail`}
            >
              {p.targetUrl ? "立即使用" : "查看接入状态"}
              <ExternalLink size={15} />
            </Link>
            {!p.targetUrl && <small>独立产品链接待运营者配置</small>}
            <button
              className="button secondary full"
              onClick={() => toggleCompare(p.id)}
            >
              {compare.includes(p.id) ? "已加入对比" : "加入产品对比"}
            </button>
            <dl>
              <dt>产品归属</dt>
              <dd>{ownershipLabels[p.ownership]}</dd>
              <dt>中文支持</dt>
              <dd>{p.chinese ? "支持" : "未确认"}</dd>
              <dt>是否开源</dt>
              <dd>{p.openSource ? "开源" : "未标记开源"}</dd>
              <dt>需要账户</dt>
              <dd>{p.requiresAccount ? "需要" : "以产品为准"}</dd>
              <dt>链接格式检查</dt>
              <dd>
                {p.verifiedAt
                  ? new Date(p.verifiedAt).toLocaleDateString("zh-CN")
                  : "尚未验证"}
              </dd>
            </dl>
          </div>
          <Link className="aside-link" to={`/feedback?product=${p.id}`}>
            信息有误？帮助我们完善 <ArrowUpRight size={14} />
          </Link>
          <Link className="aside-link" to={`/claim/${p.slug}`}>
            我是这个产品的开发者
          </Link>
        </aside>
      </div>
    </div>
  );
}

export function Launch() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const { products, profile, updateProfile, track } = useApp();
  const [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const p = products.find((x) => x.slug === slug);
  useEffect(() => {
    setReady(false);
    setError("");
    if (!p) {
      setError("产品未发布或不存在。");
      return;
    }
    try {
      safeTarget(p.targetUrl, p.allowedDomains);
      setReady(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [p]);
  async function go() {
    if (!p) return;
    try {
      const url = safeTarget(p.targetUrl, p.allowedDomains);
      const launchId = uid();
      await track("product_launch_created", {
        productId: p.id,
        launchId,
        placement: params.get("placement") ?? "direct",
      });
      try {
        await updateProfile({
          history: [
            { productId: p.id, visitedAt: now() },
            ...profile.history.filter((h) => h.productId !== p.id),
          ].slice(0, 100),
        });
      } catch {
        /* 记录失败时仍继续导航 */
      }
      await track("product_outbound_redirected", { productId: p.id, launchId });
      window.location.assign(url.toString());
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="container section launch-page">
      {p && <ProductIcon product={p} large />}
      <span className="eyebrow">NEXT / PRODUCT LAUNCH</span>
      <h1>{error ? "还差一个连接" : "准备进入 " + p?.name}</h1>
      <p>{error || "你将前往独立产品，账户、内容和功能由该产品提供。"}</p>
      {ready && !error && (
        <>
          <code>{new URL(p!.targetUrl).hostname}</code>
          <button className="button" onClick={() => void go()}>
            继续访问 <ExternalLink size={16} />
          </button>
        </>
      )}
      <div>
        <Link
          className="text-link"
          to={p?.detailEnabled ? `/products/${p.slug}` : "/products"}
        >
          返回产品介绍
        </Link>
        <Link className="text-link" to="/admin/products">
          配置产品链接
        </Link>
      </div>
    </div>
  );
}

export function Compare() {
  const { products, compare, toggleCompare } = useApp();
  const [params, setParams] = useSearchParams();
  const selected = (params.get("ids")?.split(",") ?? compare)
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is (typeof products)[number] => !!p);
  return (
    <div className="container section">
      <PageIntro
        eyebrow="SIDE BY SIDE / 产品比较"
        title="比较之后，再做选择。"
        description="把关键差异放在一起，找到更适合自己的工具。"
      />
      {selected.length ? (
        <>
          <div className="comparison-scroll">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>比较维度</th>
                  {selected.map((p) => (
                    <th key={p.id}>
                      <ProductIcon product={p} />
                      <h3>{p.name}</h3>
                      <button
                        className="icon-button"
                        aria-label={`移除 ${p.name}`}
                        onClick={() => {
                          if (params.has("ids")) {
                            const next = new URLSearchParams(params);
                            next.set(
                              "ids",
                              selected
                                .filter((x) => x.id !== p.id)
                                .map((x) => x.id)
                                .join(","),
                            );
                            setParams(next);
                          } else toggleCompare(p.id);
                        }}
                      >
                        <X size={15} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["核心用途", ...selected.map((p) => p.tagline)],
                  ["适合人群", ...selected.map((p) => p.audience)],
                  [
                    "收费方式",
                    ...selected.map((p) => pricingLabels[p.pricing]),
                  ],
                  [
                    "中文支持",
                    ...selected.map((p) => (p.chinese ? "支持" : "未确认")),
                  ],
                  [
                    "开源状态",
                    ...selected.map((p) =>
                      p.openSource ? "开源" : "未标记开源",
                    ),
                  ],
                  ["主要能力", ...selected.map((p) => p.features.join(" / "))],
                  ["使用边界", ...selected.map((p) => p.cons.join(" / "))],
                  [
                    "产品归属",
                    ...selected.map((p) => ownershipLabels[p.ownership]),
                  ],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((s, i) => (
                      <td key={i}>{s}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td>开始使用</td>
                  {selected.map((p) => (
                    <td key={p.id}>
                      <Link className="button small" to={`/go/${p.slug}`}>
                        访问产品
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <ShareButton
            path={`/compare?ids=${selected.map((p) => p.id).join(",")}`}
          />
        </>
      ) : (
        <Empty
          title="先挑选想比较的产品"
          description="在产品卡片上点击「对比」，最多可以选择 4 款工具。"
        >
          <Link className="button" to="/products">
            浏览产品库
          </Link>
        </Empty>
      )}
    </div>
  );
}
export function ShareButton({ path }: { path: string }) {
  const { toast } = useApp();
  return (
    <button
      className="button secondary"
      onClick={() => {
        navigator.clipboard
          .writeText(`${location.origin}${path}`)
          .then(() => toast("链接已复制"))
          .catch(() => toast("浏览器未允许复制，请复制地址栏链接"));
      }}
    >
      复制分享链接
    </button>
  );
}

export async function getLocalEvents() {
  return repository.list("events");
}
