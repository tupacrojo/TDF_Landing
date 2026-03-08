// Google Apps Script: recibir eventos POST y guardarlos en Google Sheets
// 1) Crear una Google Sheet y copiar su ID (parte de la URL)
// 2) Reemplazar SHEET_ID abajo por el ID de la Sheet
// 3) Deploy -> New deployment -> Web app -> Execute as: Me, Who has access: Anyone

const SHEET_ID = "13K0SCOzfFCe6NeJLjmPjdUqYSdyknJjnB82nfvgzL-8"; // <- poné aquí tu Sheet ID

/**
 * Maneja POSTs. Acepta JSON en el body o form-encoded. El cliente puede usar navigator.sendBeacon
 * o fetch con 'no-cors'. Apps Script accede al cuerpo en e.postData.contents.
 */
function doPost(e) {
  try {
    var payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = { raw: e.postData.contents };
      }
    } else if (e.parameter) {
      payload = e.parameter;
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);

    // Si es una inscripción (formulario), guardarla en la hoja 'inscripciones'
    var eventType = (payload.event || payload.type || payload.form || "")
      .toString()
      .toLowerCase();
    if (eventType.indexOf("inscrip") !== -1 || payload.form === "inscripcion") {
      saveInscripcion(ss, payload);
    } else {
      var sheet = ss.getSheetByName("events");
      if (!sheet) sheet = ss.insertSheet("events");

      // Añadir cabeceras si está vacío
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          "receivedAt",
          "event",
          "link",
          "url",
          "email",
          "consent",
          "userAgent",
          "referrer",
          "language",
          "screen",
          "geo",
          "rawPayload",
        ]);
      }

      var row = [
        new Date().toISOString(),
        payload.event || "",
        payload.link || "",
        payload.url || "",
        payload.email || "",
        payload.consent || "",
        payload.userAgent || "",
        payload.referrer || "",
        payload.language || "",
        payload.screen ? payload.screen.w + "x" + payload.screen.h : "",
        payload.geo ? JSON.stringify(payload.geo) : "",
        JSON.stringify(payload),
      ];

      sheet.appendRow(row);
    }

    // Responder OK. Nota: Apps Script no permite setear headers CORS desde ContentService.
    return ContentService.createTextOutput(
      JSON.stringify({ status: "ok" }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: err.message }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Opcional: doGet para depuración
 */
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "ready" }),
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Guarda una inscripción en la hoja 'inscripciones'.
 * Campos esperados en payload: name, email, phone, startDate, message, source
 */
function saveInscripcion(ss, payload) {
  var sheetName = "inscripciones";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  // Asegurar cabeceras
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "local_time",
      "iso_utc",
      "epoch_ms",
      "name",
      "email",
      "phone",
      "message",
      "source",
      "userAgent",
      "language",
      "rawPayload",
    ]);
  }

  var tz = ss.getSpreadsheetTimeZone();
  var dateObj = new Date();
  if (payload.timestamp) {
    var d = new Date(payload.timestamp);
    if (!isNaN(d.getTime())) dateObj = d;
  }

  var ts_iso = dateObj.toISOString();
  var ts_epoch = dateObj.getTime();
  var ts_local = Utilities.formatDate(dateObj, tz, "yyyy-MM-dd HH:mm:ss");

  var row = [
    ts_local,
    ts_iso,
    ts_epoch,
    payload.name || payload.fullName || payload.full_name || "",
    payload.email || "",
    payload.phone || payload.tel || "",
    payload.message || payload.comments || "",
    payload.source || payload.url || payload.referrer || "",
    payload.userAgent || "",
    payload.language || "",
    JSON.stringify(payload),
  ];

  sheet.appendRow(row);
}
