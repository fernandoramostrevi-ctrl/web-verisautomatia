// Landings de recursos (recursos/<recurso>/index.html): nombre + email + dos casillas (privacidad
// obligatoria, correos comerciales opcional). Fuera del HTML para que la CSP pueda prohibir scripts
// inline. Cada landing configura su formulario con data-recurso, data-consent-version y data-gracias.
// El workflow de n8n es el mismo que el del formulario de contacto: lo distingue formulario='recurso'.
(function(){
  var form = document.getElementById('lead-form');
  if(!form) return;

  // URL del webhook de n8n. Debe devolver {"ok": true}.
  var ENDPOINT = 'https://n8n.frautomatia.com/webhook/contacto-verisautomatia';
  var RECURSO = form.getAttribute('data-recurso') || '';
  var CONSENT_VERSION = form.getAttribute('data-consent-version') || '';
  var GRACIAS = form.getAttribute('data-gracias') || '/';

  // Origen del lead: los cinco UTM del enlace por el que entró, la página de entrada, el dominio que le
  // trajo y cuándo llegó. Se guardan en la pestaña (sessionStorage, sin cookies) para no perderlos si
  // recarga; una visita con UTM nuevos los sustituye.
  var CLAVE = 'veris_origen_' + RECURSO;
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var origen = {};
  try { origen = JSON.parse(sessionStorage.getItem(CLAVE) || '{}'); } catch(e){}
  try {
    var qs = new URLSearchParams(location.search);
    var traeUtm = UTM.some(function(k){ return qs.get(k); });
    if(traeUtm || !origen.landing_url){
      UTM.forEach(function(k){ origen[k] = (qs.get(k) || '').slice(0, 100); });
      origen.landing_url = (location.origin + location.pathname + location.search).slice(0, 300);
      origen.timestamp = new Date().toISOString();
    }
    if(!origen.referrer && document.referrer){
      var host = new URL(document.referrer).hostname;
      if(host && host !== location.hostname) origen.referrer = host;
    }
    sessionStorage.setItem(CLAVE, JSON.stringify(origen));
  } catch(e){}

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setErr(name, msg){
    var field = form.elements[name];
    var box = document.getElementById('err-' + name);
    if(box) box.textContent = msg || '';
    if(field && field.setAttribute) field.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  // Mismas reglas que «Validar y sanear» en n8n, que vuelve a comprobarlo todo.
  function validate(){
    var firstBad = null;
    var name = form.elements.name.value.trim();
    var email = form.elements.email.value.trim().toLowerCase();
    if(name.length < 2){ setErr('name', 'Dime tu nombre.'); firstBad = firstBad || form.elements.name; } else setErr('name', '');
    if(!EMAIL_RE.test(email)){ setErr('email', 'Introduce un email válido (p. ej. nombre@correo.com).'); firstBad = firstBad || form.elements.email; } else setErr('email', '');
    if(!form.elements.consent_privacidad.checked){ setErr('consent_privacidad', 'Necesito tu consentimiento para invitarte al grupo.'); firstBad = firstBad || form.elements.consent_privacidad; }
    else setErr('consent_privacidad', '');
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
      formulario: 'recurso',
      recurso: RECURSO,
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim().toLowerCase(),
      hp_k7q: form.elements.hp_k7q.value,      // honeypot: si viene relleno, es un bot
      consent_version: CONSENT_VERSION,
      consent_privacidad: form.elements.consent_privacidad.checked,
      consent_comercial: form.elements.consent_comercial.checked,
      landing_url: origen.landing_url || '',
      referrer: origen.referrer || '',
      timestamp: origen.timestamp || ''
    };
    UTM.forEach(function(k){ data[k] = origen[k] || ''; });
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
      st.textContent = j.motivo === 'limite'
        ? 'Demasiados envíos seguidos. Prueba dentro de un rato o escríbeme a vaia@verisautomatia.com'
        : 'No se pudo enviar. Revisa los datos o escríbeme a vaia@verisautomatia.com';
      btn.disabled = false;
    }).catch(function(){
      st.className = 'form-status err';
      st.textContent = 'No se pudo enviar. Escríbeme a vaia@verisautomatia.com';
      btn.disabled = false;
    });
  });
})();
