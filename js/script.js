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
    // Detección de bloqueo (ad-blockers / tracking protection suelen bloquear
    // este dominio). Si falla la carga, el Pixel Helper nunca detectará nada.
    t.onload = function () {
      console.info("[Meta Pixel] fbevents.js cargado correctamente.");
    };
    t.onerror = function () {
      console.warn(
        "[Meta Pixel] No se pudo cargar fbevents.js (probablemente bloqueado por un ad-blocker o protección de rastreo del navegador). El Pixel Helper no detectará eventos mientras esto ocurra.",
      );
    };
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
// Si la página ya tiene el código base del Pixel inline en el <head> (como
// index.html, cursos/index.html e inscripcion/index.html), window.fbq ya existe
// y no volvemos a inicializar ni a disparar un PageView duplicado.
let pixelBaseInitialized = false;
function initMetaPixel(id) {
  if (!id || pixelBaseInitialized) return;
  if (window.fbq) {
    pixelBaseInitialized = true;
    console.info(
      "[Meta Pixel] Ya inicializado por el código base inline de la página.",
    );
    return;
  }
  loadPixelScript();
  try {
    window.fbq("init", id);
    window.fbq("track", "PageView");
    pixelBaseInitialized = true;
    console.info("[Meta Pixel] init + PageView disparados para ID", id);
  } catch (e) {
    console.warn("Error inicializando Meta Pixel", e);
  }
}

// Sólo se llama cuando el usuario dio su email desde el formulario del footer:
// agrega el email para Advanced Matching (el Pixel lo hashea internamente antes
// de enviarlo a Meta, así que se pasa en texto plano). El email es SIEMPRE
// opcional: si no existe, el resto del tracking (clicks, page views, eventos
// estándar) sigue funcionando exactamente igual, sin bloquearse por nada.
function addPixelAdvancedMatching(id, email) {
  if (!id || !email) return;
  loadPixelScript();
  try {
    window.fbq("init", id, { em: email });
  } catch (e) {
    console.warn("Error actualizando Advanced Matching del Pixel", e);
  }
}

// --- Identificador anónimo persistente (no requiere email ni ningún dato
// personal) para mejorar el "Advanced Matching" del Pixel y así maximizar la
// cantidad de información que Meta puede usar para armar audiencias, incluso
// cuando el visitante nunca completó su email. Se genera una sola vez por
// navegador y se reutiliza en todas las visitas siguientes.
function getOrCreateClientId() {
  try {
    let id = localStorage.getItem("tdf_client_id");
    if (!id) {
      id =
        (crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : "tdf-" + Date.now() + "-" + Math.random().toString(36).slice(2));
      localStorage.setItem("tdf_client_id", id);
    }
    return id;
  } catch (e) {
    return null;
  }
}

// --- Parámetros de campaña (UTM) y click-ids (fbclid/gclid) de la URL actual.
// Se capturan siempre (con o sin email) y se guardan en localStorage para
// poder asociarlos a eventos posteriores (por ejemplo si el usuario navega a
// otra página del sitio sin esos parámetros en la URL). Son claves para poder
// segmentar campañas de Meta Ads según el origen del click.
function getCampaignParams() {
  const params = {};
  try {
    const url = new URL(location.href);
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ].forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) params[key] = value;
    });
    if (Object.keys(params).length) {
      localStorage.setItem("tdf_campaign_params", JSON.stringify(params));
      return params;
    }
    const stored = localStorage.getItem("tdf_campaign_params");
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

// Lee las cookies _fbp/_fbc que el propio Pixel de Meta crea en el navegador.
// Enviarlas junto con cada evento a nuestro endpoint permite, en el futuro,
// reforzar el matching vía Conversions API (server-side) sin depender del email.
function getFbCookies() {
  try {
    const get = (name) => {
      const match = document.cookie.match(
        new RegExp("(?:^|; )" + name + "=([^;]*)"),
      );
      return match ? decodeURIComponent(match[1]) : null;
    };
    return { fbp: get("_fbp"), fbc: get("_fbc") };
  } catch (e) {
    return { fbp: null, fbc: null };
  }
}

