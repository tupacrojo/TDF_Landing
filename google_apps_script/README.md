# Google Apps Script — receptor de eventos (Guide)

Este archivo contiene un script listo para usar como Web App en Google Apps Script que almacena los eventos entrantes en una Google Sheet.

Pasos rápidos

1. Crea una Google Sheet. Copia el ID (parte de la URL, entre `/d/` y `/edit`).
2. En Google Drive: Nuevo → Más → Google Apps Script.
3. Borra cualquier contenido y pega el contenido de `google_apps_script/code.gs` (o pega directamente el código del archivo `code.gs`).
4. Reemplaza `SHEET_ID` en la parte superior con el ID de tu hoja.
5. Deploy → New deployment → Tipo: Web app
   - Execute as: Me
   - Who has access: Anyone
6. Copia la URL del Web App (termina en `/exec`) y pégala en el atributo `data-tracking-endpoint` del `<body>` en `index.html`.

Notas importantes

- CORS: Google Apps Script no permite setear fácilmente cabeceras CORS desde `ContentService`. Por ello recomendamos enviar los eventos desde el navegador usando `navigator.sendBeacon` o `fetch` con `mode: 'no-cors'` (aunque con `no-cors` no podrás leer la respuesta). El `js/script.js` del proyecto ya intenta usar `navigator.sendBeacon` cuando está disponible.
- Formato de payload: el script acepta JSON en el body o parámetros form-encoded. El payload enviado por `js/script.js` incluye campos como `event`, `link`, `url`, `email`, `userAgent`, `referrer`, `language`, `screen` y `geo`.
- Límite: Apps Script y Google Sheets tienen límites de cuota (escrituras por día). Para tráfico alto considerá usar Cloudflare Workers, Vercel functions o una base de datos.

Prueba rápida (manual)

1. Desplegá el Web App y copiá la URL.
2. En `index.html` coloca la URL en `data-tracking-endpoint`.
3. Abrí la landing, aceptá el opt-in y hacé click en un link. Revisá la hoja de cálculo: debería aparecer una fila con el evento.

Si necesitás que yo haga la prueba de envío desde aquí, pegá la URL pública del Web App y haré un evento de test; luego te muestro el payload que llegó.
