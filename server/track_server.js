// Ejemplo simple de servidor para recibir eventos de tracking.
// Node + Express. Para pruebas locales.
// Uso:
// 1) npm init -y
// 2) npm install express body-parser
// 3) node server/track_server.js

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const DATA_DIR = path.join(__dirname, '..', 'data');
if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DATA_FILE = path.join(DATA_DIR, 'events.json');

function saveEvent(ev){
  const list = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : [];
  list.push(ev);
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

app.post('/track', (req, res)=>{
  const body = req.body || {};
  const event = {
    receivedAt: new Date().toISOString(),
    ip: req.ip,
    ...body
  };
  try{
    saveEvent(event);
    console.log('Evento recibido:', event.event || 'unknown', 'from', event.link || '-');
    res.status(200).json({ ok:true });
  }catch(e){
    console.error('Error guardando evento', e);
    res.status(500).json({ ok:false });
  }
});

const port = process.env.PORT || 3030;
app.listen(port, ()=>console.log('Track server listening on', port));
