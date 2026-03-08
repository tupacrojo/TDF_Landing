Coloca aquí el logo del Taller de Fotografía como `logo.png`.

Opciones:

- Manual: descargar https://www.tallerdefotografia.com.ar/images/logo_blanco.png y guardarlo como `assets/logo.png`.
- Automático (requiere Node.js): ejecutar desde la raíz del proyecto:

  node assets/download_logo.js

El `index.html` intentará mostrar `assets/logo.png` y, si no existe, usará el logo remoto como fallback.
