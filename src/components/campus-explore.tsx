import { Link } from "react-router-dom";
import { useApp } from "../app/context";
import { campusDirections } from "../domain/campus";

export function CampusExplore() {
  const { products } = useApp();
  return (
    <>
      <div className="campus-heading">
        <span className="eyebrow">BEYOND THE OFFER / 校园探索</span>
        <h2>在学校，也有自己的下一程。</h2>
      </div>
      <div className="campus-grid">
        {campusDirections.map((direction, index) => {
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
                <img
                  src={direction.image}
                  alt={direction.alt}
                  width="1536"
                  height="1024"
                  loading="lazy"
                />
                <span className="campus-index">0{index + 1}</span>
              </div>
              <div className="campus-story-heading">
                <h3>{direction.title}</h3>
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
              <p>{direction.description}</p>
            </article>
          );
        })}
      </div>
    </>
  );
}
