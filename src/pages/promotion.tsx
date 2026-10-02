import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../storage/http";
import type { Promotion } from "../domain/content";
export function PromotionView({ page }: { page: Promotion }) {
  return (
    <article className="promotion-page container">
      <header className="promotion-hero">
        <div>
          <span className="eyebrow">{page.eyebrow}</span>
          <h1>{page.title || "你的页面标题"}</h1>
          <p>{page.description}</p>
          {page.ctaUrl && page.ctaLabel && (
            <a className="button" href={page.ctaUrl} rel="noopener noreferrer">
              {page.ctaLabel} ↗
            </a>
          )}
        </div>
        {page.image && (
          <img src={page.image} alt={page.imageAlt} fetchPriority="high" />
        )}
      </header>
      {page.sections.map((section) => (
        <section className="promotion-section" key={section.id}>
          {section.image && (
            <img src={section.image} alt={section.imageAlt} loading="lazy" />
          )}
          <div>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </div>
        </section>
      ))}
    </article>
  );
}
export function PromotionPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<Promotion | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setPage(null);
    setError("");
    void api<Promotion>(`/pages/${encodeURIComponent(slug ?? "")}`)
      .then((p) => {
        if (active) setPage(p);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [slug]);
  useEffect(() => {
    if (!page) return;
    const previous = document.title;
    document.title = `${page.title} · NEXT 下一程`;
    return () => {
      document.title = previous;
    };
  }, [page]);
  return error ? (
    <div className="container section">
      <h1>{error}</h1>
      <Link to="/">返回首页</Link>
    </div>
  ) : page ? (
    <PromotionView page={page} />
  ) : (
    <div className="container section">正在打开这一页…</div>
  );
}
