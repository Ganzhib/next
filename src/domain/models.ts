import { z } from "zod";

export const productSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "请输入产品名称"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "标识只允许小写字母、数字和连字符"),
  tagline: z.string().trim().min(1, "请输入一句话介绍"),
  description: z.string(),
  category: z.string(),
  stage: z.string(),
  tags: z.array(z.string()),
  roles: z.array(z.string()),
  pricing: z.enum(["free", "freemium", "paid", "contact"]),
  openSource: z.boolean(),
  chinese: z.boolean(),
  requiresAccount: z.boolean(),
  ownership: z.enum(["first_party", "partner", "external"]),
  status: z.enum(["draft", "published", "hidden", "archived", "scheduled"]),
  release: z.enum(["planned", "beta", "live"]),
  targetUrl: z.string(),
  allowedDomains: z.array(z.string()),
  featured: z.boolean(),
  order: z.number(),
  accent: z.string(),
  icon: z.string(),
  features: z.array(z.string()),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  audience: z.string(),
  githubUrl: z.string(),
  logo: z.string(),
  detailEnabled: z.boolean(),
  tracking: z.enum([
    "outbound_only",
    "shared_analytics",
    "conversion_callback",
  ]),
  health: z.enum(["unknown", "healthy", "unreachable"]),
  verifiedAt: z.string(),
  updatedAt: z.string(),
  createdAt: z.string(),
  demo: z.boolean(),
  sponsored: z.boolean(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  scheduledAt: z.string(),
});
export type Product = z.infer<typeof productSchema>;
export interface Taxonomy {
  id: string;
  name: string;
  kind: "category" | "stage" | "role" | "tag";
  description: string;
  icon: string;
  order: number;
}
export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  color: string;
  productIds: string[];
  steps: string[];
  status: "published" | "draft";
  order: number;
}
export interface Placement {
  id: string;
  name: string;
  title: string;
  productIds: string[];
  enabled: boolean;
  order: number;
}
export interface Activity {
  id: string;
  name: string;
  productId?: string;
  collectionId?: string;
  placement?: string;
  position?: number;
  query?: string;
  launchId?: string;
  sessionId: string;
  actorId: string;
  path: string;
  occurredAt: string;
}
export interface Audit {
  id: string;
  action: string;
  target: string;
  actor: string;
  occurredAt: string;
}
export interface Profile {
  id: string;
  name: string;
  role: string;
  stage: string;
  favorites: string[];
  collections: string[];
  history: { productId: string; visitedAt: string }[];
  hidden: string[];
  analytics: boolean;
  personalized: boolean;
  notifications: boolean;
}
export interface Submission {
  id: string;
  kind: "product" | "feedback" | "claim";
  name: string;
  url: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}
export interface HomeModule {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  enabled: boolean;
  order: number;
}
export interface SiteSettings {
  homeContent?: import('./content').HomeContent;
  id: string;
  brand: string;
  tagline: string;
  announcement: string;
  showAnnouncement: boolean;
  showDemos: boolean;
  theme: "light" | "dark";
  adminPinHash: string;
  adminSalt: string;
  homeModules?: HomeModule[];
  navigation?: NavigationItem[];
}
export interface Notice {
  id: string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}
export interface RecordNote {
  id: string;
  kind: string;
  title: string;
  description: string;
  enabled: boolean;
  value: string;
  createdAt: string;
}
export interface EntityMap {
  products: Product;
  taxonomies: Taxonomy;
  collections: Collection;
  placements: Placement;
  events: Activity;
  audit: Audit;
  profiles: Profile;
  submissions: Submission;
  settings: SiteSettings;
  notices: Notice;
  records: RecordNote;
}
export type StoreName = keyof EntityMap;
export const stores: StoreName[] = [
  "products",
  "taxonomies",
  "collections",
  "placements",
  "events",
  "audit",
  "profiles",
  "submissions",
  "settings",
  "notices",
  "records",
];
export const pricingLabels = {
  free: "免费",
  freemium: "免费体验",
  paid: "付费",
  contact: "联系咨询",
};
export const statusLabels = {
  draft: "草稿",
  published: "已发布",
  hidden: "已隐藏",
  archived: "已归档",
  scheduled: "定时发布",
};
export const ownershipLabels = {
  first_party: "自有产品",
  partner: "合作产品",
  external: "精选工具",
};
