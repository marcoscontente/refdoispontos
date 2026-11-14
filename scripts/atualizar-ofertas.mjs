#!/usr/bin/env node
// Lê as ofertas publicadas no canal público do Telegram (página t.me/s/<canal>)
// e regenera data/ofertas.json, baixando as fotos para assets/img/ofertas/.
//
//   node scripts/atualizar-ofertas.mjs                    atualiza o site
//   node scripts/atualizar-ofertas.mjs --teste            só mostra o que leu, não grava
//   node scripts/atualizar-ofertas.mjs --teste --arquivo pagina.html
//
// Sem dependências: precisa só de Node 18 ou mais novo.

import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CANAL = process.env.REF_CANAL || 'refdoispontospromos';
const PAGINAS = 4; // cada página traz ~20 publicações
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARQUIVO = path.join(RAIZ, 'data/ofertas.json');
const DIR_FOTOS = path.join(RAIZ, 'assets/img/ofertas');
const AGENTE = 'Mozilla/5.0 (compatible; atualizador-de-ofertas)';

const args = process.argv.slice(2);
const TESTE = args.includes('--teste');
const LOCAL = args.includes('--arquivo') ? args[args.indexOf('--arquivo') + 1] : null;

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function paraTexto(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
      if (e[0] !== '#') return ENTIDADES[e] ?? m;
      const n = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(n);
    })
    // O Promium às vezes manda as tags como texto ("<b>…</b>"); tira também.
    .replace(/<\/?[a-z]+>/gi, '');
}

const numero = (s) => Number(s.replace(/\./g, '').replace(',', '.'));

function lojaDoLink(link) {
  let host;
  try { host = new URL(link).hostname.toLowerCase(); } catch { return null; }
  if (/(^|\.)meli\.la$|mercadolivre\.|mercadolibre\./.test(host)) return 'mercadolivre';
  if (/(^|\.)amazon(\.|$)|(^|\.)amzn\./.test(host)) return 'amazon';
  return null;
}

