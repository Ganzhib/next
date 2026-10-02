import { IndexedDbRepository } from "./indexed-db";
import type { Repository } from "./repository";
import { HttpRepository, serverMode } from "./http";
export const repository: Repository = serverMode
  ? new HttpRepository()
  : new IndexedDbRepository();
