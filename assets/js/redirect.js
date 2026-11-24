// Endereços fixos /g/<slug>/ → grupo escolhido em data/grupos.json (regra em grupos.js).
// O HTML já traz o link do grupo (botão "Se não abrir, toque aqui" e meta refresh),
// escrito por scripts/gerar-campanhas.mjs. Aqui: Pixel antes de sair e o rodízio entre grupos.

(async () => {
  const slug = document.currentScript.dataset.slug;
  const manual = document.getElementById('manual');
  const fixo = manual.getAttribute('href');

  // Entrada medida no Pixel. Quem vem de uma página de campanha (?o=campanha) já foi contado lá.
  let medido = false;
  if (new URLSearchParams(location.search).get('o') !== 'campanha' && window.REF.evento) {
    medido = slug === 'promos' || slug === 'telegram'
      ? window.REF.evento('Lead', { content_category: 'site', content_name: `grupo_${slug}` })
      : window.REF.evento('EntrarGrupo', { content_name: slug }, true);
  }

  let link = fixo;
  try {
    link = await window.REF.linkDoGrupo('../../', slug);
    manual.href = link;
  } catch (erro) {
    console.error('[REF:]', erro); // segue com o link escrito no HTML
  }

  setTimeout(() => location.replace(link), medido ? 350 : 0);
})();
