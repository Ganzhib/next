import type { EntityMap, StoreName } from "../domain/models";
import type { AdminAccount } from "../domain/content";
import type { Repository, Backup, Operation } from "./repository";
import { IndexedDbRepository } from "./indexed-db";
export const serverMode = import.meta.env.VITE_STORAGE_MODE !== "local";
export let currentAdmin: (AdminAccount & { csrf: string }) | null = null;
export async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(currentAdmin ? { "X-CSRF-Token": currentAdmin.csrf } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      currentAdmin = null;
      window.dispatchEvent(new Event("next-session-expired"));
    }
    const error = await response
      .json()
      .catch(() => ({ message: "服务连接失败，请检查后台是否启动" }));
    throw new Error(error.message || "请求失败");
  }
  return response.json();
}
export async function loadSession() {
  try {
    currentAdmin = await api("/auth/session");
  } catch {
    currentAdmin = null;
  }
  return currentAdmin;
}
export class HttpRepository implements Repository {
  private local = new IndexedDbRepository();
  private snapshot: Promise<
    Partial<{ [K in StoreName]: EntityMap[K][] }>
  > | null = null;
  invalidate() {
    this.snapshot = null;
  }
  async list<K extends StoreName>(store: K): Promise<EntityMap[K][]> {
    if (store === "profiles") return this.local.list(store);
    if (currentAdmin) return api(`/admin/data/${store}`);
    this.snapshot ??= api<Partial<{ [K in StoreName]: EntityMap[K][] }>>(
      "/content",
    ).catch((error) => {
      this.snapshot = null;
      throw error;
    });
    return (await this.snapshot)[store] ?? [];
  }
  async get<K extends StoreName>(store: K, id: string) {
    return (await this.list(store)).find((row) => row.id === id);
  }
  async put<K extends StoreName>(store: K, value: EntityMap[K]) {
    if (store === "profiles") return this.local.put(store, value);
    if (store === "audit") return; // 服务端在业务事务内生成日志，忽略旧界面的本地日志。
    if (store === "events") {
      await api("/events", "POST", value);
      return;
    }
    if (store === "submissions" && !currentAdmin) {
      await api("/submissions", "POST", value);
      return;
    }
    await this.batch([{ store, value } as Operation]);
  }
  async remove(store: StoreName, id: string) {
    if (store === "profiles") return this.local.remove(store, id);
    await api(`/admin/data/${store}/${encodeURIComponent(id)}`, "DELETE");
    this.invalidate();
  }
  async batch(operations: Operation[]) {
    const remote = operations.filter(
      (op) => !["profiles", "audit", "events"].includes(op.store),
    );
    if (remote.length) await api("/admin/batch", "POST", remote);
    for (const op of operations.filter(
      (op) => op.store === "profiles" || op.store === "events",
    ))
      await this.put(op.store, op.value);
    this.invalidate();
  }
  async exportData(): Promise<Backup> {
    return api("/admin/export");
  }
  async importData(data: unknown) {
    await api("/admin/import", "POST", data);
    this.invalidate();
  }
  async clearPersonalData() {
    await this.local.clearPersonalData();
    localStorage.removeItem("next-anonymous-actor");
    localStorage.removeItem("next-server-analytics-consent");
  }
}
