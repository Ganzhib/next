import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowUpRight, Bookmark, Check, Layers, Trophy } from "lucide-react";
import { useApp } from "../app/context";
import {
  Empty,
  Icon,
  PageIntro,
  ProductIcon,
  SectionTitle,
} from "../components/ui";
import { ShareButton } from "./catalog";
import { repository } from "../storage";
import type { Activity } from "../domain/models";
export function Collections() {
  const { collections, products } = useApp();
  return (
    <div className="container section">
      <PageIntro
        eyebrow="CURATED COLLECTIONS / 精选合集"
        title="少一点摸索，多一点方向。"
        description="把独立的工具连成一条清晰的路线，为不同阶段的你准备。"
      />
      <div className="collection-grid">
        {collections
          .filter((c) => c.status === "published")
          .map((c, i) => (
            <Link
              className={`collection-card ${c.color}`}
              key={c.id}
              to={`/collections/${c.slug}`}
            >
              <div>
                <span className="eyebrow">{c.eyebrow}</span>
                <h3>{c.title}</h3>
                <p>{c.description}</p>
                <div className="collection-meta">
                  <span>
                    <Layers size={15} />
                    {
                      c.productIds.filter((id) =>
                        products.some((p) => p.id === id),
                      ).length
                    }{" "}
                    款产品
                  </span>
                  <span>
                    查看路线 <ArrowUpRight size={16} />
                  </span>
                </div>
              </div>
              <span className="collection-number">0{i + 1}</span>
            </Link>
          ))}
      </div>
      <div className="editor-note">
        <span className="eyebrow">A NOTE FROM THE EDITOR</span>
        <p>
          合集是一份使用建议。按照自己的节奏前进，
          <br />
          不必一次用完所有工具。
        </p>
      </div>
    </div>
  );
}
export function CollectionDetail() {
  const { slug } = useParams();
  const { collections, products, profile, favorite, track } = useApp();
  const c = collections.find(
    (c) => c.slug === slug && c.status === "published",
  );
  useEffect(() => {
    if (c) void track("collection_viewed", { collectionId: c.id });
  }, [c?.id, track]);
  if (!c)
    return (
      <div className="container section">
        <Empty title="这个合集还未发布" />
      </div>
    );
  return (
    <div className="container section collection-detail">
      <Link to="/collections" className="text-link">
        全部合集
      </Link>
      <PageIntro
        eyebrow={c.eyebrow}
        title={c.title}
        description={c.description}
      >
        <button
          className="button secondary"
          onClick={() => void favorite(c.id, true)}
        >
          <Bookmark size={17} />
          {profile.collections.includes(c.id) ? "已收藏" : "收藏路线"}
        </button>
      </PageIntro>
      <div className="route-list">
        {c.productIds.map((id, i) => {
          const p = products.find((p) => p.id === id);
          return p ? (
            <article key={id}>
              <div className="route-number">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="route-content">
                <span className="eyebrow">STEP {i + 1}</span>
                <h2>{c.steps[i] || p.tagline}</h2>
                <p>{p.description}</p>
                <div className="route-product">
                  <ProductIcon product={p} />
                  <div>
                    <strong>{p.name}</strong>
                    <small>{p.tagline}</small>
                  </div>
                  <Link
                    className="button small"
                    to={`/go/${p.slug}?placement=collection_${c.id}`}
                    onClick={() =>
                      void track("collection_product_clicked", {
                        collectionId: c.id,
                        productId: p.id,
                      })
                    }
                  >
                    访问产品
                  </Link>
                </div>
              </div>
            </article>
          ) : null;
        })}
      </div>
      <ShareButton path={`/collections/${c.slug}`} />
    </div>
  );
}
export function TaxonomyPage() {
  const location = useLocation();
  const { taxonomies, products } = useApp();
  const kind =
    location.pathname === "/roles"
      ? "role"
      : location.pathname === "/stages"
        ? "stage"
        : "category";
  const title =
    kind === "stage"
      ? "你在哪一程？"
      : kind === "role"
        ? "向着你的目标岗位。"
        : "每个问题，都值得一个好工具。";
  return (
    <div className="container section">
      <PageIntro
        eyebrow="FIND YOUR WAY / 寻找方向"
        title={title}
        description="从当前的需要开始。还没有收录产品的方向，欢迎向我们推荐。"
      />
      <div className={`taxonomy-grid ${kind === "stage" ? "stage-grid" : ""}`}>
        {taxonomies
          .filter((t) => t.kind === kind)
          .map((t, i) => {
            const count = products.filter((p) =>
              kind === "category"
                ? p.category === t.id
                : kind === "stage"
                  ? p.stage === t.id
                  : p.roles.includes(t.name),
            ).length;
            return (
              <Link
                key={t.id}
                to={`/${kind === "stage" ? "stages" : kind === "role" ? "roles" : "categories"}/${t.id}`}
              >
                <span className="eyebrow">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon name={t.icon} size={30} />
                <h2>{t.name}</h2>
                <p>{t.description || "找到适合这个阶段的产品与准备方式。"}</p>
                <span className="text-link">
                  {count ? `${count} 款产品` : "查看该方向"}
                  <ArrowUpRight size={15} />
                </span>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
export function Rankings() {
  const { products } = useApp();
  const { slug } = useParams();
  const [events, setEvents] = useState<Activity[]>([]);
  useEffect(() => {
    repository.list("events").then(setEvents);
  }, []);
  const mode = slug ?? "editor";
  const count = (id: string) =>
    events.filter(
      (e) => e.productId === id && e.name === "product_outbound_redirected",
    ).length;
  const list = [...products].sort((a, b) =>
    mode === "popular"
      ? count(b.id) - count(a.id)
      : mode === "new"
        ? b.updatedAt.localeCompare(a.updatedAt)
        : a.order - b.order,
  );
  return (
    <div className="container section">
      <PageIntro
        eyebrow="THE SHORTLIST / 产品榜单"
        title="值得你关注的选择。"
        description="编辑推荐与真实访问分开展示。热门榜目前仅反映本浏览器已记录的访问。"
      />
      <div className="tabs">
        {[
          ["editor", "编辑推荐"],
          ["popular", "本地访问榜"],
          ["new", "最近更新"],
        ].map(([id, label]) => (
          <Link
            key={id}
            className={mode === id ? "active" : ""}
            to={`/rankings/${id}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="ranking-list">
        {list.map((p, i) => (
          <Link key={p.id} to={`/products/${p.slug}`}>
            <span className="rank">{String(i + 1).padStart(2, "0")}</span>
            <ProductIcon product={p} />
            <div>
              <h3>{p.name}</h3>
              <p>{p.tagline}</p>
            </div>
            <span className="rank-meta">
              {mode === "popular" ? (
                `${count(p.id)} 次本地访问`
              ) : mode === "new" ? (
                new Date(p.updatedAt).toLocaleDateString("zh-CN")
              ) : i < 2 ? (
                <Trophy size={18} />
              ) : (
                "编辑收录"
              )}
            </span>
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </div>
      <div className="callout">
        <Check size={20} />
        <p>无虚构评分，无付费置顶伪装。产品是否适合你，比名次更重要。</p>
      </div>
      <SectionTitle title="按自己的需要继续探索" to="/products" />
    </div>
  );
}
