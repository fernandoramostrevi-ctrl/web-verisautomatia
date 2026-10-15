// Portada (index.html): nav, menú móvil, animación al hacer scroll y formulario de contacto.
// Fuera del HTML para que la CSP pueda prohibir scripts inline.
(function(){
  var nav = document.querySelector('header.nav');
  function onScroll(){ if(nav) nav.toggleAttribute('data-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});


  // menú móvil (hamburguesa)
  var burger = document.querySelector('.nav-burger');
  if(nav && burger){
    burger.addEventListener('click', function(){
      var open = nav.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    nav.querySelectorAll('.mobile-menu a').forEach(function(a){
      a.addEventListener('click', function(){
        nav.classList.remove('menu-open');
        burger.setAttribute('aria-expanded','false');
        burger.setAttribute('aria-label','Abrir menú');
      });
    });
  }

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

(function(){
  var form = document.getElementById('contact-form');
  if(!form) return;

  // Origen del contacto: utm_source/utm_content del enlace por el que entró y el dominio que le trajo.
  // Se guardan en la pestaña (sessionStorage) para no perderlos si navega antes de escribir. Sin cookies.
  var origen = {};
  try { origen = JSON.parse(sessionStorage.getItem('veris_origen') || '{}'); } catch(e){}
  try {
    var qs = new URLSearchParams(location.search);
    if(qs.get('utm_source') || qs.get('utm_content')){
      origen.utm_source = qs.get('utm_source') || '';
      origen.utm_content = qs.get('utm_content') || '';
    }
    if(!origen.referrer && document.referrer){
      var host = new URL(document.referrer).hostname;
      if(host && host !== location.hostname) origen.referrer = host;
    }
    sessionStorage.setItem('veris_origen', JSON.stringify(origen));
  } catch(e){}

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setErr(name, msg){
    var field = form.elements[name];
    var box = document.getElementById('err-' + name);
    if(box) box.textContent = msg || '';
    if(field && field.setAttribute) field.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function selectedServices(){
    return Array.prototype.map.call(form.querySelectorAll('input[name="services"]:checked'), function(i){ return i.value; });
  }

  // Desplegable de servicios: botón que abre un panel con las casillas. Se cierra con Esc o al pulsar fuera.
  var msBtn = document.getElementById('svc-btn');
  var msPanel = document.getElementById('svc-panel');
  var msText = msBtn.querySelector('.ms-text');
  function msOpen(open){
    msPanel.hidden = !open;
    msBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function msUpdate(){
    var sel = selectedServices();
    msText.textContent = !sel.length ? 'Selecciona una o varias opciones'
      : sel.length <= 2 ? sel.join(', ') : sel.length + ' seleccionados';
    msBtn.classList.toggle('has-value', sel.length > 0);
    if(sel.length){ document.getElementById('err-services').textContent = ''; form.querySelector('.svc').setAttribute('aria-invalid','false'); }
  }
  msBtn.addEventListener('click', function(){ msOpen(msPanel.hidden); });
  msPanel.addEventListener('change', msUpdate);
  document.addEventListener('click', function(e){ if(!msPanel.hidden && !e.target.closest('.ms')) msOpen(false); });
  form.querySelector('.ms').addEventListener('keydown', function(e){
    if(e.key === 'Escape' && !msPanel.hidden){ msOpen(false); msBtn.focus(); }
  });

  function validate(){
    var firstBad = null;
    if(!form.elements.name.value.trim()){ setErr('name','Dinos tu nombre.'); firstBad = firstBad || form.elements.name; } else setErr('name','');
    if(!EMAIL_RE.test(form.elements.email.value.trim())){ setErr('email','Introduce un email válido (p. ej. nombre@empresa.com).'); firstBad = firstBad || form.elements.email; } else setErr('email','');
    var svc = form.querySelector('.svc');
    if(!selectedServices().length){
      document.getElementById('err-services').textContent = 'Marca al menos una opción.';
      svc.setAttribute('aria-invalid','true');
      firstBad = firstBad || msBtn;
    } else { document.getElementById('err-services').textContent = ''; svc.setAttribute('aria-invalid','false'); }
    if(!form.elements.consent.checked){ setErr('consent','Necesitamos tu consentimiento para responderte.'); firstBad = firstBad || form.elements.consent; } else setErr('consent','');
    if(firstBad && firstBad.focus) firstBad.focus();
    return !firstBad;
  }

  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    var st = form.querySelector('.form-status');
    var btn = form.querySelector('button[type="submit"]');
    st.className = 'form-status';
    st.textContent = '';
    if(!validate()) return;
    var data = {
      name: form.elements.name.value,
      email: form.elements.email.value,
      message: form.elements.message.value,
      services: selectedServices(),
      web: form.elements.web.value,
      utm_source: origen.utm_source || '',
      utm_content: origen.utm_content || '',
      referrer: origen.referrer || ''
    };
    btn.disabled = true;
    st.textContent = 'Enviando…';
    fetch('https://n8n.frautomatia.com/webhook/contacto-verisautomatia', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    }).then(function(r){ return r.json().catch(function(){ return {ok:false}; }); })
    .then(function(j){
      if(j.ok){
        st.className = 'form-status ok';
        st.textContent = 'Mensaje enviado. Te respondemos en menos de 24 h laborables.';
        form.reset();
        ['name','email','message','consent'].forEach(function(n){ setErr(n,''); });
        document.getElementById('err-services').textContent = '';
        form.querySelector('.svc').setAttribute('aria-invalid','false');
        msUpdate(); msOpen(false);
      } else {
        st.className = 'form-status err';
        st.textContent = 'No se pudo enviar. Revisa los datos o escríbenos a vaia@verisautomatia.com';
      }
    }).catch(function(){
      st.className = 'form-status err';
      st.textContent = 'No se pudo enviar. Escríbenos a vaia@verisautomatia.com';
    }).then(function(){ btn.disabled = false; });
  });
})();
