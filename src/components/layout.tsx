import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="淘气工具铺首页">
      <span className="brand-logo"><img src="/brand/taoqi-logo.jpg" alt="" /></span>
      <strong>淘气工具铺<span>TAOQI TOOLBOX</span></strong>
    </Link>
  );
}

export function Layout() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("toolbox-theme") === "dark" ? "dark" : "light",
  );
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("toolbox-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  return (
    <>
      <a className="skip-link" href="#main-content">跳至主要内容</a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <div className="header-actions">
            <a className="header-search" href="/#tools">浏览工具</a>
            <button
              className="icon-button"
              aria-label="切换明暗主题"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </div>
      </header>
      <main id="main-content"><Outlet /></main>
      <footer className="site-footer">
        <div className="footer-top">
          <div>
            <Brand />
            <p>好工具，应该让事情变简单。</p>
          </div>
          <div>
            <h4>工具集合</h4>
            <a href="/#tools">全部工具</a>
          </div>
          <div>
            <h4>当前收录</h4>
            <span>效率 · 求职 · 创作</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} 淘气工具铺</span>
          <span>少一点寻找，多一点完成。</span>
        </div>
      </footer>
    </>
  );
}
