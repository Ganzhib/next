import { Link } from "react-router-dom";
import { useApp } from "../app/context";
import { directionGroups } from "../domain/home-config";
import { Illustration, type IllustrationId } from "./illustration";

export function CampusExplore() {
  const { products, placements, settings } = useApp();
  const directions = directionGroups(
    products,
    placements,
    settings.homeContent,
  ).filter((d) => d.id.startsWith("campus-"));
  return (
    <>
      <div className="campus-heading">
        <span className="eyebrow">EXPLORE CAMPUS / 校园方向</span>
        <h2>
          {settings.homeContent?.campusTitle ?? "在学校，也有自己的下一程。"}
        </h2>
      </div>
      <div className="campus-grid">
        {directions.map((direction, index) => (
          <article
            className={`campus-story ${direction.id}`}
            key={direction.id}
          >
            <Link
              to={`/directions/${direction.id}`}
              className="campus-art"
              aria-label={`探索${direction.title}`}
            >
              {direction.image ? (
                <img src={direction.image} alt={direction.alt} loading="lazy" />
              ) : (
                <Illustration
                  id={direction.id as IllustrationId}
                  alt={direction.alt}
                />
              )}
              <span className="campus-index">0{index + 1}</span>
            </Link>
            <div className="campus-story-heading">
              <h3>
                <Link to={`/directions/${direction.id}`}>
                  {direction.title}
                </Link>
              </h3>
              <Link
                to={`/directions/${direction.id}`}
                className={`campus-status ${direction.products.length ? "" : "upcoming"}`}
              >
                {direction.products.length
                  ? `${direction.products.length} 款工具 ↗`
                  : "敬请期待 ↗"}
              </Link>
            </div>
            <p>{direction.description}</p>
          </article>
        ))}
      </div>
    </>
  );
}
