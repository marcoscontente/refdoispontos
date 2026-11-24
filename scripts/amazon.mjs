// Links da Amazon do site. Um lugar só para o ID de rastreamento.
// Regra do Amazon Associados: o link sai pronto no HTML, direto para amazon.com.br,
// com a tag da REF: (nada de /go/, /g/, encurtador ou href montado por JavaScript).

export const TAG_AMAZON = 'refdoispont0c-20';

const ASIN = /^[A-Z0-9]{10}$/;

// Tira o ASIN de um endereço da Amazon (/dp/, /gp/product/, /gp/aw/d/, /d/, /exec/obidos/ASIN/).
export function asinDoEndereco(endereco) {
  let url;
  try { url = new URL(endereco); } catch { return null; }
  if (!/(^|\.)amazon\.[a-z.]+$/i.test(url.hostname)) return null;
  const m = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d|d|exec\/obidos\/ASIN|o\/ASIN)\/([A-Z0-9]{10})(?=[/?#]|$)/i);
  return m ? m[1].toUpperCase() : null;
}

// Link limpo: só /dp/<ASIN> e a tag da REF: (qualquer tag ou parâmetro de afiliado da origem cai fora).
export function linkAmazon(asin) {
  if (!ASIN.test(String(asin || ''))) throw new Error(`ASIN inválido: ${asin}`);
  return `https://www.amazon.com.br/dp/${asin}?tag=${TAG_AMAZON}`;
}

// Segue os redirecionamentos de um link curto (link.amazon, amzn.to, amzlinks.in…) até achar o ASIN.
// Lê só o cabeçalho Location de cada salto; a página da Amazon só é aberta se nenhum salto trouxer o ASIN.
export async function resolverAsin(link, { agente = 'Mozilla/5.0 (compatible; atualizador-de-ofertas)', saltos = 8 } = {}) {
  let atual = link;
  for (let i = 0; i <= saltos; i++) {
    const asin = asinDoEndereco(atual);
    if (asin) return asin;
    const r = await fetch(atual, { redirect: 'manual', headers: { 'User-Agent': agente } });
    const destino = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && destino) {
      atual = new URL(destino, atual).href;
      continue;
    }
    if (r.ok) {
      const html = await r.text();
      const achado = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1]
        || html.match(/https?:\/\/(?:www\.)?amazon\.com\.br\/[^"'\s<>]*\/dp\/[A-Z0-9]{10}/i)?.[0];
      const doHtml = achado && asinDoEndereco(achado);
      if (doHtml) return doHtml;
      const campo = html.match(/name="ASIN"\s+value="([A-Z0-9]{10})"/i)?.[1];
      if (campo) return campo.toUpperCase();
    }
    throw new Error(`HTTP ${r.status} em ${atual}`);
  }
  throw new Error(`redirecionamentos demais a partir de ${link}`);
}
