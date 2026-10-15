// Registro dei consensi lato server (Vercel Function).
// Riceve da sendBeacon ogni scelta fatta nel banner e la conserva come prova.
//
// Cosa salva: id anonimo casuale, data, versione dell'informativa, scelte,
// user agent, lingua, pagina. NON salva l'indirizzo IP.
//
// Dove: in Redis (Upstash, collegabile da Vercel > Storage) se sono presenti
// KV_REST_API_URL e KV_REST_API_TOKEN (o UPSTASH_REDIS_REST_URL / _TOKEN).
// Senza storage collegato scrive solo nei log di Vercel, che NON bastano come
// archivio: durano poco. Vedi docs/consenso-cookie.md.

const MAX_BYTES = 4096;
const RETENTION_DAYS = Number(process.env.CONSENT_RETENTION_DAYS) || 730;
const ACTIONS = new Set(['accept_all', 'reject_all', 'reject_x', 'custom', 'grant_service']);
const ALLOWED_HOSTS = new Set([
  'yogatribu.it',
  'www.yogatribu.it',
  ...(process.env.CONSENT_ALLOWED_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean),
]);

const isStr = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;

// Restituisce la voce normalizzata oppure null. Qualsiasi campo in più viene scartato.
export function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { id, ts, policy, action, services, ua, lang, page } = body;
  if (!isStr(id, 64) || !/^[A-Za-z0-9-]+$/.test(id) || id.length < 8) return null;
  if (!isStr(ts, 40)) return null;
  const t = Date.parse(ts);
  if (Number.isNaN(t) || Math.abs(Date.now() - t) > 7 * 86400000) return null;
  if (!isStr(policy, 20) || !/^\d{4}-\d{2}-\d{2}$/.test(policy)) return null;
  if (!ACTIONS.has(action)) return null;
  if (!services || typeof services !== 'object' || Array.isArray(services)) return null;
  const keys = Object.keys(services);
  if (keys.length < 1 || keys.length > 20) return null;
  const cleanServices = {};
  for (const k of keys) {
    if (!/^[a-z0-9-]{1,32}$/.test(k) || typeof services[k] !== 'boolean') return null;
    cleanServices[k] = services[k];
  }
  if (typeof ua !== 'string' || ua.length > 300) return null;
  if (typeof lang !== 'string' || lang.length > 20) return null;
  if (typeof page !== 'string' || !page.startsWith('/') || page.length > 200) return null;
  return { id, ts: new Date(t).toISOString(), policy, action, services: cleanServices, ua, lang, page };
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    const host = new URL(origin).host;
    return ALLOWED_HOSTS.has(host) || host === req.headers.host;
  } catch {
    return false;
  }
}

async function store(entry) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const record = JSON.stringify({ ...entry, receivedAt: new Date().toISOString() });
  if (!url || !token) {
    console.log(JSON.stringify({ type: 'cookie-consent', storage: 'log-only', ...entry }));
    return;
  }
  const key = `consent:${entry.id}`;
  const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['LPUSH', key, record],
      ['EXPIRE', key, String(RETENTION_DAYS * 86400)],
    ]),
  });
  if (!res.ok) throw new Error(`storage ${res.status}`);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  if (!originAllowed(req)) return res.status(403).end();

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BYTES) return res.status(413).end();
    try { body = JSON.parse(body); } catch { return res.status(400).end(); }
  } else if (body && JSON.stringify(body).length > MAX_BYTES) {
    return res.status(413).end();
  }

  const entry = validate(body);
  if (!entry) return res.status(400).end();

  try {
    await store(entry);
  } catch (err) {
    console.error('cookie-consent: salvataggio non riuscito', err?.message);
    return res.status(500).end();
  }
  return res.status(204).end();
}