// --- Envío de eventos al endpoint configurado ---
// IMPORTANTE: este envío NUNCA depende de que el usuario haya cargado su
// email. El email es un dato opcional que, si existe, se agrega para mejorar
// el matching, pero cualquier evento (page_view, link_click, click, etc.) se
// registra siempre que el tracking esté habilitado (opt-out).
function sendTrackingEvent(name, payload = {}) {
  if (!trackingEnabled()) return;
  const campaign = getCampaignParams();
  const fbCookies = getFbCookies();
  const data = {
    event: name,
    timestamp: new Date().toISOString(),
    url: location.href,
    userAgent: navigator.userAgent,
    language: navigator.language || null,
    platform: navigator.platform || null,
    screen: { w: screen.width, h: screen.height },
    referrer: document.referrer || null,
    clientId: getOrCreateClientId(),
    ...fbCookies,
    ...campaign,
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

  // También enviar evento a Meta Pixel si está definido. Esto ocurre SIEMPRE
  // que el Pixel esté cargado, sin importar si el usuario cargó su email:
  // el email solo suma para Advanced Matching, nunca es requisito.
  if (window.fbq) {
    try {
      const link = payload.link || "";
      const extra = { ...campaign, client_id: data.clientId };
      // Cada link dispara: 1) un evento estándar de Meta (mejor optimización de
      // campañas) y 2) un evento personalizado único por link (para poder
      // diferenciar en Events Manager / Ads Manager qué le interesó a cada
      // visitante, ya que varios links comparten el mismo evento estándar).
      if (link.includes("wa.me") || link.includes("whatsapp")) {
        window.fbq("track", "Contact", { content_name: "WhatsApp", ...extra });
        window.fbq("trackCustom", "ClickWhatsApp", { link, ...extra });
      } else if (link.includes("inscripcion")) {
        window.fbq("track", "InitiateCheckout", {
          content_name: "Curso Integral de Fotografía",
          content_ids: ["curso-integral-fotografia"],
          num_items: 1,
          ...extra,
        });
        window.fbq("trackCustom", "ClickInscripcion", { link, ...extra });
      } else if (link.includes("cursos")) {
        window.fbq("track", "ViewContent", {
          content_name: "Cursos de Fotografía",
          content_category: "Cursos",
          content_ids: ["cursos-fotografia"],
          content_type: "product",
          ...extra,
        });
        window.fbq("trackCustom", "ClickCursos", { link, ...extra });
      } else if (link.includes("instagram.com")) {
        window.fbq("track", "Contact", { content_name: "Instagram", ...extra });
        window.fbq("trackCustom", "ClickInstagram", { link, ...extra });
      } else {
        window.fbq("trackCustom", name, { link: link || null, ...extra });
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
// El email NUNCA es requisito: si existe en localStorage se agrega al
// payload como dato extra, pero el evento se envía siempre, con o sin email.
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

// Tracking genérico: registra CADA click en elementos interactivos de la
// página (links, botones, inputs de envío, elementos con role="button" o con
// data-track), no solo los que ya tienen `data-link`. Sirve para entender el
// comportamiento completo de navegación y armar audiencias de segmentación en
// Meta Ads a partir de eventos personalizados del Pixel.
function attachGlobalClickTracking() {
  document.addEventListener(
    "click",
    (ev) => {
      if (!trackingEnabled()) return;

      const el = ev.target.closest(
        "a, button, input[type=submit], input[type=button], [role='button'], [data-track]",
      );
      if (!el) return;
      // El click en elementos [data-link] ya se registra en attachClickTracking()
      // con su propio mapeo a eventos estándar de Meta; evitamos duplicarlo.
      if (el.hasAttribute("data-link")) return;

      const label =
        el.getAttribute("data-track") ||
        el.getAttribute("aria-label") ||
        (el.textContent || "").trim().slice(0, 80) ||
        el.id ||
        el.tagName.toLowerCase();

      const payload = {
        link: el.getAttribute("href") || null,
        label,
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        page: location.pathname,
      };

      // sendTrackingEvent ya reenvía este evento al Meta Pixel (trackCustom)
      // con datos enriquecidos (UTMs, external_id, cookies _fbp/_fbc), sin
      // requerir email: se registra siempre que el tracking esté habilitado.
      sendTrackingEvent("click", payload);
    },
    true,
  );
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
    const email =
      emailInput && emailInput.value ? emailInput.value.trim() : null;
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
// salvo que el usuario haya elegido desactivarlo previamente. El email es
// completamente opcional: si el visitante nunca lo carga, igual se registran
// todos sus clicks y se maximiza la información enviada al Pixel usando un
// identificador anónimo (external_id) + cookies _fbp/_fbc + parámetros UTM.
document.addEventListener("DOMContentLoaded", () => {
  // Capturar UTMs/click-ids ni bien carga la página, aunque el tracking
  // esté deshabilitado no hace daño (no se usan si no hay consentimiento).
  getCampaignParams();

  if (trackingEnabled()) {
    initMetaPixel(PIXEL_ID);
    // Advanced Matching con identificador anónimo persistente: no requiere
    // email ni ningún dato personal, mejora el matching desde la primera visita.
    if (window.fbq) {
      try {
        window.fbq("init", PIXEL_ID, { external_id: getOrCreateClientId() });
      } catch (e) {}
    }
    sendTrackingEvent("page_view");
    const email = localStorage.getItem("tdf_email") || null;
    if (email) addPixelAdvancedMatching(PIXEL_ID, email);
  }
  attachClickTracking();
  attachGlobalClickTracking();
  setupNewsletterForm();
  setupTrackingToggle();
});
