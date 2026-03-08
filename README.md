# Landing Linktree — Taller de Fotografía

Mini landing estática estilo Linktree para redirigir a contactos de Taller de Fotografía. Incluye captura básica de eventos de clicks y página para luego usar con Meta (Pixel) o un endpoint propio.

Archivos añadidos:

- `index.html` — landing principal.
- `css/styles.css` — estilos.
- `js/script.js` — captura de eventos y envío a Pixel/endpoint.

Pasos rápidos

1. Reemplazar logo (opcional): descarga el logo en `assets/logo.png` y cambia la `src` en `index.html` por `assets/logo.png`.
2. Configurar Pixel/endpoint: en `js/script.js` setear `PIXEL_ID` y/o `TRACKING_ENDPOINT`.
   - `PIXEL_ID`: ID del Meta Pixel para que los eventos se envíen a Facebook/Meta.
   - `TRACKING_ENDPOINT`: URL que reciba POSTs JSON con los eventos (recomendado para guardar en DB o reenviar a Conversions API).
3. Probar localmente: abrir `index.html` en navegador.

Servidor local de ejemplo (guardar eventos)

Para pruebas locales puedes levantar el servidor que viene en `server/track_server.js`:

1. En la raíz del proyecto inicializa npm y instala dependencias:

```bash
npm init -y
npm install express body-parser
```

2. Ejecuta el servidor de tracking:

```bash
node server/track_server.js
```

Por defecto el script del frontend (`js/script.js`) apunta a `http://localhost:3030/track` como `TRACKING_ENDPOINT`.

Descargar logo automáticamente

Si querés descargar el logo al directorio `assets/` ejecuta:

```bash
node assets/download_logo.js
```

Consentimiento y privacidad

Antes de registrar datos personales, pedí consentimiento explícito. El banner en la landing solicita opt-in y un email opcional. Si el usuario no acepta, los eventos no se envían al servidor (solo se guardan conteos anónimos localmente).

Despliegue en GitHub Pages (sitio estático)

GitHub Pages sirve solo contenido estático (HTML/CSS/JS). Las partes de servidor (por ejemplo `server/track_server.js`) no se ejecutarán en Pages. Para publicar esta landing en GitHub Pages:

1. Crea un repositorio en GitHub y empuja el contenido del proyecto.

2. Desde la configuración del repositorio (Settings → Pages), elige la rama (`main`) y la carpeta (`/root` o `/docs`) para publicar. GitHub generará la URL `https://<usuario>.github.io/<repo>`.

3. Asegurate de que `index.html`, `css/styles.css`, `js/script.js` y `assets/` están en la raíz del repo o en la carpeta que elegiste publicar.

4. Por defecto `js/script.js` viene con `TRACKING_ENDPOINT = ""` para no intentar enviar eventos a un backend local cuando se publica en Pages. Si querés enviar eventos desde un sitio hospedado en GitHub Pages deberás usar una de las opciones abajo.

Configurar un webhook sin servidor (opciones sin gestionar un servidor propio)

Opción A — Zapier Webhooks (recomendado si querés flujo visual y enviar a Google Sheets/CRM):

1. En Zapier crea un nuevo Zap y elige el trigger "Webhooks by Zapier" → "Catch Hook".
2. Copia la URL que te da Zapier (algo como `https://hooks.zapier.com/hooks/catch/123456/abcdef`).
3. Edita `index.html` en GitHub (o localmente) y pega esa URL en el atributo `data-tracking-endpoint` del `<body>`:

```html
<body data-tracking-endpoint="https://hooks.zapier.com/hooks/catch/123456/abcdef">
```

4. En Zapier configura acciones: guardar en Google Sheets, enviar a Mailchimp, o almacenar en un CRM. Zapier recibirá POSTs JSON con el payload que genera `js/script.js`.

Opción B — Formspree (para capturar emails / opt-ins rápidamente):

1. Crear una cuenta en Formspree y crear un formulario; te dará un endpoint del tipo `https://formspree.io/f/abcd1234`.
2. Poner esa URL en `data-tracking-endpoint` o usarla como `action` para un formulario HTML si solo querés capturar emails.

