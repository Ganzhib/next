import { ArrowDownToLine, ArrowUpRight } from "lucide-react";
import { useApp } from "../app/context";
import { homeContent } from "../domain/home-config";
import { visibleTools } from "../domain/tool-collection";

export function Home() {
  const { settings, products, placements } = useApp();
  const content = homeContent(settings, products, placements);
  const tools = visibleTools(content.tools);

  return (
    <div className="home">
      <section className="hero campus-bridge container" id="intro">
        <div className="hero-main">
          <div className="hero-kicker">{content.introKicker || "TOOLBOX / 工具集合"}</div>
          <h1>{content.introTitle || "少一点寻找，\n多一点完成。"}</h1>
        </div>
        <div className="campus-search">
          <p>{content.introDescription || "把工作、求职和创作中真正好用的工具放在一起。无需复杂导航，点开就能用。"}</p>
          <div className="popular-searches">
            <a className="button" href="#tools">浏览全部工具</a>
            <span>{tools.length} 款工具 · 持续更新</span>
          </div>
        </div>
      </section>

      <section className="container section featured-section" id="tools">
        <div className="section-title">
          <div>
            <span className="eyebrow">PICK A TOOL / 选择工具</span>
            <h2>{content.journeyTitle || "现在需要什么？"}</h2>
          </div>
        </div>
        <div className="journey-grid tool-collection-grid">
          {tools.map((tool, index) => (
            <article className="journey-card has-product" key={tool.id}>
              <a
                className="journey-illustration"
                href={tool.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${tool.action}：${tool.name}`}
              >
                <img
                  src={tool.image}
                  alt={tool.alt}
                  width="768"
                  height="768"
                  loading={index < 2 ? "eager" : "lazy"}
                  decoding="async"
                />
                <span className="journey-frame-number">{String(index + 1).padStart(2, "0")}</span>
              </a>
              <h3>{tool.name}</h3>
              <div className="journey-product">
                <span className="journey-caption">{tool.category}</span>
                <p>{tool.description}</p>
              </div>
              <div className="journey-card-footer">
                <a className="button full secondary" href={tool.href} target="_blank" rel="noreferrer">
                  {tool.action}
                  {tool.download ? <ArrowDownToLine size={16} /> : <ArrowUpRight size={16} />}
                </a>
              </div>
            </article>
          ))}
        </div>
        <div className="journey-summary">
          <span>选一个趁手的工具，现在就开始。</span>
          <span>效率 · 求职 · 创作</span>
        </div>
      </section>
    </div>
  );
}
