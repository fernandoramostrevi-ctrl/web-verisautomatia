// Asistente de FAQ: botón flotante + panel de chat contra el workflow de n8n
// «Web Veris Automatia — Asistente FAQ (chat web)». Fuera del HTML por la CSP.
// Todo el texto se pinta con textContent: nada de la respuesta se interpreta como HTML.
(function(){
  var ENDPOINT = 'https://n8n.frautomatia.com/webhook/4c7e2a19-8b3d-4f6a-9e15-2d0b7c8a6f41/chat';
  var MAX = 500;
  var TIMEOUT_MS = 30000;
  var SALUDO = '¡Hola! Soy el asistente de Veris Automatia. Te resuelvo dudas sobre la Radiografía Operativa, cómo trabajamos y qué construimos. ¿Qué quieres saber?';
  var SUGERENCIAS = ['¿Qué es la Radiografía Operativa?', '¿Cuánto cuesta?', '¿Me encaja si soy una pyme pequeña?'];
  var FALLO = 'No he podido responder ahora mismo. Escríbenos a vaia@verisautomatia.com y te contestamos en menos de 24 h laborables.';

  // Id de sesión por pestaña: sirve para el límite de mensajes y la memoria corta del servidor.
  var sessionId = '';
  try { sessionId = sessionStorage.getItem('veris_chat_sid') || ''; } catch(e){}
  if(!sessionId){
    var a = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(a);
    sessionId = Array.prototype.map.call(a, function(b){ return ('0' + b.toString(16)).slice(-2); }).join('');
    try { sessionStorage.setItem('veris_chat_sid', sessionId); } catch(e){}
  }

  function el(tag, cls, text){
    var n = document.createElement(tag);
    if(cls) n.className = cls;
    if(text != null) n.textContent = text;
    return n;
  }

  // --- Estructura ---
  var launcher = el('button', 'vchat-launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Abrir el asistente de Veris Automatia');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'vchat-panel');
  launcher.appendChild(el('span', 'vchat-launcher-ico', '?'));
  launcher.appendChild(el('span', 'vchat-launcher-txt', '¿Tienes alguna duda?'));

  var panel = el('section', 'vchat-panel');
  panel.id = 'vchat-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Asistente de Veris Automatia');

  var head = el('header', 'vchat-head');
  var titles = el('div', 'vchat-titles');
  titles.appendChild(el('strong', null, '¿Tienes alguna duda?'));
  titles.appendChild(el('span', 'vchat-sub', 'Respuestas sobre nuestros servicios'));
  var close = el('button', 'vchat-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Cerrar el asistente');
  head.appendChild(titles);
  head.appendChild(close);

  var log = el('div', 'vchat-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');

  var chips = el('div', 'vchat-chips');

  var form = el('form', 'vchat-form');
  var input = el('textarea', 'vchat-input');
  input.rows = 1;
  input.maxLength = MAX;
  input.placeholder = 'Escribe tu pregunta…';
  input.setAttribute('aria-label', 'Tu pregunta');
  var send = el('button', 'vchat-send', 'Enviar');
  send.type = 'submit';
  form.appendChild(input);
  form.appendChild(send);

  var aviso = el('p', 'vchat-aviso');
  aviso.appendChild(document.createTextNode('Asistente de IA: puede equivocarse. No compartas datos personales. Lo que escribes se procesa con OpenAI y no se guarda. '));
  var priv = el('a', null, 'Privacidad');
  priv.href = '/privacidad.html#asistente';
  aviso.appendChild(priv);

  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(chips);
  panel.appendChild(form);
  panel.appendChild(aviso);
  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  // --- Mensajes ---
  function addMsg(text, who){
    var m = el('div', 'vchat-msg vchat-' + who, text);
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  addMsg(SALUDO, 'bot');
  SUGERENCIAS.forEach(function(s){
    var c = el('button', 'vchat-chip', s);
    c.type = 'button';
    c.addEventListener('click', function(){ ask(s); });
    chips.appendChild(c);
  });

  var busy = false;
  function setBusy(b){
    busy = b;
    send.disabled = b;
    input.disabled = b;
    panel.classList.toggle('is-busy', b);
  }

  function ask(text){
    text = String(text || '').trim();
    if(!text || busy) return;
    if(text.length > MAX) text = text.slice(0, MAX);
    chips.hidden = true;
    addMsg(text, 'user');
    input.value = '';
    autosize();
    setBusy(true);
    var typing = addMsg('Escribiendo…', 'bot vchat-typing');

    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function(){ if(ctrl) ctrl.abort(); }, TIMEOUT_MS);

    fetch(ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'sendMessage', sessionId: sessionId, chatInput: text}),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function(r){ return r.ok ? r.json() : {}; })
    .then(function(j){
      var out = (j && typeof j.output === 'string' && j.output.trim()) ? j.output.trim() : FALLO;
      typing.remove();
      addMsg(out, 'bot');
    }).catch(function(){
      typing.remove();
      addMsg(FALLO, 'bot');
    }).then(function(){
      clearTimeout(timer);
      setBusy(false);
      input.focus();
    });
  }

  // --- Interacción ---
  function autosize(){
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  function open(o){
    panel.hidden = !o;
    launcher.setAttribute('aria-expanded', o ? 'true' : 'false');
    launcher.classList.toggle('is-open', o);
    if(o){ input.focus(); log.scrollTop = log.scrollHeight; }
    else launcher.focus();
  }

  launcher.addEventListener('click', function(){ open(panel.hidden); });
  close.addEventListener('click', function(){ open(false); });
  panel.addEventListener('keydown', function(e){ if(e.key === 'Escape') open(false); });
  form.addEventListener('submit', function(e){ e.preventDefault(); ask(input.value); });
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); ask(input.value); }
  });
})();
