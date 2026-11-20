// @ts-check
import { defineConfig } from 'astro/config';

// Site 100 % statique : aucun service tiers n'est appelé au chargement d'une page
// (polices, images et scripts sont servis depuis le serveur UE de Financiale).
export default defineConfig({
  site: 'https://www.financiale.fr',
  trailingSlash: 'never',
  build: {
    // /sport -> dist/sport.html (nginx : try_files $uri $uri.html)
    format: 'file',
    inlineStylesheets: 'auto',
  },
  image: {
    // Formats et tailles générés à la compilation par sharp (voir src/components/Img.astro)
    responsiveStyles: true,
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});
