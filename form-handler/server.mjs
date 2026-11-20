/**
 * Service de formulaire de contact — auto-hébergé sur le serveur UE de Financiale.
 *
 * Remplace le service de formulaire de Framer (hébergé hors UE). Reçoit POST /api/contact,
 * valide les champs, filtre les robots (champ piège + limite de débit) et envoie la demande
 * par e-mail via le serveur SMTP configuré. Aucune donnée n'est stockée sur disque ni journalisée.
 *
 * Variables d'environnement : voir form-handler/.env.example
 */
import { createServer } from 'node:http';
import nodemailer from 'nodemailer';

const {
  PORT = '3000',
  SMTP_HOST, SMTP_PORT = '587', SMTP_USER, SMTP_PASS, SMTP_SECURE = 'false',
  MAIL_FROM = 'Site Financiale <no-reply@financiale.fr>',
  MAIL_TO = 'contact@financiale.fr',
  ALLOWED_ORIGIN = 'https://www.financiale.fr',
} = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === 'true',
  auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

const FIELDS = {
  nom: { label: 'Nom', required: true, max: 100 },
  prenom: { label: 'Prénom', required: true, max: 100 },
  email: { label: 'E-mail', required: true, max: 200, email: true },
  telephone: { label: 'Téléphone', required: true, max: 40 },
  ville: { label: 'Ville', max: 100 },
  profil: { label: 'Profil', required: true, max: 100 },
  enjeu: { label: 'Enjeu', required: true, max: 100 },
  horizon: { label: 'Horizon de décision', max: 100 },
  message: { label: 'Message', required: true, max: 4000 },
};

// Limite : 5 envois / 10 min par adresse IP (en mémoire uniquement)
const hits = new Map();
const limited = (ip) => {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
};
setInterval(() => hits.clear(), 60 * 60_000).unref();

const readBody = (req) => new Promise((resolve, reject) => {
  let size = 0; const chunks = [];
  req.on('data', (c) => { size += c.length; if (size > 32_000) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

function reply(req, res, status, body) {
  const wantsJson = (req.headers.accept ?? '').includes('application/json');
  if (wantsJson) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(body));
  }
  // Sans JavaScript : retour sur la page contact
  res.writeHead(303, { Location: status < 300 ? '/contact?envoye=1#contenu' : '/contact?erreur=1#contenu' });
  res.end();
}

createServer(async (req, res) => {
  if (req.url === '/health') { res.writeHead(200); return res.end('ok'); }
  if (req.method !== 'POST' || !req.url?.startsWith('/api/contact')) { res.writeHead(404); return res.end(); }

  const origin = req.headers.origin;
  if (origin && origin !== ALLOWED_ORIGIN) return reply(req, res, 403, { ok: false });

  const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.socket.remoteAddress ?? '').trim();
  if (limited(ip)) return reply(req, res, 429, { ok: false, error: 'rate_limited' });

  let data;
  try { data = Object.fromEntries(new URLSearchParams(await readBody(req))); }
  catch { return reply(req, res, 413, { ok: false }); }

  // Champ piège rempli => robot : on répond « OK » sans rien envoyer
  if (data.website) return reply(req, res, 200, { ok: true });

  const clean = {};
  for (const [key, rule] of Object.entries(FIELDS)) {
    const v = String(data[key] ?? '').trim().slice(0, rule.max);
    if (rule.required && !v) return reply(req, res, 422, { ok: false, error: `missing_${key}` });
    if (rule.email && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return reply(req, res, 422, { ok: false, error: 'invalid_email' });
    clean[key] = v;
  }

  const text = Object.entries(FIELDS).map(([k, r]) => `${r.label} : ${clean[k] || '—'}`).join('\n');
  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: MAIL_TO,
      replyTo: clean.email,
      subject: `Demande de diagnostic — ${clean.prenom} ${clean.nom} (${clean.enjeu})`,
      text: `Nouvelle demande depuis le formulaire de contact du site.\n\n${text}\n`,
    });
    return reply(req, res, 200, { ok: true });
  } catch (err) {
    console.error('Échec d’envoi SMTP :', err.code ?? err.message); // aucune donnée personnelle journalisée
    return reply(req, res, 502, { ok: false, error: 'mail_failed' });
  }
}).listen(Number(PORT), () => console.log(`form-handler à l’écoute sur :${PORT}`));
