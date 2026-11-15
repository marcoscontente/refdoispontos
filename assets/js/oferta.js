// Página de uma oferta (/promos/oferta/?id=tg-123): mostra o item de data/ofertas.json
// e os dois botões de entrada no grupo.
(function () {
  const raiz = document.body.dataset.raiz;
  const parametros = new URLSearchParams(location.search);
  const id = parametros.get('id') || '';
  const utm = parametros.get('utm_content') || '';
  const $ = (i) => document.getElementById(i);
  const LOJAS = { amazon: 'Amazon', mercadolivre: 'Mercado Livre' };
  const real = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

  // O "voltar" mantém os parâmetros do anúncio.
  const utms = new URLSearchParams();
  parametros.forEach((v, k) => { if (k.startsWith('utm_')) utms.set(k, v); });
  if ([...utms].length) $('voltar').href = `../?${utms}`;

  // Quem veio da página principal volta para ela.
  if (parametros.get('de') === 'home') {
    $('voltar').href = '../../#ofertas';
    $('voltar').textContent = '← Voltar para as ofertas';
    document.querySelector('.logo').href = '../../';
  }

  function semOferta() {
    $('titulo').textContent = 'Esse achado já saiu da lista.';
    $('extra').textContent = 'As ofertas mudam rápido. Entre grátis no grupo e receba as próximas na hora.';
  }

  fetch(`${raiz}data/ofertas.json`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`ofertas.json: ${r.status}`))))
    .then((dados) => {
      const o = dados.ofertas.find((x) => x.id === id && !x.exemplo);
      if (!o) return semOferta();
      document.title = `${o.titulo} — REF: PROMOS`;
      if (o.imagem) { $('foto').src = raiz + o.imagem; $('foto').alt = o.titulo; $('foto').hidden = false; }
      $('loja').textContent = LOJAS[o.loja] || o.loja;
      $('titulo').textContent = o.titulo;
      if (o.precoDe > o.preco) { $('de').textContent = `De R$ ${real(o.precoDe)}`; $('de').hidden = false; }
      const pequeno = document.createElement('small');
      pequeno.textContent = 'R$';
      $('por').replaceChildren(pequeno, real(o.preco));
      $('por').hidden = false;
      $('selo').hidden = false;
      window.REF.evento('ViewContent', {
        content_ids: [o.id], content_type: 'product', content_name: o.titulo,
        content_category: o.loja, value: o.preco, currency: 'BRL',
      });
    })
    .catch((erro) => { console.error('[REF:]', erro); semOferta(); });

  // Botões: abrem direto o grupo com vaga; até o rodízio responder, vale /g/<grupo>/.
  const botoes = [...document.querySelectorAll('.js-cta')];
  ['promos', 'telegram'].forEach((grupo) => {
    const dele = botoes.filter((a) => a.dataset.grupo === grupo);
    window.REF.linkDoGrupo(raiz, grupo)
      .then((link) => dele.forEach((a) => { a.href = link; }))
      .catch((erro) => console.error('[REF:]', erro));
  });
  botoes.forEach((a) => {
    a.addEventListener('click', (e) => {
      const app = a.dataset.grupo === 'telegram' ? 'telegram' : 'whatsapp';
      const dados = { content_category: 'oferta', content_name: `grupo_${app}_oferta`, content_ids: [id] };
      if (utm) dados.utm_content = utm;
      if (!window.REF.evento('Lead', dados)) return; // sem Pixel: segue o link normal
      e.preventDefault();
      setTimeout(() => { location.href = a.href; }, 350);
    });
  });
})();
