// Páginas de campanha (/promos/...). O conteúdo já vem escrito no HTML por scripts/gerar-campanhas.mjs;
// aqui ficam só o botão do grupo, a medição e os ajustes de tela.
(function () {
  const corpo = document.body;
  const categoria = corpo.dataset.categoria;
  const raiz = corpo.dataset.raiz;
  const utm = new URLSearchParams(location.search).get('utm_content') || '';

  // Título sempre cabe na largura, sem quebrar linhas no meio.
  const h1 = document.getElementById('title');
  function ajustarTitulo() {
    h1.style.fontSize = '';
    let tamanho = parseFloat(getComputedStyle(h1).fontSize);
    const linhas = h1.querySelectorAll('span');
    const estoura = () => [...linhas].some((s) => s.scrollWidth > h1.clientWidth);
    while (estoura() && tamanho > 24) { tamanho -= 1; h1.style.fontSize = `${tamanho}px`; }
  }
  ajustarTitulo();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarTitulo);
  window.addEventListener('resize', ajustarTitulo);

  // O relógio do anúncio sobe para o topo: utm_content=REF_OM1v2_... casa com o código "om1".
  if (utm) {
    const partes = utm.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const lista = document.getElementById('cards');
    const doAnuncio = [...lista.children].find((c) =>
      (c.dataset.anuncios || '').split(' ').filter(Boolean)
        .some((codigo) => partes.some((p) => p.startsWith(codigo))));
    if (doAnuncio) lista.prepend(doAnuncio);
  }

  // Página com ofertas recentes: troca os cartões fixos por uma lista com rolagem das últimas
  // ofertas lidas do canal (data/ofertas.json). Cada linha abre a página da oferta.
  // Se a leitura falhar, os cartões fixos continuam na tela.
  const lista = document.getElementById('cards');
  const quantas = Number(lista.dataset.ofertas || 0);
  if (quantas) {
    const LOJAS = { amazon: 'Amazon', mercadolivre: 'Mercado Livre' };
    const real = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
    const quando = (iso) => {
      const dias = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 864e5);
      return dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`;
    };
    const no = (tag, classe, texto) => {
      const n = document.createElement(tag);
      if (classe) n.className = classe;
      if (texto) n.textContent = texto;
      return n;
    };
    // Os parâmetros do anúncio seguem para a página da oferta.
    const endereco = (id) => {
      const q = new URLSearchParams({ id });
      new URLSearchParams(location.search).forEach((v, k) => { if (k.startsWith('utm_')) q.set(k, v); });
      return `oferta/?${q}`;
    };
    fetch(`${raiz}data/ofertas.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`ofertas.json: ${r.status}`))))
      .then((dados) => {
        const recentes = dados.ofertas
          .filter((o) => !o.exemplo && o.imagem)
          .sort((a, b) => (a.data < b.data ? 1 : -1))
          .slice(0, quantas);
        if (recentes.length < 3) return;
        lista.classList.add('rolagem');
        lista.replaceChildren(...recentes.map((o) => {
          const linha = no('a', 'linha');
          linha.href = endereco(o.id);
          const img = no('img');
          img.src = raiz + o.imagem; img.alt = ''; img.loading = 'lazy';
          const texto = no('span', 'texto');
          texto.append(
            no('span', 'micro', `${LOJAS[o.loja] || o.loja} · ${quando(o.data)}`),
            no('span', 'nome', o.titulo));
          const valor = no('span', 'valor');
          if (o.precoDe > o.preco) valor.append(no('s', '', `R$ ${real(o.precoDe)}`));
          const por = no('b');
          por.append(no('small', '', 'R$'), real(o.preco));
          valor.append(por);
          linha.append(img, texto, valor);
          return linha;
        }));
        const dica = document.getElementById('dica');
        if (dica) {
          dica.textContent = `${recentes.length} ofertas · role a lista e toque para ver`;
          dica.hidden = false;
        }
      })
      .catch((erro) => console.error('[REF:]', erro));
  }

  // Foto larga (relógio deitado) aparece inteira; foto que falha vira o nome do modelo.
  document.querySelectorAll('.shot img').forEach((img) => {
    const conferir = () => { if (img.naturalWidth / img.naturalHeight > 0.8) img.classList.add('fit'); };
    const falhou = () => {
      const ph = document.createElement('div');
      ph.className = 'ph';
      ph.textContent = img.dataset.modelo || '';
      img.replaceWith(ph);
    };
    if (img.complete) (img.naturalWidth ? conferir : falhou)();
    else { img.addEventListener('load', conferir); img.addEventListener('error', falhou); }
  });

  // Botões: abrem direto o grupo com vaga (WhatsApp) ou o canal (Telegram).
  // Até o rodízio responder, vale o endereço fixo /g/<grupo>/.
  const botoes = [...document.querySelectorAll('.js-cta')];
  ['promos', 'telegram'].forEach((grupo) => {
    const dele = botoes.filter((a) => a.dataset.grupo === grupo);
    if (!dele.length) return;
    window.REF.linkDoGrupo(raiz, grupo)
      .then((link) => dele.forEach((a) => { a.href = link; }))
      .catch((erro) => console.error('[REF:]', erro));
  });

  // Registra o Lead no Pixel e só depois abre o grupo.
  botoes.forEach((a) => {
    a.addEventListener('click', (e) => {
      const app = a.dataset.grupo === 'telegram' ? 'telegram' : 'whatsapp';
      const dados = { content_category: categoria, content_name: `grupo_${app}_${a.dataset.pos}` };
      if (utm) dados.utm_content = utm;
      if (!window.REF.evento('Lead', dados)) return; // sem Pixel: segue o link normal
      e.preventDefault();
      setTimeout(() => { location.href = a.href; }, 350);
    });
  });

  // Botão fixo aparece depois que o botão do topo sai da tela.
  const topo = document.querySelector('.hero .cta');
  const fixo = document.getElementById('sticky');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => fixo.classList.toggle('show', !en[0].isIntersecting)).observe(topo);
  } else {
    fixo.classList.add('show');
  }
})();
