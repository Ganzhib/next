import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useApp } from "../app/context";
import { directionGroups } from "../domain/home-config";
import { Illustration, type IllustrationId } from "../components/illustration";
import { Empty, ProductCard, SearchInput } from "../components/ui";

export function DirectionPage() {
  const { id } = useParams();
  const { products, placements, settings } = useApp();
  const [query, setQuery] = useState("");
  const directions = directionGroups(
    products,
    placements,
    settings.homeContent,
  );
  const direction = directions.find((d) => d.id === id);
  if (!direction)
    return (
      <div className="container section">
        <Empty
          title="没有找到这个方向"
          description="回到首页，看看其他学习与求职方向。"
        >
          <Link className="button" to="/">
            返回首页
          </Link>
        </Empty>
      </div>
    );
  const list = direction.products.filter((p) =>
    `${p.name} ${p.tagline} ${p.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="container direction-page">
      <Link
        to={direction.id.startsWith("career-") ? "/#featured" : "/#campus"}
        className="direction-back"
      >
        <ArrowLeft size={16} />
        全部方向
      </Link>
      <header className="direction-hero">
        <div className="direction-cover">
          {direction.image ? (
            <img src={direction.image} alt={direction.alt} />
          ) : (
            <Illustration
              id={direction.id as IllustrationId}
              alt={direction.alt}
              eager
              sizes="(max-width: 540px) 100px, 176px"
            />
          )}
        </div>
        <div>
          <span className="eyebrow">{direction.kind} / 工具合集</span>
          <h1>{direction.title}</h1>
          <p>{direction.description}</p>
          <span className="direction-count">
            {direction.products.length
              ? `${direction.products.length} 款工具，按你的需要挑选。`
              : "这个方向的好工具，正在路上。"}
          </span>
        </div>
      </header>
      <div className="direction-tools-heading">
        <h2>这个方向的工具</h2>
        {direction.products.length > 0 && (
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="在这个方向里找工具"
          />
        )}
      </div>
      {direction.products.length === 0 ? (
        <div className="direction-empty">
          <span className="eyebrow">COMING SOON</span>
          <h2>好工具，敬请期待。</h2>
          <p>
            这个方向暂未收录产品。你可以先看看其他方向，也欢迎推荐你用过的好工具。
          </p>
          <Link className="button secondary" to="/submit">
            推荐一个工具 <ArrowUpRight size={16} />
          </Link>
        </div>
      ) : list.length === 0 ? (
        <Empty
          title="这个方向里暂时没有匹配的工具"
          description="换个关键词，或清空搜索查看全部。"
        >
          <button className="button secondary" onClick={() => setQuery("")}>
            查看全部工具
          </button>
        </Empty>
      ) : (
        <div className="product-grid direction-products">
          {list.map((product, index) => (
            <div key={product.id} className="direction-product">
              <ProductCard
                product={product}
                position={index}
                placement={`direction_${direction.id}`}
              />
              {product.targetUrl && (
                <Link
                  className="direction-launch"
                  to={`/go/${product.slug}?placement=direction_${direction.id}`}
                >
                  前往独立产品 <ArrowUpRight size={15} />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
      <nav className="direction-siblings" aria-label="探索其他方向">
        <span>也可以看看</span>
        {directions
          .filter((d) => d.id !== id)
          .map((d) => (
            <Link
              key={d.id}
              to={`/directions/${d.id}`}
              onClick={() => setQuery("")}
            >
              {d.title}
              <ArrowUpRight size={13} />
            </Link>
          ))}
      </nav>
    </div>
  );
}
