// Rodízio dos grupos, a partir de data/grupos.json. Usado por /g/<slug>/ e pelas páginas de campanha.
// modo "encher": manda sempre para o primeiro grupo aberto da lista.
// modo "alternar": sorteia entre os abertos, respeitando o peso de cada um.
window.REF = window.REF || {};

window.REF.escolherGrupo = function (entrada) {
  const todos = (entrada && entrada.grupos) || [];
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
};

// raiz = caminho até a pasta do site ("../", "../../"). Devolve o link do grupo ou lança erro.
window.REF.linkDoGrupo = async function (raiz, slug) {
  const r = await fetch(`${raiz}data/grupos.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`grupos.json: ${r.status}`);
  const grupo = window.REF.escolherGrupo((await r.json())[slug]);
  if (!grupo || !/^https:\/\/(chat\.whatsapp\.com|t\.me)\//.test(grupo.link)) {
    throw new Error(`sem grupo válido para "${slug}"`);
  }
  return grupo.link;
};
