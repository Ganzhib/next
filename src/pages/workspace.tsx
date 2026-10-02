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
import { serverMode } from "../storage/http";
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
  const { profile, updateProfile, theme, setTheme, toast, refresh } = useApp();
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
        description="收藏与个人偏好保存在本机；网站内容、管理员和反馈由服务器保存。行为统计需单独同意。"
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
                    {serverMode
                      ? "默认关闭。开启后，将页面访问、产品曝光、搜索词和外链点击发送到 NEXT 服务器，使用随机匿名标识，保留 90 天。请勿在搜索词中输入个人敏感信息。"
                      : "同意后，将页面、曝光和跳转事件记录到本浏览器的 IndexedDB。不会上传至分析平台。"}
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
                  checked={theme === "dark"}
                  onChange={(e) =>
                    setTheme(e.target.checked ? "dark" : "light")
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
      toast(serverMode ? "已提交至服务器待审核列表" : "已保存至本地待审核列表");
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
        description={
          serverMode
            ? "每一条建议都会成为改善的起点。提交内容会保存到 NEXT 服务器，由运营人员处理。请勿填写密码、简历等敏感内容。"
            : "每一条建议都会成为改善的起点。当前提交仅保存在此浏览器，可在运营后台查看。"
        }
      />
      {done ? (
        <Empty
          title="已保存，谢谢你的认真推荐"
          description={
            serverMode
              ? "你的提交已进入运营审核列表，感谢一起完善下一程。"
              : "你的提交已进入本地审核列表。"
          }
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
            <h2>本机数据与服务器数据</h2>
            <p>
              收藏、个人偏好和访问历史保存在当前浏览器，不会自动上传。产品库、公开页面及你主动提交的反馈存储在
              NEXT 服务器。清除本地数据不会删除已提交的反馈或服务器记录。
            </p>
            <h2>行为记录由你选择</h2>
            <p>
              行为分析默认关闭。服务端模式下，单独同意后才发送页面访问、曝光、搜索词和外链点击，并用随机标识统计匿名访客，最多保留
              90
              天。你可随时关闭，关闭后停止新增上报。不要在搜索框输入敏感信息。统计不追踪第三方产品内部行为，也不收集你的简历和面试内容。
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
            <h2>运营与统计边界</h2>
            <p>
              线上运营入口使用服务端登录及权限校验。分析仅覆盖主动同意统计的访问者；随机访客标识不等于实名用户，清除浏览器数据可能产生新标识。产品跳转不代表第三方产品内部使用或付费转化。
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
