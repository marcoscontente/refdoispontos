#!/usr/bin/env node
// Escreve as páginas de campanha (promos/<slug>/index.html) a partir de data/campanhas.json.
// O conteúdo vai pronto no HTML para a página abrir rápido em tráfego pago.
// Uso: node scripts/gerar-campanhas.mjs

import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { barra, PAGINAS_A_MAO } from './barra.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOMINIO = 'https://refdoispontos.com';
const FONTES = {
  padrao: 'family=Archivo+Black&family=Montserrat:ital,wght@0,500;0,600;0,700;1,500',
  oldmoney: 'family=Archivo+Black&family=Lora:ital,wght@0,500;0,600;1,400&family=Montserrat:ital,wght@0,500;0,600;0,700;1,500',
};
const WHATSAPP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.9 9.9 0 0 0 12.04 2zm5.8 14.13c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.13.1-1.82-.12-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.94-4.36-.14-.2-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2.01.89 2.16.07.14.12.31.02.5-.1.2-.14.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.3-.13.59.17.29.74 1.22 1.58 1.97 1.09.97 2 1.27 2.29 1.42.29.14.46.12.63-.07.17-.2.72-.84.92-1.13.19-.29.38-.24.65-.14.26.1 1.68.79 1.97.94.29.14.48.21.55.33.07.12.07.7-.17 1.38z"/></svg>';

const TELEGRAM = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>';

const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function cartao(item, i, raiz) {
  const anuncios = item.anuncios?.length ? ` data-anuncios="${e(item.anuncios.join(' ').toLowerCase())}"` : '';
  const carga = i === 0 ? 'fetchpriority="high"' : 'loading="lazy"';
  return `      <article class="card"${anuncios}>
        <div class="shot"><img src="${raiz}${e(item.imagem)}" alt="${e(`${item.marca} ${item.modelo}`)}" data-modelo="${e(item.modelo)}" ${carga}></div>
        <div>
          <div class="micro brand">${e(item.marca)}</div>
          <div class="model">${e(item.modelo)}</div>
          <div class="fact">${e(item.fato)}</div>
          <span class="tag">APARECEU POR</span>
          <div class="price"><small>R$</small>${e(item.preco)}</div>
        </div>
      </article>`;
}

function pagina(c) {
  const raiz = c.slug ? '../../' : '../';
  const endereco = `${DOMINIO}/promos/${c.slug ? `${c.slug}/` : ''}`;
  const fontes = FONTES[c.categoria] || FONTES.padrao;
  const botao = (pos) => `<a class="cta js-cta" href="${raiz}g/promos/?o=campanha" data-grupo="promos" data-pos="${pos}">
      ${WHATSAPP}
      REF: PROMOS NO WHATSAPP
    </a>`;
  const telegram = (pos) => `<a class="cta tg js-cta" href="${raiz}g/telegram/?o=campanha" data-grupo="telegram" data-pos="${pos}">
      ${TELEGRAM}
      REF: PROMOS NO TELEGRAM
    </a>`;
  // "noDia": textos que valem só na data marcada (ex.: o dia da Black Friday); promos.js faz a troca.
  const noDia = c.noDia
    ? ` data-dia="${e(c.noDia.data)}" data-dia-chamada="${e(c.noDia.chamada || '')}" data-dia-texto="${e(c.noDia.texto || '')}" data-dia-selo="${e((c.noDia.selo || []).join('|'))}"`
    : '';
  const selo = c.selo?.length ? `\n    <div class="selo">${c.selo.map(e).join('<br>')}</div>` : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<!-- Arquivo gerado por scripts/gerar-campanhas.mjs. Edite data/campanhas.json, não este arquivo. -->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(c.titulo)}</title>
<link rel="icon" type="image/png" sizes="32x32" href="${raiz}assets/img/icone/icone-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="${raiz}assets/img/icone/icone-192.png">
<link rel="apple-touch-icon" href="${raiz}assets/img/icone/icone-180.png">
<meta name="description" content="${e(c.descricao)}">
<meta name="theme-color" content="#0E2A2B">
<link rel="canonical" href="${endereco}">
<meta property="og:title" content="${e(c.titulo)}">
<meta property="og:description" content="${e(c.descricao)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${endereco}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${fontes}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${raiz}assets/css/promos.css">
<link rel="stylesheet" href="${raiz}assets/css/barra.css">
<link rel="preload" as="image" href="${raiz}${e(c.itens[0].imagem)}">
<script src="${raiz}assets/js/pixel.js"></script>
</head>
<body class="theme-${e(c.categoria)}" data-categoria="${e(c.categoria)}" data-raiz="${raiz}"${noDia}>

${barra(raiz, 'promos')}

<div class="wrap">

  <div class="hero">
    <div class="micro" id="eyebrow">${e(c.chamada)}</div>
    <h1 id="title">${c.linhas.map((l) => `<span>${e(l)}</span>`).join('')}</h1>
    <p class="lead" id="lead">${e(c.texto)}</p>
    ${botao('hero')}
    ${telegram('hero')}
    <p class="cta-note">Você recebe os achados no WhatsApp ou no Telegram e compra direto na Amazon ou no Mercado Livre.</p>${selo}
  </div>

  <section id="achados">
    <div class="micro">${c.ofertas ? 'Direto do grupo' : 'Prova, não promessa'}</div>
    <h2>${c.ofertas ? 'Últimos achados<br>do grupo' : 'Achados que já<br>passaram pelo grupo'}</h2>
    <p class="micro dica" id="dica" hidden></p>
    <div class="cards" id="cards"${c.ofertas ? ` data-ofertas="${Number(c.ofertas)}"` : ''}>
