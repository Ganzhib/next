import { IndexedDbRepository } from "./indexed-db";
import type { Repository } from "./repository";
// 后端替换入口：将这里替换为 new HttpRepository('/api')。
export const repository: Repository = new IndexedDbRepository();
