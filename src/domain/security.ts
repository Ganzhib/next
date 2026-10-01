export function safeTarget(raw: string, allowedDomains: string[]): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("尚未配置有效的产品链接，请在产品后台填写。");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new Error("产品链接只允许 HTTP 或 HTTPS");
  if (url.username || url.password) throw new Error("产品链接不能包含登录凭据");
  if (
    !allowedDomains
      .map((s) => s.toLowerCase().trim())
      .includes(url.hostname.toLowerCase())
  )
    throw new Error("产品域名未被允许，请检查后台配置");
  return url;
}
export async function hashPin(pin: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const result = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 120000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(result))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
