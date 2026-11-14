// Endereços fixos /g/<slug>/ → grupo de WhatsApp escolhido em data/grupos.json.
// modo "encher": manda sempre para o primeiro grupo aberto da lista.
// modo "alternar": sorteia entre os abertos, respeitando o peso de cada um.

(async () => {
  const slug = document.currentScript.dataset.slug;
  const msg = document.getElementById('msg');
  const manual = document.getElementById('manual');

  function escolher(entrada) {
    const todos = entrada.grupos || [];
    if (!todos.length) return null;
    const abertos = todos.filter((g) => g.status !== 'cheio');
    // Todos cheios: melhor mandar para o mais novo do que para lugar nenhum.
    if (!abertos.length) return todos[todos.length - 1];
    if (entrada.modo !== 'alternar') return abertos[0];
    const total = abertos.reduce((s, g) => s + (g.peso || 1), 0);
    let r = Math.random() * total;
    for (const g of abertos) {
      r -= g.peso || 1;
      if (r < 0) return g;
    }
    return abertos[abertos.length - 1];
  }

  try {
    const r = await fetch('../../data/grupos.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(`grupos.json: ${r.status}`);
    const grupo = escolher((await r.json())[slug] || {});
    if (!grupo || !/^https:\/\/(chat\.whatsapp\.com|t\.me)\//.test(grupo.link)) {
      throw new Error(`sem grupo válido para "${slug}"`);
    }
    manual.href = grupo.link;
    manual.hidden = false;
    location.replace(grupo.link);
  } catch (erro) {
    console.error('[REF:]', erro);
    msg.textContent = 'Não foi possível abrir o grupo agora.';
    manual.textContent = 'Voltar para a página da REF:';
    manual.href = '../../';
    manual.hidden = false;
  }
})();
