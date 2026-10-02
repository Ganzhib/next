import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AppProvider, useApp } from "./app/context";
import { Layout } from "./components/layout";
import { Home } from "./pages/home";
import { DirectionPage } from "./pages/direction";
import { Catalog, ProductDetail, Launch, Compare } from "./pages/catalog";
import {
  Collections,
  CollectionDetail,
  TaxonomyPage,
  Rankings,
} from "./pages/discover";
import {
  Workspace,
  Settings,
  SubmissionPage,
  Notifications,
  InfoPage,
} from "./pages/workspace";
import {
  AdminLayout,
  AdminProducts,
  ProductEditor,
  AdminTaxonomies,
  AdminAnalytics,
  AdminSubmissions,
} from "./pages/admin";
import { Empty } from "./components/ui";
import "./styles/main.scss";
import "./styles/_cms.scss";
import { AdminPages, PromotionEditor } from "./pages/admin-server";
import { PromotionPage } from "./pages/promotion";
import {
  SimpleHomepage,
  SimpleProductEditor,
  SimpleSettings,
} from "./pages/admin-simple";
import "./styles/_admin-simple.scss";
function App() {
  const { loading, error } = useApp();
  if (error)
    return (
      <div className="boot">
        <h1>暂时无法加载网站内容</h1>
        <p>{error}</p>
        <button onClick={() => location.reload()}>重新加载</button>
      </div>
    );
  if (loading)
    return (
      <div className="boot">
        <span className="brand-mark">N</span>
        <p>正在准备你的下一程…</p>
      </div>
    );
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="directions/:id" element={<DirectionPage />} />
        <Route path="p/:slug" element={<PromotionPage />} />
        <Route path="products" element={<Catalog />} />
        <Route path="products/:slug" element={<ProductDetail />} />
        <Route path="search" element={<Catalog />} />
        {["categories", "stages", "roles"].map((path) => (
          <React.Fragment key={path}>
            <Route path={path} element={<TaxonomyPage />} />
            <Route path={`${path}/:slug`} element={<Catalog />} />
          </React.Fragment>
        ))}
        <Route path="collections" element={<Collections />} />
        <Route path="collections/:slug" element={<CollectionDetail />} />
        <Route path="rankings" element={<Rankings />} />
        <Route path="rankings/:slug" element={<Rankings />} />
        <Route path="compare" element={<Compare />} />
        <Route path="go/:slug" element={<Launch />} />
        {["dashboard", "favorites", "history"].map((path) => (
          <Route key={path} path={path} element={<Workspace />} />
        ))}
        <Route path="settings/*" element={<Settings />} />
        <Route path="notifications" element={<Notifications />} />
        {["submit", "feedback", "claim/:slug"].map((path) => (
          <Route key={path} path={path} element={<SubmissionPage />} />
        ))}
        {["about", "privacy", "terms"].map((path) => (
          <Route key={path} path={path} element={<InfoPage />} />
        ))}
        <Route path="login" element={<Navigate to="/settings" replace />} />
        <Route
          path="*"
          element={
            <div className="container section">
              <Empty
                title="这条路，暂时还没通往目的地。"
                description="链接可能有误，回到首页重新发现。"
              >
                <Link className="button" to="/">
                  回到首页
                </Link>
              </Empty>
            </div>
          }
        />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/homepage" replace />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<SimpleProductEditor />} />
        <Route path="products/:id" element={<SimpleProductEditor />} />
        <Route path="products/:id/advanced" element={<ProductEditor />} />
        {["categories", "tags", "job-stages", "job-roles"].map((path) => (
          <Route key={path} path={path} element={<AdminTaxonomies />} />
        ))}
        <Route path="homepage" element={<SimpleHomepage />} />
        <Route
          path="content"
          element={<Navigate to="/admin/homepage" replace />}
        />
        <Route path="pages" element={<AdminPages />} />
        <Route path="pages/new" element={<PromotionEditor />} />
        <Route path="pages/:id" element={<PromotionEditor />} />
        <Route path="navigation" element={<SimpleSettings />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="funnels" element={<AdminAnalytics />} />
        <Route path="submissions" element={<AdminSubmissions />} />
        <Route path="claims" element={<AdminSubmissions />} />
        <Route path="audit-logs" element={<SimpleSettings />} />
        <Route path="settings" element={<SimpleSettings />} />
        <Route path="users" element={<SimpleSettings />} />
        <Route
          path="roles-permissions"
          element={<Navigate to="/admin/users" replace />}
        />
        {[
          "commercial",
          "experiments",
          "relationships",
          "seo",
          "feature-flags",
          "collections",
          "placements",
          "notifications",
          "link-health",
        ].map((path) => (
          <Route
            key={path}
            path={path}
            element={<Navigate to="/admin/homepage" replace />}
          />
        ))}
        <Route path="*" element={<Empty title="尚未找到这个管理页面" />} />
      </Route>
    </Routes>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
