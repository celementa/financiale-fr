import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

export const load = <T>(file: string): T =>
  parse(readFileSync(join(process.cwd(), 'src/data', file), 'utf8')) as T;

export interface Link { label: string; href: string }
export interface Member { name: string; role: string; specialty: string; photo: string }

export const site = load<any>('site.yaml');
export const team = load<Record<string, Member>>('team.yaml');

/** Résout une liste d'identifiants de l'équipe, avec titres éventuellement remplacés par la page. */
export function members(ids: string[], roles: Record<string, string> = {}) {
  return ids.map((id) => {
    const m = team[id];
    if (!m) throw new Error(`Membre d'équipe inconnu : "${id}" (voir src/data/team.yaml)`);
    return { id, ...m, role: roles[id] ?? m.role };
  });
}

/** Découpe un titre multi-lignes (\n) en lignes pour <br>. */
export const lines = (s = '') => s.split('\n');