// Uma publicação vira oferta só se tiver link de loja conhecida e preço "Por R$".
function lerPublicacao(bloco) {
  const id = bloco.match(/data-post="[^"/]+\/(\d+)"/)?.[1];
  const corpo = bloco.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  if (!id || !corpo) return { id: id ? Number(id) : null, oferta: null };

  const txt = paraTexto(corpo);
  const links = [
    ...[...corpo.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')),
    ...(txt.match(/https?:\/\/[^\s<>"]+/g) || []),
  ];
  const link = links.find(lojaDoLink);
  const preco = txt.match(/\bPor:?\s*R\$\s*([\d.]+,\d{2})/i)?.[1];
  if (!link || !preco) return { id: Number(id), oferta: null };

  const precoDe = txt.match(/\bDe:?\s*R\$\s*([\d.]+,\d{2})/i)?.[1];
  const titulo = txt.split('\n').map((l) => l.trim()).filter(Boolean)[0]
    ?.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const datas = [...bloco.matchAll(/<time[^>]*datetime="([^"]+)"/g)];

  const oferta = {
    id: `tg-${id}`,
    loja: lojaDoLink(link),
    titulo: titulo || 'Oferta',
    preco: numero(preco),
    link,
    data: datas.at(-1)?.[1] || new Date().toISOString(),
  };
  if (precoDe && numero(precoDe) > oferta.preco) oferta.precoDe = numero(precoDe);
  // Exige os dois-pontos e código em maiúsculas, para não ler "cupom antes do pagamento".
  const cupom = txt.match(/[Cc][Uu][Pp][Oo][Mm]:\s*([A-Z0-9][A-Z0-9_-]{2,})(?![a-z])/)?.[1];
  if (cupom) oferta.cupom = cupom;
  const parcelas = txt.match(/(\d{1,2}x de R\$\s*[\d.]+,\d{2}(?:\s+sem juros)?)/i)?.[1];
  if (parcelas) oferta.parcelas = parcelas;
  const foto = bloco.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/)?.[1];

  return { id: Number(id), oferta, foto };
}

function lerPagina(html) {
  return html.split('<div class="tgme_widget_message_wrap').slice(1).map(lerPublicacao);
}

async function buscarPagina(antes) {
  const url = `https://t.me/s/${CANAL}${antes ? `?before=${antes}` : ''}`;
  const r = await fetch(url, { headers: { 'User-Agent': AGENTE } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.text();
}

async function baixarFoto(oferta, url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': AGENTE } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const tipo = r.headers.get('content-type') || '';
    const ext = tipo.includes('png') ? 'png' : tipo.includes('webp') ? 'webp' : 'jpg';
    const nome = `${oferta.id}.${ext}`;
    await mkdir(DIR_FOTOS, { recursive: true });
    await writeFile(path.join(DIR_FOTOS, nome), Buffer.from(await r.arrayBuffer()));
    return `assets/img/ofertas/${nome}`;
  } catch (erro) {
    console.warn(`  foto de ${oferta.id} não baixou (${erro.message}); card fica sem foto`);
    return '';
  }
}

async function main() {
  const atual = JSON.parse(await readFile(ARQUIVO, 'utf8'));
  const maximo = atual.maximoPorLoja || 10;

  // 1. Ler o canal, da publicação mais nova para a mais antiga.
  const lidas = [];
  if (LOCAL) {
    lidas.push(...lerPagina(await readFile(LOCAL, 'utf8')));
  } else {
    let antes = null;
    for (let p = 0; p < PAGINAS; p++) {
      const pagina = lerPagina(await buscarPagina(antes));
      const ids = pagina.map((x) => x.id).filter(Boolean);
      if (!ids.length) break;
      lidas.push(...pagina);
      antes = Math.min(...ids);
      if (antes <= 1) break;
    }
  }
  const novas = lidas.filter((x) => x.oferta);
  console.log(`Canal @${CANAL}: ${lidas.length} publicações lidas, ${novas.length} ofertas.`);

  if (TESTE) {
    console.log(JSON.stringify(novas.map((x) => ({ ...x.oferta, foto: x.foto || null })), null, 2));
    return;
  }
  if (!novas.length) {
    console.log('Nenhuma oferta nova no canal; data/ofertas.json ficou como estava.');
    return;
  }

  // 2. Juntar com as que já estavam no site (os exemplos saem de vez).
  const porId = new Map(atual.ofertas.filter((o) => o.id && !o.exemplo).map((o) => [o.id, o]));
  for (const { oferta, foto } of novas) {
    const antiga = porId.get(oferta.id);
    porId.set(oferta.id, { ...oferta, imagem: antiga?.imagem || '', _foto: foto });
  }

  // 3. Ficar só com as mais recentes de cada loja.
  const contagem = {};
  const ofertas = [...porId.values()]
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .filter((o) => (contagem[o.loja] = (contagem[o.loja] || 0) + 1) <= maximo);

  // 4. Baixar as fotos que faltam e apagar as que não são mais usadas.
  for (const o of ofertas) {
    if (!o.imagem && o._foto) o.imagem = await baixarFoto(o, o._foto);
    delete o._foto;
  }
  const usadas = new Set(ofertas.map((o) => path.basename(o.imagem || '')));
  for (const f of await readdir(DIR_FOTOS).catch(() => [])) {
    if (!usadas.has(f)) await unlink(path.join(DIR_FOTOS, f));
  }

  await writeFile(ARQUIVO, JSON.stringify({ maximoPorLoja: maximo, ofertas }, null, 2) + '\n');
  console.log(`data/ofertas.json atualizado: ${ofertas.length} ofertas ` +
    `(${Object.entries(contagem).map(([l, n]) => `${l}: ${Math.min(n, maximo)}`).join(', ')}).`);
}

main().catch((erro) => {
  console.error('Falhou:', erro.message);
  process.exit(1);
});
