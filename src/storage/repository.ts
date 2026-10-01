import type { EntityMap, StoreName } from "../domain/models";

/** 应用只依赖此异步契约。后续将实现替换为 HttpRepository，页面不直接访问数据库。 */
export interface Repository {
  list<K extends StoreName>(store: K): Promise<EntityMap[K][]>;
  get<K extends StoreName>(
    store: K,
    id: string,
  ): Promise<EntityMap[K] | undefined>;
  put<K extends StoreName>(store: K, value: EntityMap[K]): Promise<void>;
  remove(store: StoreName, id: string): Promise<void>;
  batch(operations: Operation[]): Promise<void>;
  exportData(): Promise<Backup>;
  importData(data: unknown): Promise<void>;
  clearPersonalData(): Promise<void>;
}
export type Operation = {
  [K in StoreName]: { store: K; value: EntityMap[K] };
}[StoreName];
export interface Backup {
  version: 1;
  exportedAt: string;
  tables: { [K in StoreName]: EntityMap[K][] };
}
