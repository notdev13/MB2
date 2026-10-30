import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { exigirLogin, validarConfigNuvem } from './src/dados/validarConfig.ts';

// Leitor de print (OCR): ~8 MB que só baixam na primeira vez que alguém usa "Ler do print". Fora da
// lista, o celular não baixa isso à toa ao instalar o painel.
const ARQUIVOS_PESADOS = /tesseract|traineddata|^ocr\/|^assets\/worker\.min/;

// Idioma do leitor de print (OCR) num endereço fixo, ocr/eng.traineddata.gz: o tesseract.js monta o
// endereço sozinho (langPath + nome), então o arquivo não pode ter hash no nome.
const ARQUIVO_IDIOMA = createRequire(import.meta.url).resolve('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz');
function idiomaDoOcr(): Plugin {
  return {
    name: 'mb2-ocr-idioma',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'ocr/eng.traineddata.gz', source: readFileSync(ARQUIVO_IDIOMA) });
    },
    configureServer(servidor) {
      servidor.middlewares.use((req, res, next) => {
        if (!req.url?.split('?')[0].endsWith('/ocr/eng.traineddata.gz')) return next();
        res.setHeader('Content-Type', 'application/gzip');
        res.end(readFileSync(ARQUIVO_IDIOMA));
      });
    },
  };
}

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
      ].filter((f) => !f.endsWith('.html') && !f.endsWith('.map') && !f.endsWith('.woff') && !ARQUIVOS_PESADOS.test(f)).sort();
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
    "default-src 'self'", "script-src 'self' 'wasm-unsafe-eval'", "style-src 'self' 'unsafe-inline'",
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
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // Na publicação (VITE_EXIGIR_LOGIN=1), sem URL e chave válidas o painel sairia SEM login: o build falha.
  const exigir = exigirLogin(process.env.VITE_EXIGIR_LOGIN ?? env.VITE_EXIGIR_LOGIN);
  if (command === 'build' && exigir) {
    const problemas = validarConfigNuvem(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_CHAVE);
    if (problemas.length) {
      throw new Error(
        'Publicação cancelada: o painel sairia SEM tela de login.\n- ' + problemas.join('\n- ') +
        '\nComo resolver: no GitHub, Settings > Secrets and variables > Actions > Variables, ' +
        'crie SUPABASE_URL e SUPABASE_CHAVE (guia: painel/docs/nuvem.md) e rode o workflow de novo.',
      );
    }
  }
  return {
    base: './',
    build: { sourcemap: false }, // não publicar mapas do código
    plugins: [react(), idiomaDoOcr(), serviceWorker(), politicaDeConteudo(env.VITE_SUPABASE_URL)],
  };
});
