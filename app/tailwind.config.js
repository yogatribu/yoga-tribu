/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Tailwind serve solo per le regole di base (preflight). Lo stile vero è la copia del prototipo in src/app/prototipo.css.
  theme: { extend: {} },
  plugins: [],
};
