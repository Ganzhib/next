import { z } from "zod";
import { productSchema, stores } from "../domain/models";
const id = z.string().min(1);
const strings = z.array(z.string());
const profile = z.object({
  id,
  name: z.string(),
  role: z.string(),
  stage: z.string(),
  favorites: strings,
  collections: strings,
  history: z.array(z.object({ productId: id, visitedAt: z.string() })),
  hidden: strings,
  analytics: z.boolean(),
  personalized: z.boolean(),
  notifications: z.boolean(),
});
export const backupSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.string(),
    tables: z.object({
      products: z.array(productSchema),
      taxonomies: z.array(
        z.object({
          id,
          name: z.string(),
          kind: z.enum(["category", "stage", "role", "tag"]),
          description: z.string(),
          icon: z.string(),
          order: z.number(),
        }),
      ),
      collections: z.array(
        z.object({
          id,
          slug: z.string(),
          title: z.string(),
          description: z.string(),
          eyebrow: z.string(),
          color: z.string(),
          productIds: strings,
          steps: strings,
          status: z.enum(["published", "draft"]),
          order: z.number(),
        }),
      ),
      placements: z.array(
        z.object({
          id,
          name: z.string(),
          title: z.string(),
          productIds: strings,
          enabled: z.boolean(),
          order: z.number(),
        }),
      ),
      profiles: z.array(profile),
      events: z.array(
        z
          .object({
            id,
            name: z.string(),
            sessionId: id,
            actorId: id,
            path: z.string(),
            occurredAt: z.string(),
          })
          .passthrough(),
      ),
      audit: z.array(
        z.object({
          id,
          action: z.string(),
          target: z.string(),
          actor: z.string(),
          occurredAt: z.string(),
        }),
      ),
      submissions: z.array(
        z.object({
          id,
          kind: z.enum(["product", "feedback", "claim"]),
          name: z.string(),
          url: z.string(),
          description: z.string(),
          status: z.enum(["pending", "approved", "rejected"]),
          createdAt: z.string(),
        }),
      ),
      settings: z.array(
        z.object({
          id,
          brand: z.string(),
          tagline: z.string(),
          announcement: z.string(),
          showAnnouncement: z.boolean(),
          showDemos: z.boolean(),
          theme: z.enum(["light", "dark"]),
          adminPinHash: z.string(),
          adminSalt: z.string(),
          homeModules: z
            .array(
              z.object({
                id,
                label: z.string(),
                enabled: z.boolean(),
                order: z.number(),
              }),
            )
            .optional(),
          navigation: z
            .array(
              z.object({
                id,
                label: z.string(),
                path: z.string().regex(/^\/(?!\/)/),
                enabled: z.boolean(),
                order: z.number(),
              }),
            )
            .optional(),
        }),
      ),
      notices: z.array(
        z.object({
          id,
          title: z.string(),
          content: z.string(),
          read: z.boolean(),
          createdAt: z.string(),
        }),
      ),
      records: z.array(
        z.object({
          id,
          kind: z.string(),
          title: z.string(),
          description: z.string(),
          enabled: z.boolean(),
          value: z.string(),
          createdAt: z.string(),
        }),
      ),
    }),
  })
  .superRefine((backup, ctx) => {
    for (const name of stores) {
      const ids = backup.tables[name].map((r) => r.id);
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({ code: "custom", message: `${name} 存在重复 ID` });
    }
    if (
      backup.tables.settings.length !== 1 ||
      backup.tables.settings[0].id !== "site"
    )
      ctx.addIssue({
        code: "custom",
        message: "站点配置必须包含唯一 site 记录",
      });
    const slugs = backup.tables.products.map((p) => p.slug);
    if (new Set(slugs).size !== slugs.length)
      ctx.addIssue({ code: "custom", message: "产品标识重复" });
  });
