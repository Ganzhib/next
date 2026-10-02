import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Compass,
  Menu,
  X,
  Search,
  Bookmark,
  Settings2,
  Sun,
  Moon,
} from "lucide-react";
import { useApp } from "../app/context";
import { defaultSettings } from "../domain/seed";
import { Modal, SearchInput } from "./ui";
export function Brand() {
  const { settings } = useApp();
  return (
    <Link to="/" className="brand" aria-label="下一程首页">
      <span className="brand-mark">
        N<span>↗</span>
      </span>
      <strong>
        NEXT<span>{settings.brand}</span>
      </strong>
    </Link>
  );
}
export function Layout() {
  const { settings, theme, setTheme, compare, track, products } = useApp();
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState("");
  const location = useLocation(),
    navigate = useNavigate();
  const lastPage = useRef("");
  const navigation = (settings.navigation ?? defaultSettings.navigation!)
    .filter((item) => item.enabled)
    .sort((a, b) => a.order - b.order);
  useEffect(() => {
    setMenu(false);
    window.scrollTo({ top: 0 });
    if (lastPage.current !== location.key) {
      lastPage.current = location.key;
      void track("page_viewed");
    }
  }, [location.pathname, location.key, track]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const matches = products.filter((p) =>
    `${p.name}${p.tagline}${p.tags.join("")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳至主要内容
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          {navigation.length > 0 && (
            <nav
              id="primary-navigation"
              className={menu ? "open" : ""}
              aria-label="主导航"
            >
              {navigation.map((n) => (
                <NavLink key={n.id} to={n.path} end={n.path === "/"}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="header-actions">
            <button
              className="header-search"
              aria-label="打开全局搜索"
              onClick={() => setSearch(true)}
            >
              <Search size={17} />
              <span>搜索工具</span>
            </button>
            <Link to="/favorites" className="icon-button" aria-label="我的收藏">
              <Bookmark size={19} />
            </Link>
            {navigation.length > 0 && (
              <button
                className="icon-button mobile-menu"
                onClick={() => setMenu(!menu)}
                aria-label="切换导航"
                aria-expanded={menu}
                aria-controls="primary-navigation"
              >
                {menu ? <X /> : <Menu />}
              </button>
            )}
          </div>
        </div>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-top">
          <div>
            <Brand />
            <p style={{ whiteSpace: "pre-line" }}>{settings.tagline}</p>
          </div>
          <div>
            <h4>发现产品</h4>
            <Link to="/products">全部产品</Link>
          </div>
          <div>
            <h4>一起完善</h4>
            <Link to="/submit">推荐一个产品</Link>
            <Link to="/feedback">意见与反馈</Link>
            <Link to="/about">关于下一程</Link>
          </div>
          <div>
            <h4>你的空间</h4>
            <Link to="/dashboard">我的工作台</Link>
            <Link to="/settings/privacy">隐私与数据</Link>
            <Link to="/admin">运营后台</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} NEXT 下一程{" "}
            <span className="footer-dot">·</span> 为认真准备的你而做
          </span>
          <div>
            <Link to="/privacy">隐私说明</Link>
            <Link to="/terms">使用条款</Link>
            <button
              className="icon-button"
              aria-label="切换明暗主题"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <Link to="/settings" aria-label="设置">
              <Settings2 size={16} />
            </Link>
          </div>
        </div>
      </footer>
      {compare.length > 0 && (
        <div className="compare-dock">
          <span>
            已选择 <strong>{compare.length}</strong> 个产品
          </span>
          <Link to="/compare" className="button small">
            开始对比
          </Link>
        </div>
      )}
      <Modal
        open={search}
        onClose={() => setSearch(false)}
        title="找到你的下一步"
        description="搜索产品名称、用途或关键词。"
      >
        <SearchInput value={query} onChange={setQuery} />
        <div className="command-results">
          {matches.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSearch(false);
                navigate(`/products/${p.slug}`);
              }}
            >
              <Compass size={18} />
              <span>
                {p.name}
                <small>{p.tagline}</small>
              </span>
            </button>
          ))}
          {!matches.length && (
            <p className="muted">没有匹配产品，试试「简历」或「面试」。</p>
          )}
        </div>
        <button
          className="button secondary full"
          onClick={() => {
            setSearch(false);
            navigate(`/search?q=${encodeURIComponent(query)}`);
          }}
        >
          查看全部搜索结果
        </button>
      </Modal>
    </>
  );
}
