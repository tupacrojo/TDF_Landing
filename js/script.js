// Configura aquí tu Meta Pixel ID (si lo tenés) y/o un endpoint para registrar clicks server-side
const PIXEL_ID = ""; // e.g. '1234567890'
// Para GitHub Pages (sitio estático) dejamos el endpoint vacío por defecto.
// Si tenés un endpoint público (server o serverless o un webhook de Zapier/Formspree), pon la URL aquí
// o configura el atributo `data-tracking-endpoint` en el elemento <body> del `index.html`.
let TRACKING_ENDPOINT = ""; // e.g. 'https://mi-backend.com/track' or Zapier webhook

// Leer endpoint de data attribute en <body> (permite editarlo directamente en GitHub Pages UI)
try{
  const fromBody = document && document.body && document.body.dataset && document.body.dataset.trackingEndpoint;
  if(fromBody && fromBody.trim().length) TRACKING_ENDPOINT = fromBody.trim();
}catch(e){ /* ignore for non-browser context */ }

// --- Meta Pixel init (si se configura) ---
function initMetaPixel(id){
  if(!id) return;
  !(function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  })(window, document,'script', 'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', id);
}

// --- Envío de eventos al endpoint configurado ---
function sendTrackingEvent(name, payload={}){
  const data = {
    event: name,
    timestamp: new Date().toISOString(),
    url: location.href,
    userAgent: navigator.userAgent,
    language: navigator.language || null,
    platform: navigator.platform || null,
    screen: { w: screen.width, h: screen.height },
    referrer: document.referrer || null,
    ...payload
  };

  // Enviar a endpoint configurado (si existe)
  if(TRACKING_ENDPOINT){
    try{
      if(navigator.sendBeacon){
        navigator.sendBeacon(TRACKING_ENDPOINT, JSON.stringify(data));
      } else {
        fetch(TRACKING_ENDPOINT, {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(data)}).catch(()=>{});
      }
    }catch(e){ console.warn('Error enviando evento', e) }
  } else {
    // Si no hay endpoint, solo logueamos en consola para pruebas
    console.log('Tracking event (no endpoint):', data);
  }

  // También enviar evento a Meta Pixel si está definido
  if(window.fbq){
    try{ window.fbq('trackCustom', name, {link: payload.link || null}); }catch(e){}
  }
}

// --- Consentimiento: sólo trackear si el usuario dio su consentimiento explícito ---
function hasConsent(){
  return localStorage.getItem('tdf_consent') === 'yes';
}

function setConsent(value, email=null){
  localStorage.setItem('tdf_consent', value ? 'yes' : 'no');
  if(email) localStorage.setItem('tdf_email', email);
}

// Adjuntar tracking a enlaces (se ejecuta cuando hay consentimiento o para logs locales)
function attachClickTracking(){
  document.querySelectorAll('[data-link]').forEach(el=>{
    el.addEventListener('click', (ev)=>{
      const link = el.getAttribute('data-link') || el.href;
      // enviar evento sólo si tenemos consentimiento, si no, guardamos localmente
      const payload = { link };
      if(hasConsent()){
        // opcional: intentar obtener geolocalización (bajo permiso)
        try{
          if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(pos=>{
              payload.geo = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
              sendTrackingEvent('link_click', payload);
            }, ()=>{
              sendTrackingEvent('link_click', payload);
            }, {timeout:3000});
          } else {
            sendTrackingEvent('link_click', payload);
          }
        }catch(e){ sendTrackingEvent('link_click', payload); }
      } else {
        // sin consentimiento, solo logging local anónimo
        try{
          const stats = JSON.parse(localStorage.getItem('tdf_stats')||'{}');
          stats[link] = (stats[link]||0)+1;
          localStorage.setItem('tdf_stats', JSON.stringify(stats));
        }catch(e){}
      }
    });
  });
}

// Manejo del formulario de consentimiento
function setupConsentForm(){
  const consentEl = document.getElementById('consent');
  const form = document.getElementById('consentForm');
  const skip = document.getElementById('skipTracking');
  if(!consentEl) return;

  // Si ya dio consentimiento, ocultamos banner
  if(hasConsent()){
    consentEl.style.display = 'none';
    initMetaPixel(PIXEL_ID);
    sendTrackingEvent('page_view', {});
    attachClickTracking();
    return;
  }

  form.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const email = document.getElementById('email').value || null;
    const checked = document.getElementById('consentCheckbox').checked;
    if(!checked){ alert('Debes aceptar para continuar con el seguimiento.'); return; }
    setConsent(true, email);
    // enviar evento de opt-in
    sendTrackingEvent('consent_given', { email });
    initMetaPixel(PIXEL_ID);
    consentEl.style.display = 'none';
    attachClickTracking();
  });

  skip.addEventListener('click', ()=>{
    setConsent(false);
    consentEl.style.display = 'none';
    // attach click tracking but in local-only mode
    attachClickTracking();
  });
}

// Inicialización
document.addEventListener('DOMContentLoaded', ()=>{
  // No enviamos page_view hasta que el usuario acepte; si ya aceptó, el formulario se oculta y se dispara.
  setupConsentForm();
});
