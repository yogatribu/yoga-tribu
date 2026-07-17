import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

const pagesExcludedFromSitemap = new Set([
  '/cookie/',
  '/privacy/',
  '/termini/',
  '/links/',
  '/quiz/',
  '/corsi/donna/',
  '/corsi/donna-e-gravidanza/',
  '/corsi/flow/',
  '/corsi/teen-yoga/',
  '/corsi/vinyasa/',
  '/insegnanti/asia/',
  '/insegnanti/giulia/',
  '/insegnanti/mattia/',
  '/insegnanti/teen/',
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
    '/corsi/donna': '/corsi/salute-femminile',
    '/corsi/flow': '/corsi/vinyasa',
  },
});
