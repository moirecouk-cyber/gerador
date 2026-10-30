# Gerador de arte · Doce Morada

Página que monta a arte de impressão do tapete de Natal personalizado (60x40 e 90x40, 300 dpi).

1. Copie os dados do pedido na Shopify e cole na página.
2. Confira a prévia e corrija o que precisar.
3. Clique em "Baixar projeto" e envie o PDF ao fornecedor: ele tem a ficha do pedido e a arte em tamanho real.

Use pelo computador (Chrome): o arquivo final tem de 33 a 50 megapixels.

- `index.html` — a página inteira (HTML, CSS e JS num arquivo só)
- `p/` — peças: fundos, guirlanda, canto, xadrez, bonecos e `meta.json` (medida do corpo de cada boneco)

## Baixar projeto

O botão "Baixar projeto" gera um PDF único, `Pedido_{numero}_DoceMorada.pdf` para a fábrica: na página 1 fica a ficha (em inglês e português) com uma prévia da arte, e depois vem uma página por arte em tamanho real (600x400 ou 900x400 mm, JPEG 300 dpi).

## Sincronizar pedidos da Shopify

O site é público, então a chave da Shopify fica num Cloudflare Worker (`worker/`), e não no site.

1. **Shopify:** crie um app na sua loja (Dev Dashboard, ou Configurações → Apps → Desenvolver apps) com o escopo `read_orders` e instale. Guarde o token da Admin API (ou o Client ID e o Client Secret).
2. **Cloudflare** (conta gratuita): na pasta `worker/`, edite `SHOPIFY_SHOP` em `wrangler.toml` e rode:
   ```
   npx wrangler login
   npx wrangler secret put CHAVE            # uma senha sua, que você digita no site
   npx wrangler secret put SHOPIFY_TOKEN    # ou SHOPIFY_CLIENT_ID e SHOPIFY_CLIENT_SECRET
   npx wrangler deploy
   ```
3. **No site:** em "Configurar conexão", cole o endereço `https://pedidos-doce-morada.….workers.dev` e a chave, depois clique em "Sincronizar". Os dois ficam salvos só neste navegador.

O Worker lista os pedidos dos últimos 60 dias que têm propriedades "Tapete 1 - …" / "Tapete 2…" e manda cada um no mesmo formato do texto colado.
