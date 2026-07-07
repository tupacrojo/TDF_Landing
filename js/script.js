// Configura aquí tu Meta Pixel ID (si lo tenés) y/o un endpoint para registrar clicks server-side
const PIXEL_ID = "2663900733992873"; // e.g. '1234567890'
// Para GitHub Pages (sitio estático) dejamos el endpoint vacío por defecto.
// Si tenés un endpoint público (server o serverless o un webhook de Zapier/Formspree), pon la URL aquí
// o configura el atributo `data-tracking-endpoint` en el elemento <body> del `index.html`.
let TRACKING_ENDPOINT = ""; // e.g. 'https://mi-backend.com/track' or Zapier webhook

// Leer endpoint de data attribute en <body> (permite editarlo directamente en GitHub Pages UI)
try {
  const fromBody =
    document &&
    document.body &&
    document.body.dataset &&
    document.body.dataset.trackingEndpoint;
  if (fromBody && fromBody.trim().length) TRACKING_ENDPOINT = fromBody.trim();
} catch (e) {
  /* ignore for non-browser context */
}

// --- Meta Pixel: carga del script base (una sola vez) ---
function loadPixelScript() {
  if (window.fbq) return;
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js",
  );
}

// Se inicializa siempre al cargar la página (base tracking: PageView + clicks).
// No requiere consentimiento porque no envía datos personales.
let pixelBaseInitialized = false;
function initMetaPixel(id) {
  if (!id || pixelBaseInitialized) return;
  loadPixelScript();
  try {
    window.fbq("init", id);
    window.fbq("track", "PageView");
    pixelBaseInitialized = true;
  } catch (e) {
    console.warn("Error inicializando Meta Pixel", e);
  }
}

// Sólo se llama cuando el usuario dio su email desde el formulario del footer:
// agrega el email para Advanced Matching (el Pixel lo hashea internamente antes
// de enviarlo a Meta, así que se pasa en texto plano).
function addPixelAdvancedMatching(id, email) {
  if (!id || !email) return;
  loadPixelScript();
  try {
    window.fbq("init", id, { em: email });
  } catch (e) {
    console.warn("Error actualizando Advanced Matching del Pixel", e);
  }
}

// --- Envío de eventos al endpoint configurado ---
function sendTrackingEvent(name, payload = {}) {
  if (!trackingEnabled()) return;
  const data = {
    event: name,
    timestamp: new Date().toISOString(),
    url: location.href,
    userAgent: navigator.userAgent,
    language: navigator.language || null,
    platform: navigator.platform || null,
    screen: { w: screen.width, h: screen.height },
    referrer: document.referrer || null,
    ...payload,
  };

  // Enviar a endpoint configurado (si existe)
  if (TRACKING_ENDPOINT) {
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(TRACKING_ENDPOINT, JSON.stringify(data));
      } else {
        fetch(TRACKING_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("Error enviando evento", e);
    }
  } else {
    // Si no hay endpoint, solo logueamos en consola para pruebas
    console.log("Tracking event (no endpoint):", data);
  }

  // También enviar evento a Meta Pixel si está definido
  if (window.fbq) {
    try {
      const link = payload.link || "";
      // Mapear a eventos estándar de Meta para mejor optimización de campañas
      if (link.includes("wa.me") || link.includes("whatsapp")) {
        window.fbq("track", "Contact", { content_name: "WhatsApp" });
      } else if (link.includes("inscripcion")) {
        window.fbq("track", "InitiateCheckout", {
          content_name: "Curso Integral de Fotografía",
          content_ids: ["curso-integral-fotografia"],
          num_items: 1,
        });
      } else if (link.includes("cursos")) {
        window.fbq("track", "ViewContent", {
          content_name: "Cursos de Fotografía",
          content_category: "Cursos",
          content_ids: ["cursos-fotografia"],
          content_type: "product",
        });
      } else if (link.includes("instagram.com")) {
        window.fbq("track", "Contact", { content_name: "Instagram" });
      } else {
        window.fbq("trackCustom", name, { link: link || null });
      }
    } catch (e) {}
  }
}

// --- Preferencia de privacidad: modelo opt-out ---
// Por defecto el tracking está activo (para saber quién visita y qué le interesa).
// El usuario puede desactivarlo con un control discreto en el footer.
function trackingEnabled() {
  return localStorage.getItem("tdf_tracking_optout") !== "yes";
}

function setTrackingOptOut(optOut) {
  localStorage.setItem("tdf_tracking_optout", optOut ? "yes" : "no");
}

// Adjuntar tracking a enlaces: se ejecuta siempre para saber qué links generan
// interés, salvo que el usuario haya desactivado el registro de su visita.
function attachClickTracking() {
  document.querySelectorAll("[data-link]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      if (!trackingEnabled()) return;
      const link = el.getAttribute("data-link") || el.href;
      const payload = { link };
      try {
        const email = localStorage.getItem("tdf_email");
        if (email) payload.email = email;
      } catch (e) {}
      sendTrackingEvent("link_click", payload);
    });
  });
}

// Formulario opcional del footer: envía el email completo (texto plano) al
// endpoint para poder contactar al interesado, y lo agrega al Pixel para
// Advanced Matching. No bloquea nada ni es requisito para navegar.
function setupNewsletterForm() {
  const form = document.getElementById("newsletterForm");
  if (!form) return;
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const emailInput = document.getElementById("email");
    const email = emailInput && emailInput.value ? emailInput.value.trim() : null;
    if (!email) return;
    localStorage.setItem("tdf_email", email);
    if (trackingEnabled()) {
      addPixelAdvancedMatching(PIXEL_ID, email);
      sendTrackingEvent("newsletter_optin", { email });
    }
    if (emailInput) emailInput.value = "";
    alert("¡Gracias! Vas a recibir novedades por email.");
  });
}

// Control discreto para desactivar/activar el registro de la visita.
// El tracking está activo por defecto; esto es sólo una opción secundaria.
function setupTrackingToggle() {
  const btn = document.getElementById("trackingToggle");
  if (!btn) return;

  const updateLabel = () => {
    btn.textContent = trackingEnabled()
      ? "No registrar mi visita"
      : "Habilitar registro de mi visita";
  };
  updateLabel();

  btn.addEventListener("click", () => {
    setTrackingOptOut(trackingEnabled());
    updateLabel();
  });
}

// Inicialización: el tracking (Pixel + clicks) corre siempre por defecto,
// salvo que el usuario haya elegido desactivarlo previamente.
document.addEventListener("DOMContentLoaded", () => {
  if (trackingEnabled()) {
    initMetaPixel(PIXEL_ID);
    sendTrackingEvent("page_view");
    const email = localStorage.getItem("tdf_email") || null;
    if (email) addPixelAdvancedMatching(PIXEL_ID, email);
  }
  attachClickTracking();
  setupNewsletterForm();
  setupTrackingToggle();
});
