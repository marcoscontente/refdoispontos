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

  // Botão: abre direto o grupo com vaga. Até o rodízio responder, vale o endereço fixo /g/promos/.
  const botoes = document.querySelectorAll('.js-cta');
  window.REF.linkDoGrupo(raiz, 'promos')
    .then((link) => botoes.forEach((a) => { a.href = link; }))
    .catch((erro) => console.error('[REF:]', erro));

  // Registra o Lead no Pixel e só depois abre o WhatsApp.
  botoes.forEach((a) => {
    a.addEventListener('click', (e) => {
      const dados = { content_category: categoria, content_name: `grupo_whatsapp_${a.dataset.pos}` };
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
