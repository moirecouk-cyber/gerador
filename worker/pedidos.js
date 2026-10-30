// Cloudflare Worker: entrega ao Gerador Doce Morada os pedidos da Shopify que têm tapete.
// A chave da Shopify fica só aqui (segredo do Worker), nunca no site público.
// Segredos: CHAVE (a senha digitada no site) e
//   SHOPIFY_TOKEN (token da Admin API)  ou  SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (app do Dev Dashboard).
// Variáveis (wrangler.toml): SHOPIFY_SHOP, ORIGEM, API_VERSAO.

const QUERY = `query($q: String) {
  orders(first: 50, sortKey: CREATED_AT, reverse: true, query: $q) { nodes {
    name createdAt cancelledAt displayFulfillmentStatus
    lineItems(first: 20) { nodes { title variantTitle customAttributes { key value } } }
  } } }`;
const STATUS = { FULFILLED: "enviado", UNFULFILLED: "a enviar", PARTIALLY_FULFILLED: "parcial", IN_PROGRESS: "em andamento", ON_HOLD: "em espera" };

let cache = null; // token do client credentials, vale ~24h
async function token(env) {
  if (env.SHOPIFY_TOKEN) return env.SHOPIFY_TOKEN;
  if (cache && cache.ate > Date.now()) return cache.t;
  const r = await fetch(`https://${env.SHOPIFY_SHOP}/admin/oauth/access_token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET }),
  });
  if (!r.ok) throw new Error(`a Shopify recusou o login do app (${r.status}): ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  cache = { t: j.access_token, ate: Date.now() + ((j.expires_in || 3600) - 300) * 1000 };
  return cache.t;
}

export default {
  async fetch(req, env) {
    const cors = { "Access-Control-Allow-Origin": env.ORIGEM || "*", "Access-Control-Allow-Headers": "X-Chave", "Vary": "Origin" };
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (new URL(req.url).pathname !== "/pedidos") return json({ erro: "endereço não encontrado" }, 404);
    if (!env.CHAVE || req.headers.get("X-Chave") !== env.CHAVE) return json({ erro: "chave de acesso errada" }, 401);
    try {
      const desde = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10); // sem read_all_orders a Shopify só mostra 60 dias
      const r = await fetch(`https://${env.SHOPIFY_SHOP}/admin/api/${env.API_VERSAO}/graphql.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": await token(env) },
        body: JSON.stringify({ query: QUERY, variables: { q: `created_at:>=${desde}` } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.errors) throw new Error("Shopify: " + JSON.stringify(j.errors || r.status).slice(0, 200));
      const pedidos = [];
      for (const o of j.data.orders.nodes) {
        if (o.cancelledAt) continue;
        for (const li of o.lineItems.nodes) {
          const props = li.customAttributes.filter(a => /^tapete\s*[12]/i.test(a.key));
          if (!props.length) continue;
          const z = `${li.variantTitle || ""} ${li.title}`.match(/(60|90)\s*[x×]\s*40/i), tamanho = z ? z[1] + "x40" : "";
          pedidos.push({
            numero: o.name.replace(/\D/g, ""), data: o.createdAt, tamanho,
            status: STATUS[o.displayFulfillmentStatus] || "",
            // mesmo formato do texto colado no site, para reaproveitar o leitor de lá
            texto: [`Pedido ${o.name} · ${tamanho}`, ...props.map(a => `${a.key}: ${a.value}`)].join("\n"),
          });
        }
      }
      return json({ pedidos });
    } catch (e) {
      return json({ erro: e.message }, 502);
    }
  },
};
