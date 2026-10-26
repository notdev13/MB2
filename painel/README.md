# Painel MB²

Painel de gestão de obras da MB2: cadastro de obras, lançamento de custos por obra e visão geral
de gasto x orçamento. Feito para o iPhone, mas abre em qualquer navegador.

## O que tem na v0.1
- **Visão geral**: gasto x orçado das obras em aberto, gasto do mês, contas a pagar, alerta de obra
  que passou do orçamento, gasto por mês (6 meses), gasto por categoria e últimos lançamentos.
- **Obras**: cadastro com endereço, cliente, orçamento, área, datas e situação; filtro por situação.
- **Obra**: gasto, saldo, a pagar, custo por m², gasto por categoria e lançamentos por mês,
  com filtros por categoria e "só a pagar".
- **Lançar custo** (botão +): valor, obra, data, categoria, descrição, fornecedor, forma de pagamento
  e se já foi pago. "Salvar e lançar outro" para lançar várias notas seguidas.
- **Ajustes**: tema escuro ou claro, backup e restauração em arquivo, exportação dos custos em planilha
  (abre no Excel), instruções de instalação.
- Funciona sem internet depois de aberto uma vez.

## Onde ficam os dados
No próprio aparelho (IndexedDB do Safari). Não há servidor nem conta. Por isso:
- **Instale na tela de início** (Safari › Compartilhar › Adicionar à Tela de Início). Assim o iOS
  não apaga os dados do painel por falta de uso.
- **Faça backup** em Ajustes de tempos em tempos e guarde o arquivo no iCloud Drive.
- Os dados do iPhone não aparecem no computador (e vice-versa). Sincronizar entre aparelhos é o
  próximo passo: a camada `src/dados/repositorio.ts` foi feita para receber um banco na nuvem.

## Importar a planilha de despesas
A planilha `PLANILHA DESPESAS OBRAS MB2.xlsx` (uma aba por obra e a aba RESUMO) vira um arquivo de
backup do painel:
```
pip install openpyxl
python3 scripts/planilha_para_backup.py "PLANILHA DESPESAS OBRAS MB2.xlsx" mb2-backup.json
```
No painel: **Ajustes › Restaurar um backup** e escolha o `mb2-backup.json`. As categorias do painel
são as mesmas da planilha. Os dados da empresa não ficam no repositório.

## Rodar no computador
Precisa do Node.js 20 ou mais novo.
```
cd painel
npm install
npm run dev
```
Abre em http://localhost:5173. No iPhone, na mesma rede Wi-Fi, use o endereço "Network" que aparece
no terminal.

## Publicar
`npm run build` gera a pasta `dist/`, que pode ir para qualquer hospedagem de site estático
(GitHub Pages, Netlify, Vercel, Cloudflare Pages). Precisa ser HTTPS para instalar no iPhone.

## Verificar
`npm run check` (tipos e testes) e `npm run build`.

## Estrutura
- `src/dominio/`: tipos, cálculos e formatação (funções puras, com testes).
- `src/dados/`: armazenamento (contrato + IndexedDB), backup e planilha.
- `src/telas/` e `src/componentes/`: interface.
- `public/`: ícones e manifesto. `sw.js`: service worker (modo sem internet), preenchido no build.
