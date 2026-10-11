import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, useApp } from "./app/context";
import { Layout } from "./components/layout";
import { Home } from "./pages/home";
import { AdminLayout, AdminProducts } from "./pages/admin";
import { SimpleHomepage, SimpleProductEditor, SimpleSettings } from "./pages/admin-simple";
import { ToolCollectionEditor } from "./pages/admin-tools";
import "./styles/main.scss";
import "./styles/_cms.scss";
import "./styles/_admin-simple.scss";

function App() {
  const { loading, error } = useApp();
  if (loading) return <div className="boot"><span className="brand-logo"><img src="/brand/taoqi-logo.jpg" alt="" /></span><p>正在准备淘气工具铺…</p></div>;
  if (error) return <div className="boot"><h1>暂时无法加载配置</h1><p>{error}</p><button onClick={() => location.reload()}>重新加载</button></div>;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/tools" replace />} />
        <Route path="tools" element={<ToolCollectionEditor />} />
        <Route path="homepage" element={<SimpleHomepage />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<SimpleProductEditor />} />
        <Route path="products/:id" element={<SimpleProductEditor />} />
        <Route path="settings" element={<SimpleSettings />} />
        <Route path="*" element={<Navigate to="/admin/tools" replace />} />
      </Route>
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><BrowserRouter><AppProvider><App /></AppProvider></BrowserRouter></React.StrictMode>,
);
