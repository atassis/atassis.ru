import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Pages that pass noindex={true} to Base — must stay out of the sitemap too.
const NOINDEX = ['/note-048afc', '/verse', '/writing/amd-contract-first-e99255'];

export default defineConfig({
  site: 'https://kaitmazov.com',
  integrations: [
    preact(),
    sitemap({ filter: (page) => !NOINDEX.some((p) => new URL(page).pathname.replace(/\/$/, '') === p) }),
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      // Accept requests tunnelled through *.t.atassis.ru (tnl). Scoped to the
      // tunnel domain rather than `true` so the dev server still rejects other
      // hosts (DNS-rebinding guard stays on for everything else).
      allowedHosts: ['.t.atassis.ru'],
    },
  },
});
