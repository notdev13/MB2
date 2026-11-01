import '@fontsource/inter/latin-300.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/playfair-display/latin-400.css';
import '@fontsource/playfair-display/latin-400-italic.css';
import '@fontsource/roboto-mono/latin-400.css';
import '@fontsource/roboto-mono/latin-500.css';
import './estilo.css';
import './planta.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Porteiro } from './componentes/Porteiro';
import { useCasca } from './casca';
import { DadosProvider } from './dados/contexto';
import { AppDesktop } from './desktop/AppDesktop';

function Raiz() {
  return useCasca() === 'desktop' ? <AppDesktop /> : <App />;
}

createRoot(document.getElementById('raiz')!).render(
  <Porteiro>
    <DadosProvider>
      <Raiz />
    </DadosProvider>
  </Porteiro>,
);

// Funciona sem internet depois da primeira abertura (só no build de produção).
// (Na página única, sem manifesto, não há service worker para registrar.)
if ('serviceWorker' in navigator && import.meta.env.PROD && document.querySelector('link[rel=manifest]')) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* onde não há service worker, só não funciona offline */ });
}
// Pede ao iPhone para não apagar os dados do painel quando faltar espaço.
navigator.storage?.persist?.();
