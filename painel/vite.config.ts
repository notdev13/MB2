import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Gera o service worker com a lista de todos os arquivos do build, para o painel abrir
// sem internet já depois da primeira visita. O nome do cache muda a cada build.
function serviceWorker(): Plugin {
  return {
    name: 'mb2-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const arquivos = [
        ...Object.keys(bundle),
        'manifest.webmanifest', 'icone.svg', 'icone-180.png', 'icone-192.png', 'icone-512.png',
      ].filter((f) => !f.endsWith('.html') && !f.endsWith('.map') && !f.endsWith('.woff')).sort();
      const modelo = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
      const versao = createHash('sha256').update(modelo + arquivos.join('|')).digest('hex').slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: modelo
          .replace("'mb2-painel-__VERSAO__'", `'mb2-painel-${versao}'`)
          .replace('= __ARQUIVOS__;', `= ${JSON.stringify(arquivos.map((f) => './' + f))};`),
      });
    },
  };
}

// base relativa: o painel funciona em qualquer endereço (raiz do domínio ou subpasta).
export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
});
