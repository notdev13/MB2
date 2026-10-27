import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/cormorant-garamond/600.css';
import './estilo.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { DadosProvider } from './dados/contexto';

createRoot(document.getElementById('raiz')!).render(
  <DadosProvider>
    <App />
  </DadosProvider>,
);

// Funciona sem internet depois da primeira abertura (só no build de produção).
// (Na página única, sem manifesto, não há service worker para registrar.)
if ('serviceWorker' in navigator && import.meta.env.PROD && document.querySelector('link[rel=manifest]')) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* onde não há service worker, só não funciona offline */ });
}
// Pede ao iPhone para não apagar os dados do painel quando faltar espaço.
navigator.storage?.persist?.();
