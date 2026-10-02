import { Link } from "react-router-dom";
import { useApp } from "../app/context";
import { campusDirections } from "../domain/campus";
import { Illustration, type IllustrationId } from "./illustration";

export function CampusExplore() {
  const { products, settings } = useApp();
  return (
    <>
      <div className="campus-heading">
        <span className="eyebrow">BEYOND THE OFFER / 校园探索</span>
        <h2>
          {settings.homeContent?.campusTitle ?? "在学校，也有自己的下一程。"}
        </h2>
      </div>
      <div className="campus-grid">
        {campusDirections.map((direction, index) => {
          const custom = settings.homeContent?.cards.find(
            (c) => c.id === `campus-${direction.id}`,
          );
          const available = products.filter(
            (product) =>
              !product.demo && product.category === direction.category,
          );
          return (
            <article
              className={`campus-story campus-${direction.id}`}
              key={direction.id}
            >
              <div className="campus-art">
                {custom?.image ? (
                  <img src={custom.image} alt={custom.alt} loading="lazy" />
                ) : (
                  <Illustration
                    id={`campus-${direction.id}` as IllustrationId}
                    alt={custom?.alt ?? direction.alt}
                  />
                )}
                <span className="campus-index">0{index + 1}</span>
              </div>
              <div className="campus-story-heading">
                <h3>{custom?.title ?? direction.title}</h3>
                {available.length ? (
                  <Link
                    to={`/categories/${direction.category}`}
                    className="campus-status"
                  >
                    探索工具
                  </Link>
                ) : (
                  <span className="campus-status upcoming">敬请期待</span>
                )}
              </div>
              <p>{custom?.description ?? direction.description}</p>
            </article>
          );
        })}
      </div>
    </>
  );
}
