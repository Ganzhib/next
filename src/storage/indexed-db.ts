import { openDB, type IDBPDatabase } from "idb";
import { stores, type EntityMap, type StoreName } from "../domain/models";
import type { Backup, Operation, Repository } from "./repository";
import { backupSchema } from "./validation";

/** IndexedDB 适配器。所有写入等待事务提交；多表修改使用同一个事务。 */
export class IndexedDbRepository implements Repository {
  private db: Promise<IDBPDatabase>;
  constructor(name = "next-career-v1") {
    this.db = openDB(name, 1, {
      upgrade(db) {
        for (const store of stores)
          db.createObjectStore(store, { keyPath: "id" });
      },
    });
  }
  async list<K extends StoreName>(store: K): Promise<EntityMap[K][]> {
    return (await this.db).getAll(store);
  }
  async get<K extends StoreName>(
    store: K,
    id: string,
  ): Promise<EntityMap[K] | undefined> {
    return (await this.db).get(store, id);
  }
  async put<K extends StoreName>(store: K, value: EntityMap[K]) {
    const tx = (await this.db).transaction(store, "readwrite");
    await tx.store.put(value);
    await tx.done;
  }
  async remove(store: StoreName, id: string) {
    const tx = (await this.db).transaction(store, "readwrite");
    await tx.store.delete(id);
    await tx.done;
  }
  async batch(operations: Operation[]) {
    if (!operations.length) return;
    const tx = (await this.db).transaction(
      [...new Set(operations.map((o) => o.store))],
      "readwrite",
    );
    for (const op of operations) await tx.objectStore(op.store).put(op.value);
    await tx.done;
  }
  async exportData(): Promise<Backup> {
    const tx = (await this.db).transaction(stores, "readonly");
    const tables = Object.fromEntries(
      await Promise.all(
        stores.map(async (s) => [s, await tx.objectStore(s).getAll()]),
      ),
    );
    await tx.done;
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      tables: tables as Backup["tables"],
    };
  }
  async importData(data: unknown) {
    const result = backupSchema.safeParse(data);
    if (!result.success)
      throw new Error(
        `备份校验失败：${result.error.issues[0].path.join(".")} ${result.error.issues[0].message}`,
      );
    const tables = result.data.tables;
    const tx = (await this.db).transaction(stores, "readwrite");
    for (const name of stores) {
      await tx.objectStore(name).clear();
      for (const row of tables[name] as EntityMap[typeof name][])
        await tx.objectStore(name).put(row);
    }
    await tx.done;
  }
  async clearPersonalData() {
    const tx = (await this.db).transaction(
      ["profiles", "events", "notices"],
      "readwrite",
    );
    for (const s of ["profiles", "events", "notices"])
      await tx.objectStore(s).clear();
    await tx.done;
  }
}
