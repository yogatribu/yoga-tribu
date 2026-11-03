// Porta nell'app i template dei volantini, le foto del sito e il logo bianco.
// La fonte resta volantini/template (usata anche dagli script di Andrea): questo file la copia e la ripulisce
// come fa il prototipo (togli i commenti, percorsi dei file locali diventano percorsi del sito).
// Da lanciare dopo aver cambiato un template o aggiunto foto al sito: npm run sync-contenuti
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sito = path.resolve(app, '..');

const dirTemplate = path.join(sito, 'volantini/template');
const template = {};
for (const f of fs.readdirSync(dirTemplate).sort()) {
  if (!/^(post-|storia-|a4-avviso|carosello-recap).*\.html$|^(a4-avviso|carosello-recap)\.html$/.test(f)) continue;
  const html = fs.readFileSync(path.join(dirTemplate, f), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replaceAll('file:///Users/andrea/yoga-tribu/{{FOTO}}', '{{FOTO}}')
    .replaceAll('file:///Users/andrea/yoga-tribu/public/', '/');
  template[f.replace('.html', '')] = html;
}

// Foto del sito: stessa cartella public/images, copiata nell'app così l'esportazione in PNG non incontra blocchi tra siti diversi.
const foto = [];
const copia = (da, a, url) => {
  fs.mkdirSync(a, { recursive: true });
  for (const f of fs.readdirSync(da, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name))) {
    if (f.name.startsWith('.') || f.name === 'og-default.jpg') continue;
    if (f.isDirectory()) copia(path.join(da, f.name), path.join(a, f.name), `${url}/${f.name}`);
    else if (/\.(jpe?g|webp|png)$/i.test(f.name)) {
      fs.copyFileSync(path.join(da, f.name), path.join(a, f.name));
      foto.push(`${url}/${f.name}`);
    }
  }
};
copia(path.join(sito, 'public/images'), path.join(app, 'public/images'), '/images');
fs.copyFileSync(path.join(sito, 'public/logo/logo-completo-bianco.svg'), path.join(app, 'public/logo/logo-completo-bianco.svg'));

const intestazione = '// Generato da scripts/sync-contenuti.mjs: non si modifica a mano. Per aggiornarlo: npm run sync-contenuti\n';
fs.writeFileSync(path.join(app, 'src/config/volantini-template.generated.ts'), `${intestazione}export const TEMPLATE: Record<string, string> = ${JSON.stringify(template, null, 1)};\n`);
fs.writeFileSync(path.join(app, 'src/config/volantini-foto.generated.ts'), `${intestazione}export const FOTO: string[] = ${JSON.stringify(foto, null, 1)};\n`);
console.log(`${Object.keys(template).length} template, ${foto.length} foto`);
