import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Eye } from "lucide-react";
import { AdminTitle } from "./admin";
import { useApp } from "../app/context";
import { api, currentAdmin, serverMode } from "../storage/http";
import {
  promotionSchema,
  homeContentSchema,
  type AdminAccount,
  type Promotion,
  type HomeContent,
} from "../domain/content";
import { uid, now } from "../domain/seed";
import { campusDirections } from "../domain/campus";
import { careerJourney } from "../domain/journey";
import images from "../domain/image-manifest.json";
import { PromotionView } from "./promotion";
import { Modal } from "../components/ui";

function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
export function ImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="cms-image-field">
      <label>
        配图地址
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/media/… 或 https://…"
        />
      </label>
      <select
        aria-label="使用现有插画"
        value=""
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">使用现有漫画插画…</option>
        {Object.entries(images).map(([id, image]) => (
          <option key={id} value={image.webp[1].src}>
            {careerJourney.find((s) => `career-${s.id}` === id)?.name ??
              campusDirections.find((s) => `campus-${s.id}` === id)?.title ??
              id}
          </option>
        ))}
      </select>
      {value && (
        <img
          src={value}
          alt="配图预览"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}
      <small>
        留空保留默认配图。推荐使用已有优化插画，或你管理的 HTTPS 图片链接。
      </small>
    </div>
  );
}
export function ServerAccounts() {
  const { toast } = useApp();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState<
    (AdminAccount & { password: string }) | null
  >(null);
  const reload = () =>
    api<AdminAccount[]>("/admin/accounts")
      .then(setAccounts)
      .catch((e) => setError(e.message));
  useEffect(() => {
    if (currentAdmin?.role === "owner") void reload();
  }, []);
  if (currentAdmin?.role !== "owner")
    return (
      <>
        <AdminTitle
          title="管理员与权限"
          description="只有超级管理员可以管理账号。内容运营可以编辑、发布页面和产品，但不能配置账号或导入导出全站数据。"
        />
        <p>当前账号：{currentAdmin?.name} · 内容运营</p>
      </>
    );
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      await api(
        `/admin/accounts${form.id ? "/" + form.id : ""}`,
        form.id ? "PUT" : "POST",
        { ...form, password: form.password || undefined },
      );
      setForm(null);
      await reload();
      toast("账号已保存，旧会话已撤销");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AdminTitle
        title="让合适的人，一起维护下一程。"
        eyebrow="TEAM / 管理员"
        description="超级管理员可管理账号与备份；内容运营可管理产品、首页及宣传页。停用、改密和权限变更立即撤销该账号的旧会话。"
      >
        <button
          className="button"
          onClick={() => {
            setError("");
            setForm({
              id: "",
              username: "",
              name: "",
              role: "editor",
              disabled: false,
              createdAt: "",
              password: "",
            });
          }}
        >
          <Plus size={16} />
          新增管理员
        </button>
      </AdminTitle>
      <ErrorMessage message={error} />
      <div className="admin-panel cms-account-list">
        {accounts.map((account) => (
          <div className="setting-row" key={account.id}>
            <div>
              <h3>
                {account.name} <small>@{account.username}</small>
              </h3>
              <p>
                {account.role === "owner" ? "超级管理员" : "内容运营"} ·{" "}
                {account.disabled ? "已停用" : "可登录"}
              </p>
            </div>
            <div className="cms-actions">
              <button
                className="button secondary"
                onClick={() => {
                  setError("");
                  setForm({ ...account, password: "" });
                }}
              >
                编辑
              </button>
              <button
                className="icon-button"
                aria-label={`删除 ${account.username}`}
                disabled={account.id === currentAdmin?.id}
                onClick={() => {
                  if (
                    confirm(
                      `删除管理员 ${account.username}？此账号将立即失去访问权限。`,
                    )
                  )
                    void api(`/admin/accounts/${account.id}`, "DELETE")
                      .then(reload)
                      .catch((e) => setError(e.message));
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "编辑管理员" : "新增管理员"}
        description="密码至少 14 位。编辑账号时留空代表不修改密码。"
      >
        {form && (
          <form className="form" onSubmit={(e) => void submit(e)}>
            <label>
              账号
              <input
                required
                pattern="[a-zA-Z0-9_.-]{3,64}"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </label>
            <label>
              显示名称
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              权限
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value as AdminAccount["role"],
                  })
                }
              >
                <option value="editor">内容运营</option>
                <option value="owner">超级管理员</option>
              </select>
            </label>
            <label>
              密码
              <input
                type="password"
                autoComplete="new-password"
                required={!form.id}
                minLength={14}
                maxLength={128}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.disabled}
                onChange={(e) =>
                  setForm({ ...form, disabled: e.target.checked })
                }
              />
              停用账号
            </label>
            <ErrorMessage message={error} />
            <button className="button" disabled={busy}>
              {busy ? "正在保存…" : "保存账号"}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
export const defaultHomeContent: HomeContent = {
  introKicker: "不止求职 / LIFE ON CAMPUS",
  introTitle: "学好一门课，\n做出一个好项目。",
  introDescription: "从日常学习到毕业选择，找到适合你的工具。",
  journeyTitle: "求职的每一步，都在这里。",
  campusTitle: "在学校，也有自己的下一程。",
  contributionTitle: "还有什么学习难题，想让工具帮帮忙？",
  cards: [
    ...careerJourney.map((s) => ({
      id: `career-${s.id}`,
      title: s.name,
      description: s.note,
      image: "",
      alt: s.illustrationAlt,
    })),
    ...campusDirections.map((s) => ({
      id: `campus-${s.id}`,
      title: s.title,
      description: s.description,
      image: "",
      alt: s.alt,
    })),
  ],
};
export function HomeContentEditor() {
  const { settings, save, toast, products } = useApp();
  const [form, setForm] = useState({
      ...defaultHomeContent,
      cards: defaultHomeContent.cards.map((card) => {
        const stage = careerJourney.find((s) => `career-${s.id}` === card.id);
        const product =
          stage &&
          products.find((p) => !p.demo && stage.stages.includes(p.stage));
        return product ? { ...card, description: product.tagline } : card;
      }),
      ...settings.homeContent,
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const content = homeContentSchema.parse(form);
      await save("settings", { ...settings, homeContent: content });
      toast("首页图文已发布，所有访客可见");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AdminTitle
        title="把首页，写成你想讲的故事。"
        eyebrow="HOME CONTENT / 首页图文"
        description="修改文字和配图，保留现有漫画风格与响应式布局。模块显隐和顺序在「首页编排」调整。"
      />
      <form className="form" onSubmit={(e) => void submit(e)}>
        <div className="admin-panel form">
          <h2>首页文案</h2>
          {(
            [
              ["introKicker", "介绍区眉题"],
              ["introTitle", "主标题（可换行）"],
              ["introDescription", "介绍短句"],
              ["journeyTitle", "求职区标题"],
              ["campusTitle", "校园区标题"],
              ["contributionTitle", "反馈引导"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <textarea
                aria-label={label}
                value={form[key]}
                maxLength={400}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <div className="cms-card-grid">
          {form.cards.map((card, index) => (
            <div className="admin-panel form" key={card.id}>
              <span className="eyebrow">{card.id}</span>
              <label>
                标题
                <input
                  value={card.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cards: form.cards.map((c, i) =>
                        i === index ? { ...c, title: e.target.value } : c,
                      ),
                    })
                  }
                />
              </label>
              <label>
                简短说明
                <textarea
                  value={card.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cards: form.cards.map((c, i) =>
                        i === index ? { ...c, description: e.target.value } : c,
                      ),
                    })
                  }
                />
              </label>
              <ImageField
                value={card.image}
                onChange={(image) =>
                  setForm({
                    ...form,
                    cards: form.cards.map((c, i) =>
                      i === index ? { ...c, image } : c,
                    ),
                  })
                }
              />
              <label>
                图片描述
                <input
                  value={card.alt}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cards: form.cards.map((c, i) =>
                        i === index ? { ...c, alt: e.target.value } : c,
                      ),
                    })
                  }
                />
              </label>
            </div>
          ))}
        </div>
        <ErrorMessage message={error} />
        <div className="cms-save-bar">
          <Link className="button secondary" target="_blank" to="/">
            查看首页
          </Link>
          <button className="button" disabled={busy}>
            <Save size={16} />
            {busy ? "正在保存…" : "发布首页图文"}
          </button>
        </div>
      </form>
    </>
  );
}
export function AdminPages() {
  const [pages, setPages] = useState<Promotion[]>([]),
    [error, setError] = useState("");
  const reload = () =>
    api<Promotion[]>("/admin/data/promotions")
      .then(setPages)
      .catch((e) => setError(e.message));
  useEffect(() => {
    if (serverMode) void reload();
  }, []);
  return (
    <>
      <AdminTitle
        title="每个好想法，都有自己的页面。"
        eyebrow="CAMPAIGNS / 宣传页面"
        description="创建活动、产品介绍或校园专题。草稿仅管理员可见，发布后通过 /p/页面标识 访问；可在导航管理中添加入口。"
      >
        <Link className="button" to="/admin/pages/new">
          <Plus size={16} />
          新建宣传页
        </Link>
      </AdminTitle>
      <ErrorMessage message={error} />
      {!serverMode ? (
        <p>宣传页需要服务端模式，请启动后端。</p>
      ) : pages.length ? (
        <div className="cms-card-grid">
          {pages.map((page) => (
            <article className="admin-panel cms-page-card" key={page.id}>
              {page.image && (
                <img src={page.image} alt={page.imageAlt} loading="lazy" />
              )}
              <span className="status-badge">
                {page.status === "published" ? "已发布" : "草稿"}
              </span>
              <h2>{page.title}</h2>
              <p>{page.description}</p>
              <small>/p/{page.slug}</small>
              <div className="cms-actions">
                <Link
                  className="button secondary"
                  to={`/admin/pages/${page.id}`}
                >
                  编辑
                </Link>
                {page.status === "published" && (
                  <Link
                    className="text-link"
                    target="_blank"
                    to={`/p/${page.slug}`}
                  >
                    查看页面
                  </Link>
                )}
                <button
                  className="icon-button"
                  aria-label={`删除 ${page.title}`}
                  onClick={() => {
                    if (
                      confirm(`删除「${page.title}」？已分享的链接将不再可用。`)
                    )
                      void api(`/admin/data/promotions/${page.id}`, "DELETE")
                        .then(reload)
                        .catch((e) => setError(e.message));
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-panel">
          <h2>第一张宣传页，从一个主题开始。</h2>
          <p>可以介绍新工具、发布校园活动，或整理一份学习指南。</p>
        </div>
      )}
    </>
  );
}
const blankPage = (): Promotion => ({
  id: uid(),
  slug: "",
  title: "",
  description: "",
  eyebrow: "NEXT / 校园探索",
  image: "",
  imageAlt: "",
  status: "draft",
  sections: [],
  ctaLabel: "",
  ctaUrl: "",
  createdAt: now(),
  updatedAt: now(),
});
export function PromotionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useApp();
  const [form, setForm] = useState(blankPage),
    [original, setOriginal] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(id !== undefined),
    [preview, setPreview] = useState(false);
  useEffect(() => {
    if (id)
      void api<Promotion[]>("/admin/data/promotions")
        .then((pages) => {
          const page = pages.find((p) => p.id === id);
          if (!page) throw new Error("页面不存在");
          setForm(page);
          setOriginal(page.updatedAt);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
  }, [id]);
  async function save(status: Promotion["status"]) {
    setBusy(true);
    setError("");
    try {
      const page = promotionSchema.parse({ ...form, status });
      await api(`/admin/pages/${page.id}`, "PUT", {
        page,
        expectedUpdatedAt: original,
      });
      toast(status === "published" ? "宣传页已发布" : "草稿已保存");
      navigate("/admin/pages");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function move(index: number, delta: number) {
    const sections = [...form.sections];
    [sections[index], sections[index + delta]] = [
      sections[index + delta],
      sections[index],
    ];
    setForm({ ...form, sections });
  }
  if (loading) return <p>正在载入宣传页…</p>;
  return (
    <>
      <AdminTitle
        title={id ? "编辑宣传页" : "给新故事，留一张画布。"}
        description="填写图文、调整段落顺序并预览。保存草稿不会对访客公开；已发布页面改存草稿会立即下线。"
      >
        <button
          className="button secondary"
          onClick={() => setPreview(!preview)}
        >
          <Eye size={16} />
          {preview ? "继续编辑" : "预览"}
        </button>
      </AdminTitle>
      <ErrorMessage message={error} />
      {preview ? (
        <div className="cms-preview">
          <PromotionView page={form} />
        </div>
      ) : (
        <div className="form">
          <div className="admin-panel form">
            <div className="form-grid">
              <label>
                页面标题
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label>
                链接标识（英文小写和连字符）
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="campus-guide"
                />
              </label>
            </div>
            <label>
              眉题
              <input
                value={form.eyebrow}
                onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
              />
            </label>
            <label>
              页面摘要
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <ImageField
              value={form.image}
              onChange={(image) => setForm({ ...form, image })}
            />
            <label>
              封面图片描述
              <input
                value={form.imageAlt}
                onChange={(e) => setForm({ ...form, imageAlt: e.target.value })}
              />
            </label>
          </div>
          {form.sections.map((section, index) => (
            <div className="admin-panel form" key={section.id}>
              <div className="cms-actions">
                <h3>图文段落 {index + 1}</h3>
                <button
                  className="icon-button"
                  disabled={!index}
                  aria-label="上移段落"
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  className="icon-button"
                  disabled={index === form.sections.length - 1}
                  aria-label="下移段落"
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label="删除段落"
                  onClick={() =>
                    setForm({
                      ...form,
                      sections: form.sections.filter(
                        (s) => s.id !== section.id,
                      ),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <label>
                段落标题
                <input
                  value={section.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sections: form.sections.map((s) =>
                        s.id === section.id
                          ? { ...s, title: e.target.value }
                          : s,
                      ),
                    })
                  }
                />
              </label>
              <label>
                正文
                <textarea
                  rows={5}
                  value={section.body}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sections: form.sections.map((s) =>
                        s.id === section.id
                          ? { ...s, body: e.target.value }
                          : s,
                      ),
                    })
                  }
                />
              </label>
              <ImageField
                value={section.image}
                onChange={(image) =>
                  setForm({
                    ...form,
                    sections: form.sections.map((s) =>
                      s.id === section.id ? { ...s, image } : s,
                    ),
                  })
                }
              />
              <label>
                图片描述
                <input
                  value={section.imageAlt}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sections: form.sections.map((s) =>
                        s.id === section.id
                          ? { ...s, imageAlt: e.target.value }
                          : s,
                      ),
                    })
                  }
                />
              </label>
            </div>
          ))}
          <button
            className="button secondary"
            disabled={form.sections.length >= 20}
            onClick={() =>
              setForm({
                ...form,
                sections: [
                  ...form.sections,
                  { id: uid(), title: "", body: "", image: "", imageAlt: "" },
                ],
              })
            }
          >
            <Plus size={16} />
            添加图文段落
          </button>
          <div className="admin-panel form">
            <h3>行动按钮（可选）</h3>
            <label>
              按钮文案
              <input
                value={form.ctaLabel}
                onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
              />
            </label>
            <label>
              目标链接
              <input
                value={form.ctaUrl}
                onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                placeholder="https://… 或 /products"
              />
            </label>
          </div>
        </div>
      )}
      <div className="cms-save-bar">
        <Link to="/admin/pages" className="text-link">
          返回列表
        </Link>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void save("draft")}
        >
          保存草稿{form.status === "published" ? "并下线" : ""}
        </button>
        <button
          className="button"
          disabled={busy}
          onClick={() => void save("published")}
        >
          {busy ? "正在保存…" : "发布页面"}
        </button>
      </div>
    </>
  );
}
