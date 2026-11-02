const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function authorized(request, env) {
  const supplied = request.headers.get("authorization") || "";
  const expected = env.STOCKLAB_SYNC_PASSWORD || "";
  return expected.length >= 16 && safeEqual(supplied, `Bearer ${expected}`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const allowed = env.ALLOWED_ORIGIN || "*";
    const corsOrigin = allowed === "*" ? "*" : (origin === allowed ? origin : "null");
    const headers = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (url.pathname !== "/api/sync") return json({ error: "Not found" }, 404);
    if (!["GET", "PUT"].includes(request.method)) return json({ error: "Method not allowed" }, 405);
    if (corsOrigin === "null") return json({ error: "Origin not allowed" }, 403);
    if (!authorized(request, env)) return json({ error: "Invalid sync password" }, 401);

    try {
      if (request.method === "PUT") {
        const length = Number(request.headers.get("content-length") || 0);
        if (length > 25 * 1024 * 1024) return json({ error: "Backup exceeds 25 MB limit" }, 413);
        const body = await request.text();
        if (body.length > 25 * 1024 * 1024) return json({ error: "Backup exceeds 25 MB limit" }, 413);
        let backup;
        try { backup = JSON.parse(body); } catch { return json({ error: "Invalid JSON backup" }, 400); }
        if (!backup || !Array.isArray(backup.products) || !Array.isArray(backup.categories) || !Array.isArray(backup.scanHistory)) {
          return json({ error: "Backup must contain products, categories and scanHistory arrays" }, 400);
        }
        const now = new Date().toISOString();
        await env.STOCKLAB_BACKUPS.put("primary/backup.json", body, {
          httpMetadata: { contentType: "application/json" },
          customMetadata: { updatedAt: now }
        });
        await env.DB.prepare(
          "INSERT INTO sync_state (id, updated_at, byte_size, product_count) VALUES (1, ?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at, byte_size=excluded.byte_size, product_count=excluded.product_count"
        ).bind(now, new TextEncoder().encode(body).length, backup.products.length).run();
        return json({ success: true, updatedAt: now, productCount: backup.products.length });
      }

      const object = await env.STOCKLAB_BACKUPS.get("primary/backup.json");
      if (!object) return json({ error: "No cloud backup exists yet" }, 404);
      const meta = await env.DB.prepare("SELECT updated_at, byte_size, product_count FROM sync_state WHERE id=1").first();
      return new Response(object.body, {
        headers: { ...headers, "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
          "x-stocklab-updated-at": meta?.updated_at || object.customMetadata?.updatedAt || "",
          "x-stocklab-product-count": String(meta?.product_count ?? "") }
      });
    } catch (error) {
      console.error("Stock Lab sync error", error);
      return json({ error: "Cloud sync temporarily unavailable" }, 500);
    }
  }
};