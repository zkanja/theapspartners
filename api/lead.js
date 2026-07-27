// POST /api/lead — lead intake, stored in Postgres (DATABASE_URL).
// Deployed as a Vercel serverless function; the table is created by schema.sql.
const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1
    });
  }
  return pool;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ error: 'intake not configured' });
    return;
  }

  const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  const name = String(body.name || '').trim().slice(0, 200);
  const email = String(body.email || '').trim().slice(0, 200);
  const company = String(body.company || '').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 5000);
  const intent = ['case', 'question', 'rdv'].includes(body.intent) ? body.intent : 'case';
  const honeypot = String(body.website || '').trim();

  if (honeypot) {
    // Bots fill the hidden field; pretend success, store nothing.
    res.status(200).json({ ok: true });
    return;
  }
  if (!name || !message || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'name, valid email and message are required' });
    return;
  }

  try {
    await getPool().query(
      `INSERT INTO leads (name, email, company, message, intent, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name, email, company, message, intent, String(req.headers['user-agent'] || '').slice(0, 300)]
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('lead insert failed:', err.message);
    res.status(500).json({ error: 'storage failure' });
  }
};
