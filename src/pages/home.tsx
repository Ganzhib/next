import { Children, isValidElement, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../app/context";
import { defaultSettings } from "../domain/seed";
import { careerJourney } from "../domain/journey";
import { normalizeHomeModules } from "../domain/campus";
import { JourneyProducts } from "../components/journey-products";
import { CampusExplore } from "../components/campus-explore";
import { Icon, SearchInput } from "../components/ui";

export function Home() {
  const { track, settings } = useApp();
  const content = settings.homeContent;
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  return (
    <HomeCanvas>
      <section className="hero campus-bridge container" id="intro">
        <div className="hero-main">
          <div className="hero-kicker">
            {content?.introKicker ?? "不止求职 / LIFE ON CAMPUS"}
          </div>
          <h1>{content?.introTitle ?? "学好一门课，\n做出一个好项目。"}</h1>
        </div>
        <div className="campus-search">
          <p>
            {content?.introDescription ??
              "从日常学习到毕业选择，找到适合你的工具。"}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/search?q=${encodeURIComponent(query)}`);
            }}
          >
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="搜搜你现在需要的工具"
            />
          </form>
          <div className="popular-searches">
            <a href="#campus">看看校园探索</a>
            <Link to="/products">浏览全部产品</Link>
          </div>
        </div>
      </section>
      <section className="stage-ribbon" id="stages">
        <div className="container">
          <span className="ribbon-label">求职这一程</span>
          {careerJourney.map((stage, index) => (
            <a
              key={stage.id}
              href={`#journey-${stage.id}`}
              onClick={() =>
                void track("hero_intent_selected", { query: stage.name })
              }
            >
              <span className="step-num">0{index + 1}</span>
              <Icon name={stage.icon} size={18} />
              {content?.cards.find((c) => c.id === `career-${stage.id}`)
                ?.title ?? stage.name}
            </a>
          ))}
        </div>
      </section>
      <section className="container section featured-section" id="featured">
        <JourneyProducts />
      </section>
      <section className="container section campus-section" id="campus">
        <CampusExplore />
      </section>
      <section
        className="container contribution campus-contribution"
        id="contribution"
      >
        <h2>
          {content?.contributionTitle ?? "还有什么学习难题，想让工具帮帮忙？"}
        </h2>
        <Link className="button secondary" to="/feedback">
          告诉我们
        </Link>
      </section>
    </HomeCanvas>
  );
}

function HomeCanvas({ children }: { children: ReactNode }) {
  const { settings, placements } = useApp();
  const modules = normalizeHomeModules(
    settings.homeModules ?? defaultSettings.homeModules!,
  );
  const nodes = Children.toArray(children).filter(
    isValidElement<{ id?: string }>,
  );
  const moduleFor = (node: (typeof nodes)[number]) =>
    modules.find((module) => module.id === node.props.id);
  const orderFor = (node: (typeof nodes)[number]) =>
    node.props.id === "intro"
      ? (modules.find((module) => module.id === "featured")?.order ?? 2) + 0.5
      : (moduleFor(node)?.order ?? 0);
  return (
    <div className="home">
      {nodes
        .filter(
          (node) =>
            moduleFor(node)?.enabled !== false &&
            !(
              node.props.id === "featured" &&
              placements.find((placement) => placement.id === "home-primary")
                ?.enabled === false
            ),
        )
        .sort((a, b) => orderFor(a) - orderFor(b))}
    </div>
  );
}
