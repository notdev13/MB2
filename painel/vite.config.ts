import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig, loadEnv, type Plugin } from 'vite';
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

// Política de conteúdo (CSP) no index.html do build: o painel só carrega código, estilo, fonte e
// imagem do próprio endereço e só conversa com o banco da nuvem do build (VITE_SUPABASE_URL).
// Nada de endereço fixo aqui. (frame-ancestors não funciona em <meta>: quem barra isso é o
// X-Frame-Options de public/_headers.) Guia: docs/privacidade.md
function politicaDeConteudo(urlNuvem: string | undefined): Plugin {
  let origem = '';
  try { if (urlNuvem) origem = new URL(urlNuvem).origin; } catch { /* sem nuvem: só o próprio endereço */ }
  const politica = [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:", "font-src 'self' data:", `connect-src 'self'${origem ? ' ' + origem : ''}`,
    "manifest-src 'self'", "worker-src 'self'", "base-uri 'none'", "form-action 'none'",
  ].join('; ');
  return {
    name: 'mb2-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: politica }, injectTo: 'head-prepend' },
    ],
  };
}

// base relativa: o painel funciona em qualquer endereço (raiz do domínio ou subpasta).
export default defineConfig(({ mode }) => ({
  base: './',
  build: { sourcemap: false }, // não publicar mapas do código
  plugins: [react(), serviceWorker(), politicaDeConteudo(loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL)],
}));
