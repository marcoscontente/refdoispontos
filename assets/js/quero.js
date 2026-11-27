// Formulário "Quero esse relógio" (/quero/). Confere os campos aqui, envia para enviar.php
// e troca o formulário pela mensagem de recebido. O PHP confere tudo de novo.
(function () {
  const form = document.getElementById('form');
  const botao = document.getElementById('enviar');
  const erroGeral = document.getElementById('erro-geral');
  const sucesso = document.getElementById('sucesso');
  document.getElementById('t').value = String(Date.now());

  const regras = {
    marca: (v) => (v.trim().length < 2 ? 'Escreva a marca do relógio.' : ''),
    modelo: (v) => (v.trim().length < 2 ? 'Escreva o modelo do relógio.' : ''),
    email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Confira o e-mail ou deixe em branco.'),
    telefone: (v) => {
      const d = v.replace(/\D/g, '');
      if (!d) return '';
      return d.length >= 10 && d.length <= 13 ? '' : 'Confira o telefone: DDD e número, ou deixe em branco.';
    },
  };

  function conferir(nome) {
    const campo = form.elements[nome];
    const msg = regras[nome](campo.value);
    const erro = document.getElementById(`${nome}-erro`);
    erro.textContent = msg;
    erro.hidden = !msg;
    campo.setAttribute('aria-invalid', String(Boolean(msg)));
    return !msg;
  }

  // Erro aparece ao sair do campo; depois de errado, some assim que a pessoa corrige.
  Object.keys(regras).forEach((nome) => {
    const campo = form.elements[nome];
    campo.addEventListener('blur', () => { if (campo.value || campo.getAttribute('aria-invalid')) conferir(nome); });
    campo.addEventListener('input', () => { if (campo.getAttribute('aria-invalid') === 'true') conferir(nome); });
  });

  // Telefone com máscara simples: (11) 91234-5678
  const tel = form.elements.telefone;
  tel.addEventListener('input', () => {
    const d = tel.value.replace(/\D/g, '').slice(0, 11);
    if (d.length < 3) return;
    tel.value = d.length > 10
      ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
      : `(${d.slice(0, 2)}) ${d.slice(2, 6)}${d.length > 6 ? '-' : ''}${d.slice(6)}`;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erroGeral.hidden = true;
    const invalidos = Object.keys(regras).filter((nome) => !conferir(nome));
    if (invalidos.length) {
      form.elements[invalidos[0]].focus();
      return;
    }

    botao.disabled = true;
    botao.textContent = 'Enviando…';
    try {
      const r = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const dados = await r.json().catch(() => ({}));
      if (!r.ok || !dados.ok) throw new Error(dados.erro || 'Não foi possível enviar agora.');
      window.REF?.evento?.('SubmitApplication', { content_category: 'quero' });
      form.hidden = true;
      sucesso.hidden = false;
      sucesso.focus();
      sucesso.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } catch (erro) {
      erroGeral.textContent = `${erro.message} Tente de novo em instantes.`;
      erroGeral.hidden = false;
    } finally {
      botao.disabled = false;
      botao.textContent = 'Enviar pedido';
    }
  });

  document.getElementById('outra').addEventListener('click', () => {
    form.reset();
    document.getElementById('t').value = String(Date.now());
    form.querySelectorAll('[aria-invalid]').forEach((c) => c.removeAttribute('aria-invalid'));
    form.querySelectorAll('.erro').forEach((p) => { p.hidden = true; });
    sucesso.hidden = true;
    form.hidden = false;
    form.elements.marca.focus();
  });
})();
