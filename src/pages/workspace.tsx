import { useEffect, useState, type FormEvent } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Bookmark,
  Clock3,
  Compass,
  Download,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { useApp } from "../app/context";
import {
  Empty,
  Modal,
  PageIntro,
  ProductCard,
  SectionTitle,
} from "../components/ui";
import { now, uid } from "../domain/seed";
import { repository } from "../storage";
import { safeTarget } from "../domain/security";
import type { Notice } from "../domain/models";
export function downloadJson(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function Workspace() {
  const { products, profile, collections } = useApp();
  const path = useLocation().pathname;
  const favorites = path === "/favorites",
    history = path === "/history";
  const picked = favorites
    ? products.filter((p) => profile.favorites.includes(p.id))
    : history
      ? profile.history
          .map((h) => products.find((p) => p.id === h.productId))
          .filter((p): p is (typeof products)[number] => !!p)
      : products.filter((p) => !profile.hidden.includes(p.id));
  return (
    <div className="container workspace-page">
      <PageIntro
        eyebrow="YOUR SPACE / 我的工作台"
        title={
          favorites
            ? "留给下一步的好工具。"
            : history
              ? "从上次离开的地方继续。"
              : `${profile.name}，今天也向前一步。`
        }
        description="你的收藏、访问和偏好保存在当前浏览器，可以随时导出。"
      >
        <Link className="button secondary" to="/settings">
          <Settings2 size={17} />
          偏好设置
        </Link>
      </PageIntro>
      <div className="workspace-nav">
        <NavLink to="/dashboard">
          <Compass size={17} />
          我的概览
        </NavLink>
        <NavLink to="/favorites">
          <Bookmark size={17} />
          我的收藏
        </NavLink>
        <NavLink to="/history">
          <Clock3 size={17} />
          最近使用
        </NavLink>
      </div>
      {!favorites && !history && (
        <>
          <div className="workspace-summary">
            <div className="workspace-profile">
              <span className="avatar big">{profile.name[0]}</span>
              <div>
                <span className="eyebrow">你的下一程</span>
                <h2>{profile.role}</h2>
                <p>当前阶段 · {profile.stage}</p>
              </div>
              <Link to="/settings/preferences">调整目标</Link>
            </div>
            <div>
              <strong>
                {profile.favorites.length.toString().padStart(2, "0")}
              </strong>
              <span>收藏的产品</span>
            </div>
            <div>
              <strong>
                {profile.history.length.toString().padStart(2, "0")}
              </strong>
              <span>访问过的产品</span>
            </div>
            <div>
              <strong>
                {profile.collections.length.toString().padStart(2, "0")}
              </strong>
              <span>收藏的路线</span>
            </div>
          </div>
          <SectionTitle
            eyebrow="YOUR NEXT MOVE"
            title={profile.personalized ? "为你的下一步准备" : "编辑精选"}
            to="/products"
          />
          <p className="recommendation-reason">
            {profile.personalized
              ? `根据你选择的「${profile.role}」与「${profile.stage}」，建议先完善简历，再练习讲述。`
              : "个性化推荐已关闭，以下按编辑顺序展示。"}
          </p>
        </>
      )}
      {picked.length ? (
        <div className="product-grid">
          {picked.map((p) => (
            <ProductCard key={p.id} product={p} placement="workspace" />
          ))}
        </div>
      ) : (
        <Empty
          title={
            favorites ? "先留下一款真正想用的产品" : "你的下一程，还未出发"
          }
          description={
            favorites
              ? "点击产品卡片上的书签，即可加入你的工具箱。"
              : "访问过的产品会保留在这里，方便你下一次继续。"
          }
        >
          <Link className="button" to="/products">
            发现产品
          </Link>
        </Empty>
      )}
      {favorites && profile.collections.length > 0 && (
        <section className="section">
          <SectionTitle title="收藏的路线" />
          <div className="collection-grid">
            {collections
              .filter((c) => profile.collections.includes(c.id))
              .map((c) => (
                <Link
                  className={`collection-card ${c.color}`}
                  to={`/collections/${c.slug}`}
                  key={c.id}
                >
                  <h3>{c.title}</h3>
                  <p>{c.description}</p>
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
export function Settings() {
  const { profile, updateProfile, settings, save, toast, refresh } = useApp();
  const path = useLocation().pathname;
  const [name, setName] = useState(profile.name),
    [role, setRole] = useState(profile.role),
    [stage, setStage] = useState(profile.stage),
    [confirm, setConfirm] = useState(false);
  const privacy = path.endsWith("privacy"),
    connections = path.endsWith("connections");
  async function submit(e: FormEvent) {
    e.preventDefault();
    await updateProfile({ name: name.trim() || "求职探索者", role, stage });
    toast("偏好已保存");
  }
  return (
    <div className="container section">
      <PageIntro
        eyebrow="PREFERENCES / 设置"
        title="让这个空间，更适合你。"
        description="数据由你掌控。当前使用浏览器本地存储，不会自动上传。"
      />
      <div className="settings-layout">
        <nav className="settings-nav">
          <NavLink to="/settings" end>
            <UserRound size={17} />
            个人资料
          </NavLink>
          <NavLink to="/settings/preferences">
            <Settings2 size={17} />
            偏好设置
          </NavLink>
          <NavLink to="/settings/connections">
            <Compass size={17} />
            产品连接
          </NavLink>
          <NavLink to="/settings/privacy">
            <ShieldCheck size={17} />
            隐私与数据
          </NavLink>
        </nav>
        <div className="settings-card">
          {connections ? (
            <>
              <h2>已连接的产品</h2>
              <Empty
                title="尚未连接产品账户"
                description="当前版本在浏览器本地运行。跨产品账户、身份认证和服务端回传，需要后续后端接入后启用。"
              />
              <Link to="/products" className="button secondary">
                浏览独立产品
              </Link>
            </>
          ) : privacy ? (
            <>
              <h2>隐私与数据</h2>
              <div className="setting-row">
                <div>
                  <h3>本地行为分析</h3>
                  <p>
                    同意后，将页面、曝光和跳转事件记录到本浏览器的
                    IndexedDB。不会上传至分析平台。
                  </p>
                </div>
                <input
                  type="checkbox"
                  aria-label="本地行为分析"
                  checked={profile.analytics}
                  onChange={(e) =>
                    void updateProfile({ analytics: e.target.checked })
                  }
                />
              </div>
              <div className="setting-row">
                <div>
                  <h3>个性化推荐</h3>
                  <p>根据你主动设置的岗位、阶段和收藏提供建议。</p>
                </div>
                <input
                  type="checkbox"
                  aria-label="个性化推荐"
                  checked={profile.personalized}
                  onChange={(e) =>
                    void updateProfile({ personalized: e.target.checked })
                  }
                />
              </div>
              <div className="setting-row">
                <div>
                  <h3>导出个人数据</h3>
                  <p>包含本地资料、收藏和访问历史。</p>
                </div>
                <button
                  className="button secondary small"
                  onClick={() =>
                    downloadJson("next-personal-data.json", profile)
                  }
                >
                  <Download size={15} />
                  导出
                </button>
              </div>
              <div className="setting-row">
                <div>
                  <h3>清除访问历史</h3>
                  <p>收藏和偏好不会受到影响。</p>
                </div>
                <button
                  className="button secondary small"
                  onClick={() => {
                    void updateProfile({ history: [] });
                    toast("访问历史已清除");
                  }}
                >
                  清除历史
                </button>
              </div>
              <div className="setting-row">
                <div>
                  <h3>删除本地个人数据</h3>
                  <p>删除个人资料、收藏、事件和通知，不删除运营产品库。</p>
                </div>
                <button
                  className="button danger small"
                  onClick={() => setConfirm(true)}
                >
                  <Trash2 size={15} />
                  删除
                </button>
              </div>
            </>
          ) : (
            <form className="form" onSubmit={(e) => void submit(e)}>
              <h2>你的目标与偏好</h2>
              <label>
                怎么称呼你
                <input
                  value={name}
                  maxLength={30}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label>
                目标岗位
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  {[
                    "前端工程师",
                    "Java 后端",
                    "Go 后端",
                    "Python 后端",
                    "算法工程师",
                    "AI 工程师",
                    "测试开发",
                    "数据工程师",
                    "DevOps / SRE",
                    "应届生",
                  ].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>
                当前求职阶段
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                >
                  {[
                    "确定方向",
                    "简历准备",
                    "技术准备",
                    "模拟面试",
                    "寻找岗位",
                    "投递管理",
                    "Offer 比较",
                  ].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <div className="setting-row">
                <div>
                  <h3>深色外观</h3>
                  <p>让夜晚的准备更舒适。</p>
                </div>
                <input
                  type="checkbox"
                  aria-label="深色外观"
                  checked={settings.theme === "dark"}
                  onChange={(e) =>
                    void save("settings", {
                      ...settings,
                      theme: e.target.checked ? "dark" : "light",
                    })
                  }
                />
              </div>
              <button className="button" type="submit">
                保存设置
              </button>
            </form>
          )}
        </div>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="删除本地个人数据？"
        description="该操作无法撤销。建议先导出数据备份。"
      >
        <div className="modal-actions">
          <button
            className="button secondary"
            onClick={() => setConfirm(false)}
          >
            保留数据
          </button>
          <button
            className="button danger"
            onClick={() => {
              void repository
                .clearPersonalData()
                .then(refresh)
                .then(() => {
                  setConfirm(false);
                  toast("本地个人数据已删除");
                });
            }}
          >
            确认删除
          </button>
        </div>
      </Modal>
    </div>
  );
}
export function SubmissionPage() {
  const path = useLocation().pathname;
  const { slug } = useParams();
  const [params] = useSearchParams();
  const { save, toast } = useApp();
  const [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const kind = path.startsWith("/claim")
    ? "claim"
    : path === "/feedback"
      ? "feedback"
      : "product";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const url = String(data.get("url") ?? "");
    try {
      setBusy(true);
      if (url) safeTarget(url, [new URL(url).hostname]);
      await save(
        "submissions",
        {
          id: uid(),
          kind,
          name: String(data.get("name")),
          url,
          description: String(data.get("description")),
          status: "pending",
          createdAt: now(),
        },
        "提交申请",
      );
      setDone(true);
      toast("已保存至本地待审核列表");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container section narrow-page">
      <PageIntro
        eyebrow="BUILD TOGETHER / 一起完善"
        title={
          kind === "claim"
            ? "认领你的产品。"
            : kind === "feedback"
              ? "让下一程，变得更好。"
              : "好产品，值得分享。"
        }
        description="每一条建议都会成为改善的起点。当前提交仅保存在此浏览器，可在运营后台查看。"
      />
      {done ? (
        <Empty
          title="已保存，谢谢你的认真推荐"
          description="你的提交已进入本地审核列表。后续接入服务器后，可将提交流程迁移为线上服务。"
        >
          <Link to="/products" className="button">
            继续发现产品
          </Link>
        </Empty>
      ) : (
        <form className="form settings-card" onSubmit={(e) => void submit(e)}>
          <label>
            {kind === "feedback" ? "反馈主题" : "产品名称"}
            <input
              name="name"
              required
              maxLength={100}
              defaultValue={slug ?? params.get("product") ?? ""}
              placeholder="告诉我们你想分享什么"
            />
          </label>
          {kind !== "feedback" && (
            <label>
              产品网址
              <input
                name="url"
                type="url"
                required
                placeholder="https://your-product.com"
              />
            </label>
          )}
          <label>
            {kind === "claim"
              ? "认领说明与证明方式"
              : kind === "feedback"
                ? "你的建议"
                : "为什么推荐它"}
            <textarea
              name="description"
              required
              minLength={5}
              rows={6}
              maxLength={3000}
              placeholder="描述具体场景、产品优点或你遇到的问题…"
            />
          </label>
          <label className="check-label">
            <input type="checkbox" required />
            我确认提交内容真实，不包含他人敏感信息。
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? "正在保存…" : "提交内容"}
          </button>
        </form>
      )}
    </div>
  );
}
export function Notifications() {
  const [items, setItems] = useState<Notice[]>([]);
  useEffect(() => {
    repository.list("notices").then(setItems);
  }, []);
  return (
    <div className="container section">
      <PageIntro
        eyebrow="UPDATES / 通知"
        title="值得知道的新消息。"
        description="产品更新与平台消息会显示在这里。"
      />
      {items.length ? (
        items.map((n) => (
          <article className="notice" key={n.id}>
            <h3>{n.title}</h3>
            <p>{n.content}</p>
            <small>{new Date(n.createdAt).toLocaleString("zh-CN")}</small>
            <button
              className="button small secondary"
              onClick={() => {
                void repository
                  .put("notices", { ...n, read: true })
                  .then(() =>
                    setItems(
                      items.map((x) =>
                        x.id === n.id ? { ...x, read: true } : x,
                      ),
                    ),
                  );
              }}
            >
              {n.read ? "已读" : "标记已读"}
            </button>
          </article>
        ))
      ) : (
        <Empty
          title="暂时没有新消息"
          description="没有消息的时候，就安心做自己的准备。"
        />
      )}
    </div>
  );
}
export function InfoPage() {
  const path = useLocation().pathname;
  const privacy = path === "/privacy",
    terms = path === "/terms";
  return (
    <div className="container section narrow-page">
      <PageIntro
        eyebrow="NEXT / 下一程"
        title={
          privacy
            ? "你的数据，你来掌控。"
            : terms
              ? "使用条款与产品边界。"
              : "为认真准备的人，做一个好入口。"
        }
        description={
          privacy
            ? "当前版本的数据处理说明。"
            : terms
              ? "了解平台与独立产品之间的关系。"
              : "好的工具，应该让准备更从容。"
        }
      />
      <div className="prose">
        {privacy ? (
          <>
            <h2>数据保存在你的浏览器</h2>
            <p>
              产品库、收藏、偏好、反馈及你允许记录的行为事件保存在当前网站来源的
              IndexedDB
              中。清除浏览器站点数据会删除这些记录，不同浏览器、设备与端口之间不会自动同步。
            </p>
            <h2>行为记录由你选择</h2>
            <p>
              行为分析默认关闭。你可以在隐私设置中开启本地统计，也可随时关闭或删除。记录不包含简历、面试内容、电话或邮箱。
            </p>
            <h2>外部服务</h2>
            <p>
              访问独立产品时，由对应网站处理其业务数据。页面可能请求 Google
              Fonts 字体资源；无法加载时会使用设备本地字体。
            </p>
            <Link className="button" to="/settings/privacy">
              管理隐私与数据
            </Link>
          </>
        ) : terms ? (
          <>
            <h2>产品发现与连接</h2>
            <p>
              下一程提供产品介绍、整理和访问入口。独立产品的功能、收费与账户由其运营者负责，使用前请阅读对应说明。
            </p>
            <h2>本地开发版本</h2>
            <p>
              当前的运营入口锁仅用于本设备交互隔离，不能替代服务端身份认证。这里的统计仅描述本浏览器记录，不能代表全站用户。
            </p>
            <h2>信息与演示数据</h2>
            <p>
              演示数据默认不在公开目录展示。未配置真实网址的产品不提供虚构访问入口。平台不承诺求职结果或面试成功率。
            </p>
          </>
        ) : (
          <>
            <p className="lead">
              我们相信，每一个认真准备的人，都值得拥有好用的工具。
            </p>
            <p>
              求职是一段需要持续行动的旅程。写简历、练表达、准备技术问题，每一步都有不同的难点。下一程把这些独立产品放在一个有秩序的入口，让你更快找到下一步。
            </p>
            <h2>我们的选择原则</h2>
            <p>
              说明适合谁，也说明不适合谁。展示优势，也保留局限。尊重真实数据，清楚区分自有产品、合作产品与外部推荐。
            </p>
            <h2>从两个产品开始，向更多可能出发</h2>
            <p>
              简历制作与 AI
              辅助面试，是首批接入的独立产品。平台通过后台持续收录和整理，不把你的求职过程限制在固定功能里。
            </p>
            <Link className="button" to="/submit">
              一起推荐好工具
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
