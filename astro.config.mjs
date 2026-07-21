import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://kaitmazov.com',
  integrations: [preact()],
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
