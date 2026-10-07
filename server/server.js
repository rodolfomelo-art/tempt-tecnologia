'use strict';
/**
 * Servidor do site Tempt: entrega os arquivos estáticos e integra o formulário
 * de contato com o OpenWA (https://www.open-wa.org), que envia o lead por WhatsApp.
 * Sem dependências: requer apenas Node 18+.
 *
 *   cp .env.example .env   (preencha)   →   node --env-file=.env server/server.js
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const env = process.env;
const PORT = Number(env.PORT || 3000);
const OPENWA_URL = (env.OPENWA_URL || 'http://localhost:2785').replace(/\/+$/, '');
const API_KEY = env.OPENWA_API_KEY || '';
const SESSION = env.OPENWA_SESSION_ID || '';
const NOTIFY_TO = (env.WHATSAPP_NOTIFY_TO || '').replace(/\D/g, '');   // quem recebe os leads
const PUBLIC_NUMBER = (env.WHATSAPP_PUBLIC || NOTIFY_TO).replace(/\D/g, ''); // número do botão do site
const READY = Boolean(API_KEY && SESSION && NOTIFY_TO);

const PUBLIC_FILES = /^\/(index\.html|politica-de-[a-z]+\.html|(css|js|assets)\/[\w./-]+)$/;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const SEC = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"
};

/* limite simples por IP: 5 envios a cada 10 minutos */
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > 5;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < 600000)) hits.delete(k); }, 600000).unref();

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC }); res.end(JSON.stringify(obj)); };

function readBody(req, limit = 10_000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function sendWhatsApp(text) {
  const r = await fetch(`${OPENWA_URL}/api/sessions/${encodeURIComponent(SESSION)}/messages/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({ chatId: `${NOTIFY_TO}@c.us`, text }),
    signal: AbortSignal.timeout(15000)
  });
  if (!r.ok) throw new Error(`OpenWA respondeu ${r.status}`);
}

async function contato(req, res) {
  if (!READY) return json(res, 503, { ok: false, error: 'indisponivel' });
  const ip = req.socket.remoteAddress || '';
  if (limited(ip)) return json(res, 429, { ok: false, error: 'limite' });
  let d;
  try { d = JSON.parse(await readBody(req)); } catch { return json(res, 400, { ok: false, error: 'invalido' }); }
  if (d.site) return json(res, 200, { ok: true }); // honeypot: bots preenchem, finge sucesso
  const nome = clean(d.nome, 100), email = clean(d.email, 120), empresa = clean(d.empresa, 100) || '-';
  const interesse = clean(d.interesse, 60), msg = clean(d.msg, 1500);
  if (!nome || !msg || !/^\S+@\S+\.\S+$/.test(email) || d.consent !== true) return json(res, 400, { ok: false, error: 'invalido' });
  const text = `*Novo contato pelo site*\n\n*Nome:* ${nome}\n*Empresa:* ${empresa}\n*E-mail:* ${email}\n*Interesse:* ${interesse}\n\n${msg}`;
  try { await sendWhatsApp(text); json(res, 200, { ok: true }); }
  catch (e) { console.error('[contato]', e.message); json(res, 502, { ok: false, error: 'falha' }); }
}

function serve(req, res, url) {
  let p = url.pathname === '/' ? '/index.html' : url.pathname;
  if (!PUBLIC_FILES.test(p) || p.includes('..')) { res.writeHead(404, SEC); return res.end('Não encontrado'); }
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(404, SEC); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, SEC); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', ...SEC });
    res.end(buf);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/config' && req.method === 'GET') return json(res, 200, { whatsapp: PUBLIC_NUMBER || null, form: READY });
  if (url.pathname === '/api/contato') return req.method === 'POST' ? contato(req, res) : json(res, 405, { ok: false });
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, SEC); return res.end(); }
  serve(req, res, url);
}).listen(PORT, () => {
  console.log(`Tempt: http://localhost:${PORT}`);
  console.log(READY ? `OpenWA: ${OPENWA_URL} (sessão ${SESSION})` : 'OpenWA NÃO configurado (defina OPENWA_API_KEY, OPENWA_SESSION_ID e WHATSAPP_NOTIFY_TO). O formulário usará o e-mail.');
});
