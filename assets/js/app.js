// REF: mobile page. Todo o conteúdo vem de data/*.json — edite lá, não aqui.

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const LOJAS = { amazon: 'Amazon', mercadolivre: 'Mercado Livre' };
const $ = (id) => document.getElementById(id);

function el(tag, attrs = {}, ...filhos) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos) if (f !== null && f !== undefined) node.append(f);
  return node;
}

async function carregar(nome) {
  const r = await fetch(`data/${nome}.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`data/${nome}.json: ${r.status}`);
  return r.json();
}

// "2026-12-01" vale até o fim desse dia, no horário de quem abre a página.
function fimDoDia(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d, 23, 59, 59);
}

function montarSite(site) {
  $('handle').textContent = site.handle;
  $('assinatura').textContent = site.assinatura;

  const a = site.abertura;
  $('abertura-titulo').replaceChildren(
    ...a.titulo.map((linha, i) =>
      el('span', { class: i + 1 === a.linhaVermelha ? 'vermelho' : null }, linha))
  );
  $('abertura-texto').textContent = a.texto;
  $('abertura-botao').textContent = a.botao;
  $('abertura-nota').textContent = a.nota;
  if (a.alternativa) {
    $('abertura-alternativa').textContent = a.alternativa;
    $('abertura-alternativa').hidden = false;
  }

  const h = site.historia;
  $('historia-resumo').replaceChildren(...h.resumo.map((p) => el('p', {}, p)));
  if (h.completo && h.completo.length) {
    $('historia-completo').replaceChildren(...h.completo.map((p) => el('p', {}, p)));
    $('historia-mais').hidden = false;
  }

  $('lista-redes').replaceChildren(
    ...site.redes.map((r) =>
      el('li', {},
        el('a', { href: r.link, target: '_blank', rel: 'noopener' },
          el('strong', {}, r.nome), el('span', {}, r.handle))))
  );

  $('rodape-afiliados').textContent = site.rodape.afiliados;
  if (site.rodape.contatoLink) {
    const c = $('rodape-contato');
    c.href = site.rodape.contatoLink;
    c.textContent = site.rodape.contatoRotulo;
    c.hidden = false;
  }
}

function acaoNoAr(acao) {
  if (!acao.ativa) return false;
  return !acao.prazo || fimDoDia(acao.prazo) >= new Date();
}

function montarAcao(acao) {
  if (!acaoNoAr(acao)) return;
  $('acao-nome').textContent = acao.nome;
  $('acao-descricao').textContent = acao.descricao;
  $('acao-botao').textContent = acao.botao;
  $('acao-codigo').textContent = acao.codigo || '';
  if (acao.complemento) {
    $('acao-complemento').textContent = acao.complemento;
    $('acao-complemento').hidden = false;
  }
  if (acao.imagem) {
    const img = $('acao-imagem');
    img.src = acao.imagem;
    img.alt = acao.imagemAlt || '';
    img.hidden = false;
  }
  if (acao.detalhes?.length) {
    $('acao-detalhes').replaceChildren(
      ...acao.detalhes.map((d) =>
        el('div', {}, el('dt', {}, d.rotulo), el('dd', {}, d.valor))));
    $('acao-detalhes').hidden = false;
  }
  if (acao.prazo) {
    const [, m, d] = acao.prazo.split('-');
    $('acao-prazo').textContent = `até ${d}/${m}`;
  }
  $('acao').hidden = false;
}

function montarGrupos(grupos, acao) {
  // Ordem fixa: promos, confraria, ação. A ação só aparece enquanto está no ar.
  const ordem = ['promos', 'telegram', 'community'];
  if (acaoNoAr(acao)) ordem.push('acao');
  $('lista-grupos').replaceChildren(
    ...ordem.filter((slug) => grupos[slug]).map((slug) => {
      const g = grupos[slug];
      const nome = slug === 'acao'
        ? [acao.codigo, acao.nome].filter(Boolean).join(' · ')
        : g.nome;
      return el('li', {},
        el('a', { href: `g/${slug}/` },
          el('span', {}, el('strong', {}, nome), el('small', {}, g.descricao))));
    })
  );
}

function cartaoOferta(o) {
  const foto = el('div', { class: 'foto' },
    o.imagem
      ? el('img', { src: o.imagem, alt: '', loading: 'lazy' })
      : el('span', { class: 'micro vazio' }, 'Foto'));
  if (o.precoDe > o.preco) {
    const pct = Math.round((1 - o.preco / o.precoDe) * 100);
    foto.append(el('span', { class: 'selo' }, `-${pct}%`));
  }
  if (o.exemplo) foto.append(el('span', { class: 'micro exemplo' }, 'Exemplo'));

  return el('a', { class: 'oferta', href: o.link, target: '_blank', rel: 'sponsored noopener' },
    foto,
    el('span', { class: 'micro loja' }, LOJAS[o.loja] || o.loja),
    el('span', { class: 'titulo' }, o.titulo),
    o.precoDe > o.preco ? el('span', { class: 'preco-de' }, BRL.format(o.precoDe)) : null,
    el('span', { class: 'preco' }, BRL.format(o.preco)),
    o.cupom ? el('span', { class: 'micro cupom' }, `Cupom ${o.cupom}`) : null);
}

function montarOfertas(dados) {
  const max = dados.maximoPorLoja || 10;
  const porLoja = {};
  [...dados.ofertas]
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .forEach((o) => {
      (porLoja[o.loja] ||= []);
      if (porLoja[o.loja].length < max) porLoja[o.loja].push(o);
    });

  const lojas = Object.keys(LOJAS).filter((l) => porLoja[l]?.length);
  if (!lojas.length) return;

  const trilho = $('trilho');
  const abas = $('abas');

  function mostrar(loja) {
    trilho.replaceChildren(
      ...porLoja[loja].map(cartaoOferta),
      el('a', { class: 'oferta fim', href: 'g/promos/' },
        el('strong', {}, 'Todas as ofertas estão no grupo'),
        el('span', { class: 'micro' }, 'Entrar no REF:PROMOS →')));
    trilho.scrollLeft = 0;
    for (const b of abas.children) b.setAttribute('aria-selected', String(b.dataset.loja === loja));
  }

  abas.replaceChildren(
    ...lojas.map((l) => {
      const b = el('button', { type: 'button', role: 'tab', 'data-loja': l }, LOJAS[l]);
      b.addEventListener('click', () => mostrar(l));
      return b;
    })
  );
  abas.hidden = lojas.length < 2;

  mostrar(lojas[0]);
  $('ofertas').hidden = false;
}

async function iniciar() {
  // Cada bloco é independente: um JSON com erro não derruba os outros.
  const [site, grupos, acao, ofertas] = await Promise.allSettled(
    ['site', 'grupos', 'acao', 'ofertas'].map(carregar));
  const falhas = [site, grupos, acao, ofertas].filter((r) => r.status === 'rejected');
  falhas.forEach((f) => console.error('[REF:]', f.reason));

  const acaoDados = acao.status === 'fulfilled' ? acao.value : { ativa: false };
  if (site.status === 'fulfilled') montarSite(site.value);
  montarAcao(acaoDados);
  if (grupos.status === 'fulfilled') montarGrupos(grupos.value, acaoDados);
  if (ofertas.status === 'fulfilled') montarOfertas(ofertas.value);
}

iniciar();
