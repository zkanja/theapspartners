#!/usr/bin/env node
// Mail-merge for the day-1 outreach.
// Reads launch/prospects.csv, picks the sequence (A/B/C) and language (fr/en)
// per row from launch/emails.md, writes one ready-to-send .txt per prospect
// into launch/out/ with a clickable mailto: link on the first line.
//
//   node launch/mailmerge.js            # all rows
//   node launch/mailmerge.js --seq B    # only rows whose sequence is B
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const LINK = 'https://zkanja.github.io/theapspartners/diagnostic.html';
const argv = process.argv.slice(2);
const onlySeq = argv.includes('--seq') ? argv[argv.indexOf('--seq') + 1] : null;

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter(r => r.some(v => v.trim()));
  return body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

// Pull "## X — …" sections, then the **FR** / **EN** blockquotes and subjects.
function loadTemplates() {
  const md = fs.readFileSync(path.join(DIR, 'emails.md'), 'utf8');
  const out = {};
  const sections = md.split(/^## /m).slice(1);
  for (const sec of sections) {
    const key = sec[0];
    const subj = {};
    for (const m of sec.matchAll(/\*\*Objet (FR|EN) :\*\*\s*(.+)/g)) subj[m[1].toLowerCase()] = m[2].trim();
    const bodies = {};
    for (const m of sec.matchAll(/\*\*(FR|EN)\*\*\s*\n((?:>.*\n?)+)/g)) {
      // Strip the blockquote marks and markdown bold, then re-flow each
      // paragraph onto one line so mail clients wrap it themselves.
      const raw = m[2].split('\n').map(l => l.replace(/^>\s?/, '')).join('\n').replace(/\*\*/g, '').trim();
      bodies[m[1].toLowerCase()] = raw.split(/\n{2,}/).map(par => par.replace(/\s*\n\s*/g, ' ')).join('\n\n');
    }
    out[key] = { subj, bodies };
  }
  return out;
}

function fill(text, p) {
  return text
    .replace(/\{prénom\}/g, p.first_name || p.name)
    .replace(/\{société\}/g, p.company || 'your team')
    .replace(/\{contexte\}/g, p.context || (p.lang === 'fr' ? 'nos échanges' : 'we last spoke'))
    .replace(/\{lien\}/g, LINK)
    .replace(/\{ref\}/g, p.ref || '');
}

const templates = loadTemplates();
const prospects = parseCSV(fs.readFileSync(path.join(DIR, 'prospects.csv'), 'utf8'));
const outDir = path.join(DIR, 'out');
fs.mkdirSync(outDir, { recursive: true });

let n = 0;
for (const p of prospects) {
  const seq = (p.sequence || 'B').toUpperCase();
  const lang = (p.lang || 'fr').toLowerCase();
  if (onlySeq && seq !== onlySeq.toUpperCase()) continue;
  const t = templates[seq];
  if (!t || !t.bodies[lang]) { console.error(`skip ${p.name}: no template ${seq}/${lang}`); continue; }
  const subject = fill(t.subj[lang] || `The APS Partners — Maestro 48h`, p);
  const body = fill(t.bodies[lang], p);
  const mailto = `mailto:${p.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const slug = (p.name || p.email).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const file = path.join(outDir, `${String(++n).padStart(2, '0')}-${seq}-${slug}.txt`);
  fs.writeFileSync(file, `${mailto}\n\nTo: ${p.name} <${p.email}>\nSubject: ${subject}\n\n${body}\n`);
  console.log(`${path.relative(process.cwd(), file)}  ←  ${p.name} (${seq}/${lang})`);
}
console.log(`\n${n} e-mail(s) generated in ${path.relative(process.cwd(), outDir)}/ — open a file, click the first line, send.`);