Opción C — Google Apps Script (gratuito, sin terceros pagos):

1. Crear un nuevo Apps Script y publicar como Web App (Configurá `Who has access` a "Anyone, even anonymous" si querés una URL pública que acepte POSTs).
2. El script puede recibir JSON y escribir en Google Sheets.
3. Pegar la URL del Web App en `data-tracking-endpoint`.

Notas sobre seguridad y límites
- Zapier / Formspree / Google Apps Script son servicios externos que procesarán los datos; revisá sus políticas de privacidad.
- Si recibís muchos eventos, Zapier puede volverse costoso; para volúmenes altos considera una función serverless (Netlify/Vercel) o un backend propio.

Cómo configurar el `data-tracking-endpoint` en GitHub (sin clonar):

1. Ve al archivo `index.html` en el repo en GitHub.
2. Haz clic en el lápiz (edit) y pega la URL del webhook en el atributo `data-tracking-endpoint` del `<body>`.
3. Commit changes — GitHub Pages publicará automáticamente (si ya lo tenías activado).

Alternativas para recibir/guardar eventos cuando usás GitHub Pages

- Usar un servicio externo (sin servidor propio):
  - Zapier / Make (Integromat): pueden recibir webhooks desde JavaScript (fetch) y guardarlos en Google Sheets, CRM o enviar a otras APIs.
  - Google Apps Script WebApp: crear un endpoint que reciba POSTs y guarde en una hoja de Google Sheets.

- Usar funciones serverless (recomendado para Conversions API y almacenamiento):
  - Netlify Functions / Vercel Serverless / AWS Lambda: implementás una función que reciba los eventos y reenvíe a Meta Conversions API o guarde en DB. El frontend (GitHub Pages) puede llamar a esa función pública.

- Usar un host estático con funciones integradas:
  - Desplegar en Netlify o Vercel en lugar de GitHub Pages: permiten funciones serverless en el mismo proyecto (ideal si querés usar `server/track_server.js` como referencia para convertirlo a una función).

Recomendación práctica según lo que quieras lograr:
- Solo analítica básica / Pixel: podés publicar en GitHub Pages y usar Meta Pixel o Google Analytics (frontend) sin servidor.
- Guardar eventos y usar Conversions API (mejor para audiencias en Meta): desplegar una función serverless en Netlify/Vercel o usar un endpoint externo y configurar `TRACKING_ENDPOINT` con la URL pública.

Ejemplo rápido: cómo empujar a GitHub y activar Pages (desde tu máquina, reemplazá `<url-repo>`):

```cmd
git init
git add .
git commit -m "Initial landing"
git branch -M main
git remote add origin <url-repo>
git push -u origin main
```

Después andá a Settings → Pages en GitHub y activá la publicación.

Si querés, convierto `server/track_server.js` en una función serverless para Netlify o Vercel y te dejo el endpoint listo para pegar en `js/script.js`.

Sugerencias de despliegue

- GitHub Pages: crear repo, subir y activar Pages sobre la rama `main`.
- Netlify/Vercel: arrastrar carpeta o conectar el repo y desplegar como sitio estático.

Privacidad y consentimiento

Si vas a recolectar datos personales (por ejemplo emails o identificar IPs), asegurate de cumplir la legislación vigente (GDPR/Argentina) y pedir consentimiento. El código actual solo registra clicks y datos técnicos (userAgent, referrer, timestamp).

Cómo recibir los eventos server-side

Ejemplo de payload enviado (JSON):

{
  "event":"link_click",
  "timestamp":"2026-03-07T...",
  "url":"https://...",
  "userAgent":"...",
  "referrer":"...",
  "link":"https://wa.me/..."
}

Puedes guardar ese JSON en una DB y luego usar la API de Conversions de Meta para enviar eventos server-to-server o crear Audiencias personalizadas para publicidad.

Cambios recomendados a futuro

- Añadir formulario opt-in (email) antes de guardar el usuario.
- Implementar un pequeño backend (Netlify Functions / Vercel Serverless / Firebase) para almacenar eventos.
- Añadir Google Analytics / Consent Banner si corresponde.
