// Local dev server: serves the static site and emulates POST /api/lead
// by appending to leads.local.json (production uses api/lead.js + Postgres).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 4173;
const STORE = path.join(ROOT, 'leads.local.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.json': 'application/json'
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/lead') {
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => {
      try {
        const body = JSON.parse(raw || '{}');
        if (!body.name || !body.email || !body.message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'missing fields' }));
          return;
        }
        const leads = fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, 'utf8')) : [];
        leads.push({ ...body, created_at: new Date().toISOString() });
        fs.writeFileSync(STORE, JSON.stringify(leads, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'bad request' }));
      }
    });
    return;
  }

  let file = path.normalize(path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`dev server → http://localhost:${PORT}`));
