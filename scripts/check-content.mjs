#!/usr/bin/env node
/**
 * Vérifications rapides avant publication (lancé aussi par la CI) :
 *  - toute image référencée existe dans src/assets/images/
 *  - tout lien interne pointe vers une page qui existe
 *  - tout membre d'équipe référencé existe dans src/data/team.yaml
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const ROOT = process.cwd();
const errors = [];

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'assets') yield* walk(p); }
    else if (/\.(ya?ml|md|astro)$/.test(e.name)) yield p;
  }
}

const pageFiles = await readdir(join(ROOT, 'src/content/pages'));
const blogFiles = await readdir(join(ROOT, 'src/content/blog'));
const routes = new Set(['/', '/contact', '/blog', '/mentions-legales']);
for (const f of pageFiles) {
  const { slug } = parse(await readFile(join(ROOT, 'src/content/pages', f), 'utf8'));
  routes.add(slug ? `/${slug}` : '/');
}
for (const f of blogFiles) routes.add('/blog/' + f.replace(/\.md$/, ''));

const team = parse(await readFile(join(ROOT, 'src/data/team.yaml'), 'utf8'));

for await (const file of walk(join(ROOT, 'src'))) {
  const rel = file.replace(ROOT + '/', '');
  const text = await readFile(file, 'utf8');
  for (const m of text.matchAll(/\/images\/([A-Za-z0-9_-]+\.[a-z]+)/g)) {
    if (!existsSync(join(ROOT, 'src/assets/images', m[1]))) errors.push(`${rel} : image manquante ${m[1]}`);
  }
  if (file.endsWith('.yaml')) {
    for (const m of text.matchAll(/href:\s*"?(\/[^\s",}]*)/g)) {
      const href = m[1].split('#')[0] || '/';
      if (!routes.has(href)) errors.push(`${rel} : lien interne cassé ${href}`);
    }
    const data = parse(text);
    for (const b of data?.blocks ?? []) {
      for (const id of Array.isArray(b.members) ? b.members : []) {
        if (!team[id]) errors.push(`${rel} : membre d'équipe inconnu « ${id} »`);
      }
    }
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problème(s) :\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`✓ Contenu valide (${routes.size} pages)`);
