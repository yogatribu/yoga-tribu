import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

const pagesExcludedFromSitemap = new Set([
  '/cookie/',
  '/privacy/',
  '/termini/',
  '/links/',
  '/quiz/',
  '/corsi/flow/',
  '/corsi/teen-yoga/',
  '/corsi/vinyasa/',
  '/insegnanti/asia/',
  '/insegnanti/giulia/',
  '/insegnanti/mattia/',
]);

export default defineConfig({
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) => !pagesExcludedFromSitemap.has(new URL(page).pathname),
    }),
  ],
  site: 'https://yogatribu.it',
  redirects: {
    '/quiz': '/trova-la-tua-pratica',
    '/corsi/flow': '/corsi/vinyasa',
  },
});
