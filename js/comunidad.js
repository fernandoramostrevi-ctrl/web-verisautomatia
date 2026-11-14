// Landing de la comunidad (comunidad/index.html): los mensajes del móvil simulado aparecen uno a uno
// cuando la sección entra en pantalla. Fuera del HTML porque la CSP prohíbe scripts inline.
// Sin JS, sin IntersectionObserver o con «reducir movimiento», se ven todos desde el principio.
(function(){
  var chat = document.querySelector('.chat');
  if(!chat || !('IntersectionObserver' in window)) return;
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  chat.classList.add('anim');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ chat.classList.add('play'); io.disconnect(); }
    });
  }, {threshold: 0.35});
  io.observe(chat);
})();
