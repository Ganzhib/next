import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { repository } from "../storage";
import { serverMode, loadSession, HttpRepository } from "../storage/http";
import type { Operation } from "../storage/repository";
import {
  seed,
  defaultProfile,
  defaultSettings,
  now,
  uid,
} from "../domain/seed";
import type {
  Activity,
  Collection,
  EntityMap,
  Placement,
  Product,
  Profile,
  SiteSettings,
  StoreName,
  Taxonomy,
} from "../domain/models";
interface AppState {
  products: Product[];
  allProducts: Product[];
  taxonomies: Taxonomy[];
  collections: Collection[];
  placements: Placement[];
  profile: Profile;
  settings: SiteSettings;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  save: <K extends StoreName>(
    store: K,
    value: EntityMap[K],
    action?: string,
  ) => Promise<void>;
  remove: (store: StoreName, id: string) => Promise<void>;
  track: (name: string, props?: Partial<Activity>) => Promise<void>;
  favorite: (id: string, collection?: boolean) => Promise<void>;
  toast: (message: string) => void;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  compare: string[];
  toggleCompare: (id: string) => void;
  admin: boolean;
  setAdmin: (v: boolean) => void;
}
const Context = createContext<AppState | null>(null);
function anonymousActor() {
  try {
    const key = "next-anonymous-actor";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = uid();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return "anonymous";
  }
}
export function AppProvider({ children }: { children: ReactNode }) {
  const [allProducts, setProducts] = useState<Product[]>([]),
    [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]),
    [collections, setCollections] = useState<Collection[]>([]),
    [placements, setPlacements] = useState<Placement[]>([]);
  const [profile, setProfile] = useState(defaultProfile),
    [settings, setSettings] = useState(defaultSettings),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [compare, setCompare] = useState<string[]>([]),
    [admin, setAdmin] = useState(false);
  const [sessionId] = useState(uid);
  const [personalTheme, setPersonalTheme] = useState<"light" | "dark" | null>(
    () => {
      try {
        const stored = localStorage.getItem("next-theme");
        return stored === "light" || stored === "dark" ? stored : null;
      } catch {
        return null;
      }
    },
  );
  const theme = personalTheme ?? settings.theme;
  function setTheme(value: "light" | "dark") {
    setPersonalTheme(value);
    try {
      localStorage.setItem("next-theme", value);
    } catch {
      /* 私密模式仍可在本页切换。 */
    }
  }
  const impressions = useRef(new Set<string>());
  const channel = useRef<BroadcastChannel | null>(null);
  const profileRef = useRef(profile);
  const toast = useCallback((m: string) => setMessage(m), []);
  useEffect(() => {
    if (message) {
      const id = setTimeout(() => setMessage(""), 4000);
      return () => clearTimeout(id);
    }
  }, [message]);
  const refresh = useCallback(async () => {
    if (repository instanceof HttpRepository) repository.invalidate();
    const [p, t, c, pl, pr, s] = await Promise.all([
      repository.list("products"),
      repository.list("taxonomies"),
      repository.list("collections"),
      repository.list("placements"),
      repository.get("profiles", "local"),
      repository.get("settings", "site"),
    ]);
    setProducts(p.sort((a, b) => a.order - b.order));
    setTaxonomies(t.sort((a, b) => a.order - b.order));
    setCollections(c.sort((a, b) => a.order - b.order));
    setPlacements(pl.sort((a, b) => a.order - b.order));
    const personal = pr ?? defaultProfile();
    if (
      serverMode &&
      localStorage.getItem("next-server-analytics-consent") !== "yes"
    )
      personal.analytics = false;
    setProfile(personal);
    profileRef.current = personal;
    setSettings(s ?? defaultSettings);
  }, []);
  useEffect(() => {
    (serverMode
      ? loadSession().then((session) => {
          setAdmin(Boolean(session));
        })
      : seed(repository)
    )
      .then(refresh)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "浏览器存储暂时不可用"),
      )
      .finally(() => setLoading(false));
  }, [refresh]);
  useEffect(() => {
    const expire = () => {
      setAdmin(false);
      void refresh().catch(() => {});
    };
    window.addEventListener("next-session-expired", expire);
    return () => window.removeEventListener("next-session-expired", expire);
  }, [refresh]);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const c = new BroadcastChannel("next-career-data");
    channel.current = c;
    c.onmessage = () => {
      void refresh().catch(() => toast("其他标签页的数据更新暂时无法读取"));
    };
    return () => {
      channel.current = null;
      c.close();
    };
  }, [refresh, toast]);
  useEffect(() => {
    if (loading || serverMode) return;
    let running = false;
    const publishDue = async () => {
      if (running) return;
      running = true;
      try {
        const due = (await repository.list("products")).filter(
          (p) =>
            p.status === "scheduled" &&
            p.scheduledAt &&
            Date.parse(p.scheduledAt) <= Date.now(),
        );
        if (due.length) {
          await repository.batch(
            due.map((p) => ({
              store: "products" as const,
              value: { ...p, status: "published" as const, updatedAt: now() },
            })),
          );
          await refresh();
          channel.current?.postMessage("changed");
        }
      } finally {
        running = false;
      }
    };
    void publishDue().catch(() => toast("定时发布检查失败，可在后台手动发布"));
    const interval = setInterval(
      () => void publishDue().catch(() => {}),
      60000,
    );
    return () => clearInterval(interval);
  }, [loading, refresh, toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const track = useCallback(
    async (name: string, props: Partial<Activity> = {}) => {
      if (!profile.analytics) return;
      if (name === "product_impression") {
        const key = `${props.productId}:${props.placement}:${location.pathname}`;
        if (impressions.current.has(key)) return;
        impressions.current.add(key);
      }
      try {
        await repository.put("events", {
          ...props,
          id: uid(),
          name,
          sessionId,
          actorId: serverMode ? anonymousActor() : "local",
          path: location.pathname,
          occurredAt: now(),
        });
      } catch {
        /* 非关键分析故障不影响访问。 */
      }
    },
    [profile.analytics, sessionId],
  );
  async function save<K extends StoreName>(
    store: K,
    value: EntityMap[K],
    action = "更新",
  ) {
    try {
      if (store !== "events" && store !== "profiles")
        await repository.batch([
          { store, value } as Operation,
          {
            store: "audit",
            value: {
              id: uid(),
              action,
              target: `${store} / ${value.id}`,
              actor: "本地运营者",
              occurredAt: now(),
            },
          },
        ]);
      else await repository.put(store, value);
      await refresh();
      channel.current?.postMessage("changed");
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败，请重试");
      throw e;
    }
  }
  async function remove(store: StoreName, id: string) {
    await repository.remove(store, id);
    await repository.put("audit", {
      id: uid(),
      action: "删除",
      target: `${store} / ${id}`,
      actor: "本地运营者",
      occurredAt: now(),
    });
    await refresh();
    channel.current?.postMessage("changed");
  }
  async function updateProfile(patch: Partial<Profile>) {
    if (serverMode && patch.analytics !== undefined)
      localStorage.setItem(
        "next-server-analytics-consent",
        patch.analytics ? "yes" : "no",
      );
    const previous = profileRef.current;
    const next = { ...previous, ...patch };
    profileRef.current = next;
    setProfile(next);
    try {
      await repository.put("profiles", next);
      channel.current?.postMessage("changed");
    } catch (e) {
      if (profileRef.current === next) {
        profileRef.current = previous;
        setProfile(previous);
      }
      toast("本地保存失败，请检查浏览器存储空间");
      throw e;
    }
  }
  async function favorite(id: string, collection = false) {
    const key = collection ? "collections" : "favorites";
    const exists = profile[key].includes(id);
    await updateProfile({
      [key]: exists
        ? profile[key].filter((x) => x !== id)
        : [...profile[key], id],
    });
    await track(
      collection
        ? "collection_favorited"
        : exists
          ? "product_unfavorited"
          : "product_favorited",
      collection ? { collectionId: id } : { productId: id },
    );
    toast(exists ? "已从收藏移除" : "已加入你的收藏");
  }
  function toggleCompare(id: string) {
    setCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) {
        toast("最多同时比较 4 个产品");
        return prev;
      }
      return [...prev, id];
    });
  }
  const products = allProducts.filter(
    (p) =>
      p.status === "published" &&
      p.release !== "planned" &&
      (!p.demo || settings.showDemos),
  );
  return (
    <Context.Provider
      value={{
        products,
        allProducts,
        taxonomies,
        collections,
        placements,
        profile,
        settings,
        theme,
        setTheme,
        loading,
        error,
        refresh,
        save,
        remove,
        track,
        favorite,
        toast,
        updateProfile,
        compare,
        toggleCompare,
        admin,
        setAdmin,
      }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </Context.Provider>
  );
}
export function useApp() {
  const c = useContext(Context);
  if (!c) throw new Error("缺少应用上下文");
  return c;
}
