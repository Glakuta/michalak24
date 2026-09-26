// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import robots from 'astro-robots';

// https://astro.build/config
export default defineConfig({
site: 'https://michalak24.pl',
  integrations: [react(), sitemap(), robots()],
  output: 'server',
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