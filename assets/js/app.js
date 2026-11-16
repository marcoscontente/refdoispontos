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
    $('abertura-telegram').hidden = false;
  }

  const h = site.historia;
  $('historia-resumo').replaceChildren(...h.resumo.map((p) => el('p', {}, p)));
  if (h.completo && h.completo.length) {
    $('historia-completo').replaceChildren(...h.completo.map((p) => el('p', {}, p)));
    $('historia-mais').hidden = false;
  }
  if (h.assinatura) {
    $('historia-assinatura').textContent = h.assinatura;
    $('historia-assinatura').hidden = false;
  }
  if (h.video?.link) {
    $('historia-video').href = h.video.link;
    $('historia-video').textContent = h.video.rotulo;
    $('historia-video').hidden = false;
    // Reel do Instagram incorporado; o link simples só aparece se o endereço não for de reel.
    const reel = h.video.link.match(/instagram\.com\/reel\/([\w-]+)/)?.[1];
    if (reel) {
      $('historia-reel').replaceChildren(el('iframe', {
        src: `https://www.instagram.com/reel/${reel}/embed/`,
        title: h.video.rotulo,
        loading: 'lazy',
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
        allowfullscreen: true,
        scrolling: 'no',
      }));
      $('historia-reel').hidden = false;
      $('historia-video').hidden = true; // o próprio reel já leva ao Instagram
    }
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
  // Com "link", o botão principal abre a página da ação; o do grupo fica logo abaixo, vazado.
  if (acao.link) {
    const a = $('acao-link');
    a.href = acao.link;
    a.textContent = acao.botaoLink || 'Conferir a ação';
    a.hidden = false;
    $('acao-botao').className = 'btn btn-vazado';
  }
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

// "2026-11-15T17:36:27+00:00" → hoje / ontem / há N dias, no horário de quem abre a página.
function quando(iso) {
  const dias = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 864e5);
  return dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`;
}

// Cada cartão abre a página da oferta (promos/oferta/), que leva para os grupos.
function cartaoOferta(o) {
  const foto = el('span', { class: 'foto' },
    o.imagem
      ? el('img', { src: o.imagem, alt: '', loading: 'lazy' })
      : el('span', { class: 'micro vazio' }, 'Foto'));
  if (o.precoDe > o.preco) {
    const pct = Math.round((1 - o.preco / o.precoDe) * 100);
    foto.append(el('span', { class: 'selo' }, `-${pct}%`));
  }
  if (o.exemplo) foto.append(el('span', { class: 'micro exemplo' }, 'Exemplo'));

  const destino = o.exemplo ? 'g/promos/' : `promos/oferta/?id=${encodeURIComponent(o.id)}&de=home`;
  return el('a', { class: 'oferta', href: destino },
    foto,
    el('span', { class: 'texto' },
      el('span', { class: 'micro loja' }, `${LOJAS[o.loja] || o.loja} · ${quando(o.data)}`),
      el('span', { class: 'titulo' }, o.titulo),
      o.precoDe > o.preco ? el('span', { class: 'preco-de' }, `de ${BRL.format(o.precoDe)}`) : null,
      el('span', { class: 'micro por' }, 'Apareceu por'),
      el('span', { class: 'preco' }, BRL.format(o.preco))));
}

const OFERTAS_POR_LOJA = 30; // quantas entram na lista de cada loja
const OFERTAS_VISIVEIS = 6;  // quantas cabem na caixa sem rolar

function montarOfertas(dados) {
  const porLoja = {};
  [...dados.ofertas]
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .forEach((o) => {
      (porLoja[o.loja] ||= []);
      if (porLoja[o.loja].length < OFERTAS_POR_LOJA) porLoja[o.loja].push(o);
    });

  const lojas = Object.keys(LOJAS).filter((l) => porLoja[l]?.length);
  if (!lojas.length) return;

  const trilho = $('trilho');
  const abas = $('abas');

  // A caixa mostra 6 cartões inteiros; os outros rolam dentro dela.
  function ajustarCaixa() {
    const setimo = trilho.children[OFERTAS_VISIVEIS];
    if (!setimo) { trilho.style.maxHeight = ''; return; }
    const estilo = getComputedStyle(trilho);
    trilho.style.maxHeight =
      `${setimo.offsetTop - trilho.children[0].offsetTop - (parseFloat(estilo.rowGap) || 0) + 2 * parseFloat(estilo.paddingTop)}px`;
  }

  function mostrar(loja) {
    trilho.replaceChildren(
      ...porLoja[loja].map(cartaoOferta),
      el('a', { class: 'oferta fim', href: 'g/promos/' },
        el('strong', {}, 'Todas as ofertas estão no grupo'),
        el('span', { class: 'micro' }, 'Entrar no REF:PROMOS →')));
    trilho.scrollTop = 0;
    for (const b of abas.children) b.setAttribute('aria-selected', String(b.dataset.loja === loja));
    ajustarCaixa();
  }

  abas.replaceChildren(
    ...lojas.map((l) => {
      const b = el('button', { type: 'button', role: 'tab', 'data-loja': l }, LOJAS[l]);
      b.addEventListener('click', () => mostrar(l));
      return b;
    })
  );
  abas.hidden = lojas.length < 2;

  $('ofertas').hidden = false; // antes de medir: seção escondida não tem altura
  mostrar(lojas[0]);
  window.addEventListener('resize', ajustarCaixa);
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
