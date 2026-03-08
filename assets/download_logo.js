// Node script para descargar el logo oficial al directorio assets/
// Uso: node assets/download_logo.js
const https = require("https");
const fs = require("fs");
const path = require("path");

const url = "https://www.tallerdefotografia.com.ar/images/logo_blanco.png";
const outDir = path.join(__dirname);
const outFile = path.join(outDir, "logo.png");

function download(url, dest, cb) {
  const file = fs.createWriteStream(dest);
  https
    .get(url, (res) => {
      if (res.statusCode !== 200) {
        return cb(
          new Error(
            "Failed to get " + url + " (status " + res.statusCode + ")",
          ),
        );
      }
      res.pipe(file);
      file.on("finish", () => file.close(cb));
    })
    .on("error", (err) => {
      fs.unlink(dest, () => {});
      cb(err);
    });
}

download(url, outFile, (err) => {
  if (err) return console.error("Error descargando logo:", err.message);
  console.log("Logo guardado en", outFile);
});
