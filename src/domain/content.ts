import { z } from "zod";

// 只保存结构化内容，不接受任意 HTML、脚本或 CSS。
export const linkSchema = z
  .string()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    if (/^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "请使用站内绝对路径或 HTTPS 链接");
export const imageSchema = linkSchema;
const text = z.string().max(400);
export const homeContentSchema = z.object({
  introKicker: text,
  introTitle: text,
  introDescription: text,
  journeyTitle: text,
  campusTitle: text,
  contributionTitle: text,
  cards: z
    .array(
      z.object({
        id: z.string().max(80),
        title: text,
        description: text,
        image: imageSchema,
        alt: text,
      }),
    )
    .max(16),
});
export type HomeContent = z.infer<typeof homeContentSchema>;
export const promotionSchema = z.object({
  id: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(100),
  description: z.string().max(300),
  eyebrow: z.string().max(80),
  image: imageSchema,
  imageAlt: text,
  status: z.enum(["draft", "published"]),
  sections: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        title: z.string().min(1).max(150),
        body: z.string().max(5000),
        image: imageSchema,
        imageAlt: text,
      }),
    )
    .max(20),
  ctaLabel: z.string().max(80),
  ctaUrl: linkSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Promotion = z.infer<typeof promotionSchema>;
export type AdminAccount = {
  id: string;
  username: string;
  name: string;
  role: "owner" | "editor";
  disabled: boolean;
  createdAt: string;
};
