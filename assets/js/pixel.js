// Meta Pixel da REF:. Um lugar só para o ID: vazio = Pixel desligado em todo o site.
window.REF_PIXEL_ID = '1577928044107696';

window.REF = window.REF || {};

(function () {
  if (!window.REF_PIXEL_ID) return;
  // Testes no computador não entram nos números do Pixel.
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', window.REF_PIXEL_ID);
  fbq('track', 'PageView');
})();

// Dispara um evento. Devolve true se o Pixel recebeu (quem chama espera um instante antes de sair da página).
window.REF.evento = function (nome, dados, personalizado) {
  if (typeof fbq !== 'function') return false;
  try {
    fbq(personalizado ? 'trackCustom' : 'track', nome, dados || {});
    return true;
  } catch (erro) {
    return false;
  }
};
