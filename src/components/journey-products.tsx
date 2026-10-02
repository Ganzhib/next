import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useApp } from "../app/context";
import { directionGroups } from "../domain/home-config";
import { SectionTitle } from "./ui";
import { Illustration, type IllustrationId } from "./illustration";

export function JourneyProducts() {
  const { products, placements, track, settings } = useApp();
  const directions = directionGroups(
    products,
    placements,
    settings.homeContent,
  ).filter((d) => d.id.startsWith("career-"));
  return (
    <>
      <SectionTitle
        eyebrow="FIND YOUR DIRECTION / 从方向开始"
        title={
          settings.homeContent?.journeyTitle ?? "选一个方向，找到趁手的工具。"
        }
        to="/products"
        label="浏览全部工具"
      />
      <div className="journey-grid">
        {directions.map((direction, index) => {
          const path = `/directions/${direction.id}`;
          return (
            <article
              key={direction.id}
              id={`journey-${direction.id.replace("career-", "")}`}
              className={`journey-card ${direction.products.length ? "has-product" : "is-upcoming"}`}
              aria-labelledby={`direction-${direction.id}`}
              tabIndex={-1}
            >
              <Link
                className="journey-illustration"
                to={path}
                aria-label={`探索${direction.title}`}
                onClick={() =>
                  void track("direction_opened", {
                    query: direction.id,
                    placement: "home_directions",
                    position: index,
                  })
                }
              >
                {direction.image ? (
                  <img
                    src={direction.image}
                    alt={direction.alt}
                    loading={index < 2 ? "eager" : "lazy"}
                  />
                ) : (
                  <Illustration
                    id={direction.id as IllustrationId}
                    alt={direction.alt}
                    eager={index < 2}
                    priority={index === 0}
                  />
                )}
                <span className="journey-frame-number">0{index + 1}</span>
              </Link>
              <h3 id={`direction-${direction.id}`}>
                <Link to={path}>{direction.title}</Link>
              </h3>
              <div className="journey-product">
                <p>{direction.description}</p>
              </div>
              <div className="journey-card-footer">
                <Link
                  className={`button full secondary ${direction.products.length ? "" : "journey-coming-soon"}`}
                  to={path}
                >
                  {direction.products.length ? "查看工具合集" : "探索这个方向"}
                  <ArrowUpRight size={16} />
                </Link>
                <span className="journey-footnote">
                  {direction.products.length
                    ? `${direction.products.length} 款工具 · 持续收录`
                    : "工具筹备中 · 敬请期待"}
                </span>
              </div>
            </article>
          );
        })}
      </div>
      <div className="journey-summary">
        <span>先找到方向，再挑选适合自己的工具。</span>
        <span>5 个求职方向 · 各有一份工具合集</span>
      </div>
    </>
  );
}
