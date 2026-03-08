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

// --- Util: SHA-256 hash (hex) usado para Advanced Matching ---
async function sha256Hex(str) {
  if (!str) return null;
  try {
    const s = str.trim().toLowerCase();
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const data = new TextEncoder().encode(s);
      const hash = await window.crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch (e) {
    console.warn("No se pudo hashear el email:", e);
  }
  return null;
}

// --- Meta Pixel init (si se configura) ---
// acepta optional hashedEmail (SHA-256 hex) para Advanced Matching
function initMetaPixel(id, hashedEmail) {
  if (!id) return;
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

  try {
    if (hashedEmail) {
      // Advanced Matching: enviar email hasheado
      window.fbq("init", id, { em: hashedEmail });
    } else {
      window.fbq("init", id);
    }
    // Track a PageView inmediatamente al inicializar
    window.fbq && window.fbq("track", "PageView");
  } catch (e) {
    console.warn("Error inicializando Meta Pixel", e);
  }
}

// --- Envío de eventos al endpoint configurado ---
function sendTrackingEvent(name, payload = {}) {
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
      window.fbq("trackCustom", name, { link: payload.link || null });
    } catch (e) {}
  }
}

// --- Consentimiento: sólo trackear si el usuario dio su consentimiento explícito ---
function hasConsent() {
  return localStorage.getItem("tdf_consent") === "yes";
}

function setConsent(value, email = null) {
  localStorage.setItem("tdf_consent", value ? "yes" : "no");
  // guardamos el email hasheado (si se provee) para advanced matching
  if (email) localStorage.setItem("tdf_email_hashed", email);
}

// Adjuntar tracking a enlaces (se ejecuta cuando hay consentimiento o para logs locales)
function attachClickTracking() {
  document.querySelectorAll("[data-link]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      const link = el.getAttribute("data-link") || el.href;
      // enviar evento sólo si tenemos consentimiento, si no, guardamos localmente
      const payload = { link };
      // si tenemos email hasheado en el storage, incluirlo para matching (no enviamos email en claro)
      try {
        const hashed = localStorage.getItem("tdf_email_hashed");
        if (hashed) payload.email = hashed;
      } catch (e) {}
      if (hasConsent()) {
        // opcional: intentar obtener geolocalización (bajo permiso)
        try {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                payload.geo = {
                  lat: pos.coords.latitude,
                  lon: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                };
                sendTrackingEvent("link_click", payload);
              },
              () => {
                sendTrackingEvent("link_click", payload);
              },
              { timeout: 3000 },
            );
          } else {
            sendTrackingEvent("link_click", payload);
          }
        } catch (e) {
          sendTrackingEvent("link_click", payload);
        }
      } else {
        // sin consentimiento, solo logging local anónimo
        try {
          const stats = JSON.parse(localStorage.getItem("tdf_stats") || "{}");
          stats[link] = (stats[link] || 0) + 1;
          localStorage.setItem("tdf_stats", JSON.stringify(stats));
        } catch (e) {}
      }
    });
  });
}

// Manejo del formulario de consentimiento
function setupConsentForm() {
  const consentEl = document.getElementById("consent");
  const form = document.getElementById("consentForm");
  const skip = document.getElementById("skipTracking");
  if (!consentEl) return;

  // Si ya dio consentimiento, ocultamos banner y re-inicializamos Pixel con el email hasheado si existe
  if (hasConsent()) {
    consentEl.style.display = "none";
    (async function () {
      try {
        const hashed = localStorage.getItem("tdf_email_hashed") || null;
        initMetaPixel(PIXEL_ID, hashed);
        sendTrackingEvent("page_view", { email: hashed });
      } catch (e) {
        console.warn(e);
      }
      attachClickTracking();
    })();
    return;
  }
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const emailRaw = document.getElementById("email").value || null;
    const checked = document.getElementById("consentCheckbox").checked;
    if (!checked) {
      alert("Debes aceptar para continuar con el seguimiento.");
      return;
    }
    // calcular hash del email (si existe)
    let hashed = null;
    if (emailRaw) {
      try {
        hashed = await sha256Hex(emailRaw);
      } catch (e) {
        hashed = null;
      }
    }
    setConsent(true, hashed);
    // enviar evento de opt-in (no enviamos email en texto claro)
    sendTrackingEvent("consent_given", { email: hashed });
    initMetaPixel(PIXEL_ID, hashed);
    consentEl.style.display = "none";
    attachClickTracking();
  });

  skip.addEventListener("click", () => {
    setConsent(false);
    consentEl.style.display = "none";
    // attach click tracking but in local-only mode
    attachClickTracking();
  });
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  // No enviamos page_view hasta que el usuario acepte; si ya aceptó, el formulario se oculta y se dispara.
  setupConsentForm();
});
