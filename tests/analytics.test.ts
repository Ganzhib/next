import { expect, it } from "vitest";
import { exposureConversion } from "../src/domain/analytics";
import type { Activity } from "../src/domain/models";
const event = (name: string, productId: string, second: number): Activity => ({
  id: crypto.randomUUID(),
  name,
  productId,
  sessionId: "session",
  actorId: "local",
  path: "/products",
  occurredAt: `2026-10-01T01:00:${String(second).padStart(2, "0")}.000Z`,
});
it("跳转率排除无曝光访问并去除重复跳转，不会超过 100%", () => {
  const events = [
    event("product_outbound_redirected", "b", 0),
    event("product_impression", "a", 1),
    event("product_impression", "b", 2),
    event("product_outbound_redirected", "a", 3),
    event("product_outbound_redirected", "a", 4),
  ];
  expect(exposureConversion(events)).toBe("50.0%");
  expect(exposureConversion(events, "a")).toBe("100.0%");
  expect(exposureConversion(events, "b")).toBe("0.0%");
  expect(exposureConversion([])).toBe("—");
});
