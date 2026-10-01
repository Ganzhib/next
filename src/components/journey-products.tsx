import { Link } from "react-router-dom";
import { useApp } from "../app/context";
import { careerJourney } from "../domain/journey";
import { SectionTitle } from "./ui";

export function JourneyProducts() {
  const { products, placements, track } = useApp();
  const primary = placements.find((p) => p.id === "home-primary" && p.enabled);
  // 推荐位只调整同阶段内的优先顺序，不打乱求职路线；演示数据不替代真实占位。
  const ranked = [...products]
    .filter((p) => !p.demo)
    .sort((a, b) => {
      const rank = (id: string) => {
        const index = primary?.productIds.indexOf(id) ?? -1;
        return index < 0 ? Number.MAX_SAFE_INTEGER : index;
      };
      return rank(a.id) - rank(b.id) || a.order - b.order;
    });
  const groups = careerJourney.map((stage) => ({
    ...stage,
    products: ranked.filter((p) => stage.stages.includes(p.stage)),
  }));
  const upcoming = groups.filter((stage) => !stage.products.length).length;
  return (
    <>
      <SectionTitle
        eyebrow="YOUR CAREER JOURNEY / 一路向前"
        title="求职的每一步，都在这里。"
        to="/products"
        label="探索产品库"
      />
      <div className="journey-grid">
        {groups.map((stage, index) => {
          const product = stage.products[0];
          return (
            <article
              key={stage.id}
              id={`journey-${stage.id}`}
              className={`journey-card ${product ? "has-product" : "is-upcoming"} journey-${stage.id}`}
              aria-labelledby={`journey-title-${stage.id}`}
              tabIndex={-1}
            >
              <div className="journey-illustration">
                <img
                  src={`/images/career-${stage.id}.png`}
                  alt={stage.illustrationAlt}
                  width="1024"
                  height="1024"
                  loading={index < 3 ? "eager" : "lazy"}
                />
                <span className="journey-frame-number">0{index + 1}</span>
              </div>
              <h3 id={`journey-title-${stage.id}`}>{stage.name}</h3>
              <div className="journey-product">
                {product ? (
                  <>
                    <span className="journey-caption">精选产品</span>
                    <h4>{product.name}</h4>
                    <p>{product.tagline}</p>
                  </>
                ) : (
                  <>
                    <span className="journey-caption">COMING SOON</span>
                    <h4>{stage.upcoming}</h4>
                    <p>{stage.note}</p>
                  </>
                )}
              </div>
              <div className="journey-card-footer">
                {product ? (
                  <>
                    <Link
                      className="button full"
                      to={
                        product.targetUrl
                          ? `/go/${product.slug}?placement=home_journey`
                          : product.detailEnabled
                            ? `/products/${product.slug}`
                            : `/go/${product.slug}`
                      }
                      onClick={() =>
                        void track("product_card_clicked", {
                          productId: product.id,
                          placement: "home_journey",
                          position: index,
                        })
                      }
                    >
                      {product.targetUrl ? "开始使用" : "了解产品"}
                    </Link>
                    {stage.products.length > 1 ? (
                      <Link className="journey-more" to={`/stages/${stage.id}`}>
                        查看该阶段 {stage.products.length} 款产品
                      </Link>
                    ) : (
                      <span className="journey-footnote">
                        {product.targetUrl ? "前往独立产品" : "访问链接待接入"}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="journey-coming-soon">敬请期待</span>
                    <span className="journey-footnote">好工具，值得等一等</span>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="journey-summary">
        <span>每一步，都算数。</span>
        <span>
          {groups.length - upcoming} 个阶段已有产品
          {upcoming ? ` · ${upcoming} 个阶段敬请期待` : " · 按自己的节奏出发"}
        </span>
      </div>
    </>
  );
}
