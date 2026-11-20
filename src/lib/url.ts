/**
 * Préfixe les liens internes avec le chemin de base du site.
 * En production le site est à la racine (BASE_URL = "/") : les liens sont inchangés.
 * En préversion GitHub Pages (celementa.github.io/financiale-fr) : "/contact" -> "/financiale-fr/contact".
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function url(path: string): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return path; // externe, tel:, mailto:, #ancre
  return BASE + path || '/';
}

/** Chemin courant sans le préfixe de base (pour surligner la page active). */
export function stripBase(pathname: string): string {
  return BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) || '/' : pathname;
}
