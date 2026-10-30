// teste do Worker com a Shopify simulada: node worker/teste.mjs
import assert from "node:assert";
const w = (await import("./pedidos.js")).default;
globalThis.fetch = async (url, o) => {
  assert.match(url, /loja\.myshopify\.com\/admin\/api\/2026-07\/graphql\.json/);
  assert.equal(o.headers["X-Shopify-Access-Token"], "tok");
  return new Response(JSON.stringify({ data: { orders: { nodes: [
    { name: "#1001", createdAt: "2026-10-20T10:00:00Z", cancelledAt: null, displayFulfillmentStatus: "UNFULFILLED",
      lineItems: { nodes: [{ title: "Tapete de Natal", variantTitle: "90x40cm", customAttributes: [
        { key: "Tapete 1 - Fundo", value: "Azul" }, { key: "Tapete 1 - Nome 1", value: "Ana" }, { key: "Tapete 2", value: "Igual ao Tapete 1" }, { key: "_x", value: "y" }] },
        { title: "Caneca", variantTitle: null, customAttributes: [] }] } },
    { name: "#1000", createdAt: "2026-10-19T10:00:00Z", cancelledAt: "2026-10-19T11:00:00Z", displayFulfillmentStatus: "UNFULFILLED", lineItems: { nodes: [] } }] } } }));
};
const env = { CHAVE: "k", SHOPIFY_TOKEN: "tok", SHOPIFY_SHOP: "loja.myshopify.com", API_VERSAO: "2026-07", ORIGEM: "https://moirecouk-cyber.github.io" };
assert.equal((await w.fetch(new Request("https://w/pedidos", { headers: { "X-Chave": "errada" } }), env)).status, 401);
const r = await w.fetch(new Request("https://w/pedidos", { headers: { "X-Chave": "k" } }), env);
assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://moirecouk-cyber.github.io");
const j = await r.json();
assert.equal(j.pedidos.length, 1);
assert.deepEqual(j.pedidos[0], { numero: "1001", data: "2026-10-20T10:00:00Z", tamanho: "90x40", status: "a enviar",
  texto: "Pedido #1001 · 90x40\nTapete 1 - Fundo: Azul\nTapete 1 - Nome 1: Ana\nTapete 2: Igual ao Tapete 1" });
console.log("worker test ok");
