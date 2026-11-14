// Endereços fixos /g/<slug>/ → grupo escolhido em data/grupos.json (regra em grupos.js).

(async () => {
  const slug = document.currentScript.dataset.slug;
  const msg = document.getElementById('msg');
  const manual = document.getElementById('manual');

  try {
    const link = await window.REF.linkDoGrupo('../../', slug);
    manual.href = link;
    manual.hidden = false;

    // Entrada medida no Pixel. Quem vem de uma página de campanha (?o=campanha) já foi contado lá.
    let medido = false;
    if (new URLSearchParams(location.search).get('o') !== 'campanha' && window.REF.evento) {
      medido = slug === 'promos' || slug === 'telegram'
        ? window.REF.evento('Lead', { content_category: 'site', content_name: `grupo_${slug}` })
        : window.REF.evento('EntrarGrupo', { content_name: slug }, true);
    }
    setTimeout(() => location.replace(link), medido ? 350 : 0);
  } catch (erro) {
    console.error('[REF:]', erro);
    msg.textContent = 'Não foi possível abrir o grupo agora.';
    manual.textContent = 'Voltar para a página da REF:';
    manual.href = '../../';
    manual.hidden = false;
  }
})();
