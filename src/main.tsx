import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AppProvider, useApp } from "./app/context";
import { Layout } from "./components/layout";
import { Home } from "./pages/home";
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
  AdminOverview,
  AdminProducts,
  ProductEditor,
  AdminTaxonomies,
  AdminCollections,
  AdminPlacements,
  AdminAnalytics,
  AdminSubmissions,
  AdminAudit,
  AdminLinkHealth,
  AdminSiteSettings,
  AdminUsers,
  AdminRecords,
  AdminNotifications,
} from "./pages/admin";
import { Empty } from "./components/ui";
import { HomepageEditor, NavigationEditor } from "./pages/admin-layout-editor";
import "./styles/main.scss";
import "./styles/_cms.scss";
import {
  AdminPages,
  PromotionEditor,
  HomeContentEditor,
} from "./pages/admin-server";
import { PromotionPage } from "./pages/promotion";
function App() {
  const { loading, error } = useApp();
  if (error)
    return (
      <div className="boot">
        <h1>暂时无法打开本地数据</h1>
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
        <Route index element={<AdminOverview />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<ProductEditor />} />
        <Route path="products/:id" element={<ProductEditor />} />
        {["categories", "tags", "job-stages", "job-roles"].map((path) => (
          <Route key={path} path={path} element={<AdminTaxonomies />} />
        ))}
        <Route path="collections" element={<AdminCollections />} />
        <Route path="placements" element={<AdminPlacements />} />
        <Route path="homepage" element={<HomepageEditor />} />
        <Route path="content" element={<HomeContentEditor />} />
        <Route path="pages" element={<AdminPages />} />
        <Route path="pages/new" element={<PromotionEditor />} />
        <Route path="pages/:id" element={<PromotionEditor />} />
        <Route path="navigation" element={<NavigationEditor />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="funnels" element={<AdminAnalytics />} />
        <Route path="submissions" element={<AdminSubmissions />} />
        <Route path="claims" element={<AdminSubmissions />} />
        <Route path="audit-logs" element={<AdminAudit />} />
        <Route path="link-health" element={<AdminLinkHealth />} />
        <Route path="settings" element={<AdminSiteSettings />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="roles-permissions" element={<AdminUsers />} />
        <Route path="notifications" element={<AdminNotifications />} />
        {[
          "commercial",
          "experiments",
          "relationships",
          "seo",
          "feature-flags",
        ].map((path) => (
          <Route key={path} path={path} element={<AdminRecords />} />
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
