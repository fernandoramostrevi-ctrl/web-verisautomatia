// Páginas de servicio (servicios/*.html). Fuera del HTML para que la CSP pueda prohibir scripts inline.
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll('.reveal, .reveal-group');
  if(reduce || !('IntersectionObserver' in window)){
    targets.forEach(function(el){ el.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, {threshold:.14, rootMargin:'0px 0px -8% 0px'});
  targets.forEach(function(el){ io.observe(el); });
})();

// Reproductor de la demo: play manual (lleva sonido), luego controles nativos. Solo existe en recepcionista-whatsapp.
(function(){
  var player = document.querySelector('.demo-player');
  if(!player) return;
  var video = player.querySelector('video');
  var btn = player.querySelector('.demo-play');
  function start(){
    player.classList.add('is-playing');
    video.setAttribute('controls','');
    var p = video.play();
    if(p && p.catch){ p.catch(function(){}); }
  }
  btn.addEventListener('click', start);
  video.addEventListener('ended', function(){
    video.removeAttribute('controls');
    player.classList.remove('is-playing');
    video.load(); // restaura el póster
  });
})();
