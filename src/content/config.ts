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
    // Opzionali: gli approfondimenti domenicali non hanno posti contingentati
    // né un prezzo/insegnante fissi come i workshop tematici.
    luogo: z.string().optional(),
    insegnante: z.string().optional(),
    prezzo: z.number().optional(),
    prezzo_iscritti: z.number().optional(),
    posti_totali: z.number().optional(),
    posti_disponibili: z.number().optional(),
    descrizione_breve: z.string(),
    // Scaletta dell'incontro. Se assente, il blocco "Programma" non viene mostrato.
    programma: z.array(z.object({
      durata: z.string(),
      cosa: z.string(),
    })).optional(),
    programma_intro: z.string().optional(),
    nota: z.string().optional(),
    draft: z.boolean().optional(),
  }),
});

// Seminari intensivi con insegnanti ospiti, su più giorni.
const seminariCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    ospite: z.string(),
    data_inizio: z.string(),
    data_fine: z.string().optional(),
    giorni: z.array(z.object({
      giorno: z.string(),
      orario: z.string(),
    })).optional(),
    luogo: z.string().optional(),
    // `prezzo` è la quota intera; `prezzi` elenca le formule parziali.
    prezzo: z.number().optional(),
    prezzi: z.array(z.object({
      label: z.string(),
      prezzo: z.number(),
    })).optional(),
    telefono: z.string().optional(),
    descrizione_breve: z.string(),
    // Pagina di dettaglio
    foto_hero: z.string().optional(),
    foto_secondaria: z.string().optional(),
    occhiello: z.string().optional(),
    titolo_sezione: z.string().optional(),
    descrizione: z.array(z.string()).optional(),
    bio_ospite: z.array(z.string()).optional(),
    per_chi: z.array(z.string()).optional(),
    portare: z.array(z.string()).optional(),
    nota: z.string().optional(),
    draft: z.boolean().optional(),
  }),
});

// Incontri non di pratica: cene, conferenze, serate.
const incontriCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tipo: z.string(),
    data: z.string(),
    orario: z.string().optional(),
    luogo: z.string().optional(),
    con: z.string().optional(),
    prezzo: z.number().optional(),
    prenotazione_obbligatoria: z.boolean().optional(),
    telefono: z.string().optional(),
    descrizione_breve: z.string(),
    pagina_dettaglio: z.boolean().optional(),
    draft: z.boolean().optional(),
  }),
});

export const collections = {
  ritiri: ritiriCollection,
  workshops: workshopsCollection,
  seminari: seminariCollection,
  incontri: incontriCollection,
};
