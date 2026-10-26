import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/playfair-display/400.css';
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
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js');
}
// Pede ao iPhone para não apagar os dados do painel quando faltar espaço.
navigator.storage?.persist?.();
