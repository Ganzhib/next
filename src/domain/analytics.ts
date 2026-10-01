import type { Activity } from "./models";

/** 按“会话 + 产品”去重，只计算曝光之后发生跳转的配对；不是全站用户转化率。 */
export function exposureConversion(events: Activity[], productId?: string) {
  const exposed = new Set<string>();
  const converted = new Set<string>();
  for (const event of [...events].sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt),
  )) {
    if (!event.productId || (productId && event.productId !== productId))
      continue;
    const key = `${event.sessionId}:${event.productId}`;
    if (event.name === "product_impression") exposed.add(key);
    if (event.name === "product_outbound_redirected" && exposed.has(key))
      converted.add(key);
  }
  return exposed.size
    ? `${((converted.size / exposed.size) * 100).toFixed(1)}%`
    : "—";
}
