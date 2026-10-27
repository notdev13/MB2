// Página de apresentação: o painel (versão celular) rodando dentro de um iPhone 16 Pro Max desenhado,
// com botão de tela cheia em tamanho real. No celular, a página mostra só o app.
// Fica guardada para mostrar o painel a quem não tem o app; regerar sempre que o painel mudar.
//
// Uso:  npm run pagina -- painel.html [backup.json]
//       node scripts/apresentacao_iphone.mjs painel.html saida.html
import { readFileSync, writeFileSync } from 'node:fs';

const [pagina, saida] = process.argv.slice(2);
if (!pagina || !saida) {
  console.error('Uso: node scripts/apresentacao_iphone.mjs painel.html saida.html');
  process.exit(1);
}

const molde = readFileSync(new URL('../apresentacao/iphone.html', import.meta.url), 'utf8');
const app = readFileSync(pagina).toString('base64');
writeFileSync(saida, molde.replace('__APP_B64__', app));
console.log(`Apresentação gerada: ${saida} (${Math.round(readFileSync(saida).length / 1024)} KB)`);
