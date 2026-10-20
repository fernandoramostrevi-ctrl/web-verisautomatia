// Landing de recursos (recursos/index.html): formulario nombre + email + repetir email.
// Fuera del HTML para que la CSP pueda prohibir scripts inline. Mismo patrón que home.js.
(function(){
  var form = document.getElementById('lead-form');
  if(!form) return;

  // URL del webhook de n8n que recibe el lead. Debe devolver {"ok": true}.
  var ENDPOINT = 'https://n8n.frautomatia.com/webhook/lead-recursos';
  var GRACIAS = '/recursos/gracias.html';

  // Origen del lead: utm_source/utm_content del enlace por el que entró (cada vídeo lleva su utm_content)
  // y el dominio que le trajo. Se guardan en la pestaña (sessionStorage), sin cookies.
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
  var email2 = form.elements.email2;

  // Repetir email: sin pegar ni soltar texto, para que se escriba de verdad.
  ['paste', 'drop'].forEach(function(evt){
    email2.addEventListener(evt, function(e){
      e.preventDefault();
      setErr('email2', 'Escríbelo de nuevo a mano, así evitamos erratas.');
    });
  });

  function setErr(name, msg){
    var field = form.elements[name];
    var box = document.getElementById('err-' + name);
    if(box) box.textContent = msg || '';
    if(field && field.setAttribute) field.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function validate(){
    var firstBad = null;
    var name = form.elements.name.value.trim();
    var email = form.elements.email.value.trim().toLowerCase();
    var rep = email2.value.trim().toLowerCase();
    if(!name){ setErr('name', 'Dime tu nombre.'); firstBad = firstBad || form.elements.name; } else setErr('name', '');
    if(!EMAIL_RE.test(email)){ setErr('email', 'Introduce un email válido (p. ej. nombre@correo.com).'); firstBad = firstBad || form.elements.email; } else setErr('email', '');
    if(!rep){ setErr('email2', 'Repite tu email.'); firstBad = firstBad || email2; }
    else if(rep !== email){ setErr('email2', 'Los dos emails no coinciden.'); firstBad = firstBad || email2; }
    else setErr('email2', '');
    if(!form.elements.consent.checked){ setErr('consent', 'Necesito tu consentimiento para darte acceso.'); firstBad = firstBad || form.elements.consent; } else setErr('consent', '');
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
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim().toLowerCase(),
      web: form.elements.web.value,            // honeypot: si viene relleno, es un bot
      recurso: 'subtitular-karaoke',
      utm_source: origen.utm_source || '',
      utm_content: origen.utm_content || '',
      referrer: origen.referrer || ''
    };
    btn.disabled = true;
    st.textContent = 'Enviando…';
    fetch(ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    }).then(function(r){ return r.json().catch(function(){ return {ok:false}; }); })
    .then(function(j){
      if(j.ok){
        location.assign(GRACIAS);
        return;
      }
      st.className = 'form-status err';
      st.textContent = 'No se pudo enviar. Revisa los datos o escríbeme a vaia@verisautomatia.com';
      btn.disabled = false;
    }).catch(function(){
      st.className = 'form-status err';
      st.textContent = 'No se pudo enviar. Escríbeme a vaia@verisautomatia.com';
      btn.disabled = false;
    });
  });
})();
