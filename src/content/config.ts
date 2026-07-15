import { defineCollection, z } from 'astro:content';

const ritiriCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date_inizio: z.string(),
    date_fine: z.string(),
    location: z.string(),
    posti_totali: z.number(),
    posti_disponibili: z.number(),
    prezzo: z.number(),
    insegnanti: z.array(z.string()),
    foto_hero: z.string().optional(),
    foto_hero_alt: z.string().optional(),
    descrizione_breve: z.string(),
    wa_testo: z.string().optional(),
    descrizione: z.array(z.string()).optional(),
    foto_principale: z.string().optional(),
    foto_affiancata: z.string().optional(),
    testo_affiancato: z.string().optional(),
    programma: z.array(z.object({
      giorno: z.string(),
      attivita: z.array(z.object({
        ora: z.string(),
        cosa: z.string(),
      })),
    })).optional(),
    incluso: z.array(z.string()).optional(),
    escluso: z.array(z.string()).optional(),
    struttura_titolo: z.string().optional(),
    struttura_testo: z.string().optional(),
    struttura_link_url: z.string().optional(),
    struttura_link_label: z.string().optional(),
    foto_post_programma: z.array(z.string()).optional(),
    foto_post_struttura: z.string().optional(),
    foto_post_struttura_alt: z.string().optional(),
  }),
});

const workshopsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    data: z.string(),
    orario: z.string(),
    durata: z.number(),
    insegnante: z.string(),
    prezzo: z.number(),
    prezzo_iscritti: z.number().optional(),
    posti_totali: z.number(),
    posti_disponibili: z.number(),
    descrizione_breve: z.string(),
    draft: z.boolean().optional(),
  }),
});

export const collections = {
  ritiri: ritiriCollection,
  workshops: workshopsCollection,
};
