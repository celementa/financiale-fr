#!/usr/bin/env node
/**
 * Import ponctuel des images depuis l'ancien site Framer.
 *
 * Parcourt src/ à la recherche de références « /images/<fichier> », télécharge chaque image
 * depuis le CDN Framer (déjà réduite à 2560 px max) et l'enregistre dans src/assets/images/.
 * Les images sont ensuite versionnées dans Git : le site ne dépend plus jamais de Framer.
 * À la compilation, Astro génère des variantes AVIF/WebP redimensionnées (voir Img.astro).
 *
 * Usage :  npm run fetch-assets            (ne télécharge que les fichiers manquants)
 *          npm run fetch-assets -- --force (retélécharge tout)
 */
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'src/assets/images');
const CDN = 'https://framerusercontent.com/images/';
const MAX = 2560;
const force = process.argv.includes('--force');

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'assets') yield* walk(p); }
    else if (/\.(ya?ml|md|astro|ts)$/.test(e.name)) yield p;
  }
}

const names = new Set();
for await (const file of walk(join(ROOT, 'src'))) {
  const text = await readFile(file, 'utf8');
  for (const m of text.matchAll(/\/images\/([A-Za-z0-9_-]+\.(?:jpe?g|png|webp|svg|avif))/g)) names.add(m[1]);
}

await mkdir(OUT, { recursive: true });
let ok = 0, skipped = 0, failed = 0;
const exists = (p) => stat(p).then(() => true, () => false);

for (const name of [...names].sort()) {
  const dest = join(OUT, name);
  if (!force && (await exists(dest))) { skipped++; continue; }
  const url = extname(name) === '.svg' ? CDN + name : `${CDN}${name}?scale-down-to=${MAX}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    ok++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name} — ${err.message}`);
  }
}

console.log(`\n${names.size} images référencées · ${ok} téléchargées · ${skipped} déjà présentes · ${failed} en échec`);
if (failed) process.exit(1);
