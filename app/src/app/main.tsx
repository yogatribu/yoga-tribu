import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@/app/index.css';
import '@/app/tema.css';
import '@/app/prototipo.css';
import '@/app/telefono.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
