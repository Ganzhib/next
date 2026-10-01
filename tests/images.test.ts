import { expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import images from "../src/domain/image-manifest.json";

it("图片均有三档 AVIF/WebP、内容指纹和严格体积预算，原图不进入线上目录", () => {
  expect(Object.keys(images)).toHaveLength(8);
  for (const [id, image] of Object.entries(images)) {
    expect(existsSync(`assets/illustrations/${id}.png`)).toBe(true);
    expect(existsSync(`public/images/${id}.png`)).toBe(false);
    expect(image.placeholder.length).toBeLessThan(1200);
    for (const format of ["avif", "webp"] as const) {
      expect(image[format]).toHaveLength(3);
      for (const variant of image[format]) {
        const bytes = readFileSync(`public${variant.src}`);
        expect(bytes.length).toBe(variant.bytes);
        expect(bytes.length).toBeLessThan(format === "avif" ? 110000 : 180000);
        expect(variant.src).toContain(
          createHash("sha256").update(bytes).digest("hex").slice(0, 12),
        );
      }
    }
  }
});

it("桌面双倍像素密度首屏五图的 AVIF 总量小于 150 KB", () => {
  const bytes = Object.entries(images)
    .filter(([id]) => id.startsWith("career-"))
    .reduce((total, [, image]) => total + image.avif[1].bytes, 0);
  expect(bytes).toBeLessThan(150000);
});
