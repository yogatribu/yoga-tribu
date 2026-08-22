import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

const pagesExcludedFromSitemap = new Set([
  '/cookie/',
  '/privacy/',
  '/termini/',
  '/links/',
  '/quiz/',
  '/pratiche/flow/',
  '/pratiche/teen-yoga/',
  '/pratiche/vinyasa/',
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
    '/pratiche/flow': '/pratiche/vinyasa',
    '/corsi': '/pratiche',
    '/corsi/flow': '/pratiche/vinyasa',
    '/corsi/iyengar': '/pratiche/iyengar',
    '/corsi/ashtanga': '/pratiche/ashtanga',
    '/corsi/vinyasa': '/pratiche/vinyasa',
    '/corsi/teen-yoga': '/pratiche/teen-yoga',
    '/corsi/salute-femminile': '/pratiche/salute-femminile',
  },
});