${c.itens.map((it, i) => cartao(it, i, raiz)).join('\n')}
    </div>
    <p class="disclaimer">Valores de ofertas já publicadas no grupo. Preço, estoque e cupons mudam a qualquer momento.</p>
  </section>

  <section>
    <div class="micro">Como funciona</div>
    <h2>Três passos,<br>nenhum custo</h2>
    <div class="steps">
      <div class="step"><div><b>A gente garimpa e confere</b><span>Preço, referência e vendedor checados antes de postar.</span></div></div>
      <div class="step"><div><b>Você recebe no WhatsApp</b><span>Poucos posts por dia, só o que vale a atenção.</span></div></div>
      <div class="step"><div><b>Compra direto na Amazon ou no Mercado Livre</b><span>Com os cupons do dia já organizados pra você.</span></div></div>
    </div>
  </section>

  <section>
    <div class="micro">Por que a REF:</div>
    <h2>Curadoria antes<br>da comissão</h2>
    <ul class="trust">
      <li>Lojas oficiais e vendedores com boa reputação.</li>
      <li>Cupons do dia testados e explicados: qual usar em cada faixa de preço.</li>
      <li>Grupo só de avisos: sem spam, sem conversa paralela.</li>
      <li>Links de afiliado declarados (#publi): você paga o mesmo preço.</li>
    </ul>
  </section>

  <section>
    <div class="micro">Dúvidas</div>
    <h2>Antes de entrar</h2>
    <details><summary>É gratuito mesmo?</summary><p>Sim. O grupo se mantém com links de afiliado: quando você compra por eles, o preço é o mesmo e a REF: recebe uma pequena comissão.</p></details>
    <details><summary>Quantas mensagens por dia?</summary><p>Poucas: os cupons do dia pela manhã e uma seleção de achados. As mensagens somem em 24h, sem lotar seu celular.</p></details>
    <details><summary>A compra é feita com a REF:?</summary><p>Não. Você compra direto na Amazon ou no Mercado Livre, com toda a proteção da plataforma.</p></details>
    <details><summary>Posso sair quando quiser?</summary><p>Claro. É só sair do grupo, sem nenhum compromisso.</p></details>
  </section>

  <footer>
    <p><b style="color:var(--paper)">REF: | Watches &amp; Culture</b> — uma referência de cada vez, do primeiro Casio ao grail.</p>
    <p style="margin-top:8px"><a href="https://www.instagram.com/refdoispontos/" target="_blank" rel="noopener">Conheça a REF: no Instagram</a></p>
    <p style="margin-top:8px">Os links de oferta são links de afiliado. Como Associado da Amazon, a REF: ganha com compras qualificadas. A REF: não tem vínculo com as marcas citadas. Ofertas sujeitas a alteração. #publi</p>
  </footer>
</div>

<div class="sticky" id="sticky">
  ${botao('sticky')}
  ${telegram('sticky')}
</div>

<script src="${raiz}assets/js/grupos.js"></script>
<script src="${raiz}assets/js/promos.js"></script>
</body>
</html>
`;
}

const { campanhas } = JSON.parse(await readFile(join(RAIZ, 'data/campanhas.json'), 'utf8'));
const pasta = join(RAIZ, 'promos');
await mkdir(pasta, { recursive: true });

// Pastas de campanhas que saíram do JSON são apagadas (só as que este script gerou).
const slugs = new Set(campanhas.map((c) => c.slug).filter(Boolean));
for (const item of await readdir(pasta, { withFileTypes: true })) {
  if (!item.isDirectory() || slugs.has(item.name)) continue;
  const html = await readFile(join(pasta, item.name, 'index.html'), 'utf8').catch(() => '');
  if (html.includes('gerar-campanhas.mjs')) await rm(join(pasta, item.name), { recursive: true });
}

for (const c of campanhas) {
  if (!c.itens?.length) throw new Error(`campanha "${c.slug || 'geral'}" sem itens`);
  const destino = c.slug ? join(pasta, c.slug) : pasta;
  await mkdir(destino, { recursive: true });
  await writeFile(join(destino, 'index.html'), pagina(c));
  console.log(`promos/${c.slug ? `${c.slug}/` : ''}index.html`);
}

// Barra de navegação nas páginas escritas à mão, entre <!-- barra --> e <!-- /barra -->.
for (const p of PAGINAS_A_MAO) {
  const caminho = join(RAIZ, p.arquivo);
  const html = await readFile(caminho, 'utf8');
  const novo = html.replace(/<!-- barra -->[\s\S]*?<!-- \/barra -->/, `<!-- barra -->\n${barra(p.raiz, p.ativo)}\n<!-- /barra -->`);
  if (novo === html && !html.includes('<!-- barra -->')) throw new Error(`${p.arquivo} sem os marcadores <!-- barra -->`);
  if (novo !== html) await writeFile(caminho, novo);
  console.log(`${p.arquivo} (barra)`);
}
