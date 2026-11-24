// Páginas de campanha (/promos/...). O conteúdo já vem escrito no HTML por scripts/gerar-campanhas.mjs;
// aqui ficam só o botão do grupo, a medição e os ajustes de tela.
(function () {
  const corpo = document.body;
  const categoria = corpo.dataset.categoria;
  const raiz = corpo.dataset.raiz;
  const utm = new URLSearchParams(location.search).get('utm_content') || '';

  // No dia marcado na campanha (data-dia, no horário de quem abre a página) entram os textos do dia.
  const hoje = new Date();
  const dataLocal = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  if (corpo.dataset.dia === dataLocal) {
    if (corpo.dataset.diaChamada) document.getElementById('eyebrow').textContent = corpo.dataset.diaChamada;
    if (corpo.dataset.diaTexto) document.getElementById('lead').textContent = corpo.dataset.diaTexto;
    const selo = document.querySelector('.selo');
    if (selo && corpo.dataset.diaSelo) {
      selo.replaceChildren(...corpo.dataset.diaSelo.split('|').flatMap((linha, i) =>
        (i ? [document.createElement('br'), linha] : [linha])));
    }
  }

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
  const lista = document.getElementById('cards');
  if (utm) {
    const partes = utm.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const doAnuncio = [...lista.children].find((c) =>
      (c.dataset.anuncios || '').split(' ').filter(Boolean)
        .some((codigo) => partes.some((p) => p.startsWith(codigo))));
    if (doAnuncio) lista.prepend(doAnuncio);
  }

  // Lista de ofertas recentes: os cartões já vêm escritos no HTML por scripts/gerar-campanhas.mjs
  // (Amazon com link direto e a tag da REF:; Mercado Livre abrindo a página da oferta).
  // Aqui só a data relativa, os parâmetros do anúncio e a altura da caixa com rolagem.
  const quando = (iso) => {
    const dias = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 864e5);
    return dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`;
  };
  document.querySelectorAll('.card.oferta time[datetime]').forEach((t) => { t.textContent = quando(t.dateTime); });

  // Os parâmetros do anúncio seguem para a página da oferta (só links internos; o da Amazon não muda).
  const utms = new URLSearchParams();
  new URLSearchParams(location.search).forEach((v, k) => { if (k.startsWith('utm_')) utms.set(k, v); });
  if ([...utms].length) {
    document.querySelectorAll('.card.oferta[href*="promos/oferta/"]').forEach((a) => {
      a.href += `&${utms}`;
    });
  }

  // Clique na oferta da Amazon: registra no Pixel sem trocar o link nem segurar a navegação.
  document.querySelectorAll('a.card[data-loja="amazon"]').forEach((a) => {
    a.addEventListener('click', () => {
      const dados = { content_category: 'amazon', content_name: a.querySelector('.model')?.textContent || '' };
      if (a.dataset.id) dados.content_ids = [a.dataset.id];
      if (utm) dados.utm_content = utm;
      if (window.REF.evento) window.REF.evento('ViewContent', dados);
    });
  });

  if (lista.classList.contains('rolagem')) {
    // A caixa mostra 6 cartões inteiros; os outros rolam dentro dela.
    const VISIVEIS = 6;
    const ajustarCaixa = () => {
      const setimo = lista.children[VISIVEIS];
      if (!setimo) { lista.style.maxHeight = ''; return; }
      const estilo = getComputedStyle(lista);
      const sobra = parseFloat(estilo.rowGap) || 0;
      lista.style.maxHeight =
        `${setimo.offsetTop - lista.children[0].offsetTop - sobra + 2 * parseFloat(estilo.paddingTop)}px`;
    };
    ajustarCaixa();
    window.addEventListener('resize', ajustarCaixa);
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
  if (!topo || !fixo) return; // página sem barra fixa (ex.: doações)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => fixo.classList.toggle('show', !en[0].isIntersecting)).observe(topo);
  } else {
    fixo.classList.add('show');
  }
})();
