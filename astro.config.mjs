// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import robots from 'astro-robots';

const SITE_URL = 'https://michalak24.pl';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  // astro-robots domyślnie wskazuje na /sitemap-index.xml (generowany przez
  // @astrojs/sitemap, którego nie używamy) — wskazujemy naszą realną mapę.
  integrations: [react(), robots({ sitemap: [`${SITE_URL}/sitemap.xml`] })],
  trailingSlash: 'never',
  prefetchAll: true,
  output: 'static',
  adapter: vercel({
  imageService: true,
  }),
  image: {
      domains: [],
    },
  vite: {
    plugins: [tailwindcss()]
  }
});