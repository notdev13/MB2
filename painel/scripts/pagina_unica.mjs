// Junta o build (dist/) numa página HTML única, com CSS, JS e fontes embutidos, para visualizar
// o painel num link (ex.: Artifact do Claude) sem servidor. Opcionalmente embute um backup como
// dados iniciais (entram só se o aparelho ainda não tiver obras).
//
// Uso:  npm run build && node scripts/pagina_unica.mjs saida.html [backup.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const [saida, semente] = process.argv.slice(2);
if (!saida) {
  console.error('Uso: node scripts/pagina_unica.mjs saida.html [backup.json]');
  process.exit(1);
}

const dist = new URL('../dist/', import.meta.url).pathname;
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const jsArq = html.match(/<script type="module"[^>]*src="\.\/([^"]+)"/)[1];
const cssArq = html.match(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"/)[1];

// Fontes: só woff2 (todo navegador atual lê), cada uma vira data URI; as entradas woff saem do src.
let css = readFileSync(join(dist, cssArq), 'utf8');
css = css.replace(/,\s*url\(([^)]+\.woff)\)\s*format\(["']woff["']\)/g, '');
css = css.replace(/url\(([^)]+\.woff2)\)/g, (_, rel) => {
  const arquivo = join(dirname(join(dist, cssArq)), rel.replace(/^["']|["']$/g, ''));
  return `url(data:font/woff2;base64,${readFileSync(arquivo).toString('base64')})`;
});

// Pedaços que a entrada importa direto (ex.: o runtime do empacotador) entram como data URI,
// porque a página única não tem servidor para buscar outros arquivos.
const embutir = (arquivo) => readFileSync(join(dist, dirname(jsArq), arquivo), 'utf8')
  .replace(/from\s*"\.\/([^"]+\.js)"/g, (_, dep) => `from"data:text/javascript;base64,${Buffer.from(embutir(dep)).toString('base64')}"`);
const js = embutir(basename(jsArq)).replace(/<\/script/gi, '<\\/script');
const dados = semente
  ? `<script>window.__MB2_SEMENTE__ = ${readFileSync(semente, 'utf8').replace(/</g, '\\u003c')};</script>\n`
  : '';

writeFileSync(
  saida,
  `<!doctype html>
<html lang="pt-BR">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">
<meta name="referrer" content="no-referrer">
<title>Painel MB²</title>
<meta name="theme-color" content="#0f1011">
<style>${css}</style>
<div id="raiz"></div>
${dados}<script type="module">${js}</script>
`,
);
console.log(`Página gerada: ${saida} (${Math.round(readFileSync(saida).length / 1024)} KB)`);
