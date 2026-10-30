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

## Versão para computador
Em tela larga com mouse (a partir de 1024 px), o painel abre a versão desktop: menu lateral, visão geral
com 12 meses de gasto, tabela de obras, ficha da obra com maiores fornecedores, e a tela
**Lançamentos** com busca, filtros (obra, categoria, período, pago/a pagar), ordenação e total.
Atalhos: `N` lança um custo, `/` busca. Os dados e as regras são os mesmos do celular; a versão de
celular não muda. Arquitetura e design system em [docs/desktop.md](docs/desktop.md).

## Lançar falando
Em **Lançar custo**, toque no microfone e fale, por exemplo: "paguei 5.800 pro Adriano no Lote 39
dia 24, no pix". O painel preenche valor, obra, data, categoria, descrição, fornecedor e pagamento
(`src/dominio/voz.ts`, roda no aparelho, sem internet) e a pessoa confere antes de salvar. Também
dá para escrever a frase ou usar o microfone do teclado do iPhone. Ele aprende com o que já foi
lançado: nomes da mão de obra viram "MÃO DE OBRA – NOME", descrições e fornecedores já usados são
reaproveitados. Com os 280 lançamentos da planilha, acertou valor e obra em todos e a categoria em
97% (teste deixando cada lançamento de fora). Se já existir um lançamento com o mesmo valor na
mesma obra até 7 dias antes ou depois, o formulário avisa (mas deixa salvar).

## Onde ficam os dados
No próprio aparelho (IndexedDB do Safari), e funciona sem internet. Com a nuvem ligada
(Supabase, ver [docs/nuvem.md](docs/nuvem.md)), quem entra no painel
vê os mesmos dados no iPhone e no computador: cada mudança fica numa fila no aparelho e sobe
quando houver internet; em conflito vale a mudança mais recente. Sem a nuvem ligada, cada
aparelho guarda só os seus dados, como antes.
- **Instale na tela de início** (Safari › Compartilhar › Adicionar à Tela de Início). Assim o iOS
  não apaga os dados do painel por falta de uso.
- **Faça backup** em Ajustes de tempos em tempos e guarde o arquivo no iCloud Drive.

## Login e privacidade
Quando o build tem a nuvem configurada, o painel abre **só a tela de entrar** (e-mail e senha) até
haver uma sessão no aparelho. A primeira entrada precisa de internet; depois abre direto, até sem
internet. **Ajustes › Sair** volta ao login e **não apaga** os dados do aparelho. Sem nuvem
configurada, abre direto. O painel pede aos buscadores para não aparecer (noindex) e não envia o
endereço de origem a outros sites. O porteiro trava a tela; a proteção dos dados na nuvem é o
login e o RLS do banco, e os dados no aparelho dependem do bloqueio do celular. Detalhes e
checklist do dono em [docs/privacidade.md](docs/privacidade.md).

## Importar a planilha de despesas
A planilha `PLANILHA DESPESAS OBRAS MB2.xlsx` (uma aba por obra e a aba RESUMO) vira um arquivo de
backup do painel:
```
pip install openpyxl
python3 scripts/planilha_para_backup.py "PLANILHA DESPESAS OBRAS MB2.xlsx" mb2-backup.json
```
No painel: **Ajustes › Restaurar um backup** e escolha o `mb2-backup.json`. As categorias do painel
são as mesmas da planilha. Os dados da empresa não ficam no repositório.

## Versão para visualizar num link
`npm run pagina -- painel.html [backup.json]` gera uma página HTML única (CSS, JS e fontes
embutidos). Com um backup, os dados entram na primeira abertura, só se ainda não houver obras.
Nessa página não há modo sem internet.

## Apresentação no iPhone
`apresentacao/iphone.html` é uma página que mostra o painel (versão celular) dentro de um
iPhone 16 Pro Max desenhado, com botão de tela cheia em tamanho real; aberta no celular, mostra só o app.
Fica guardada para apresentar o painel e deve ser regerada sempre que o painel mudar:
```
npm run pagina -- painel.html backup.json
npm run iphone -- painel.html iphone.html
```

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
A cada mudança na `main`, o workflow `.github/workflows/site.yml` testa, gera o painel e publica no
GitHub Pages do repositório (o endereço aparece em Settings › Pages; o site institucional fica na raiz do domínio).
Uma vez só, no GitHub: Settings › Pages › Source = "GitHub Actions".
`npm run build` gera a mesma pasta `dist/`, que serve em qualquer hospedagem estática com HTTPS.

## Verificar
`npm run check` (tipos e testes) e `npm run build`.

## Estrutura
- `src/dominio/`: tipos, cálculos e formatação (funções puras, com testes).
- `src/dados/`: armazenamento (contrato + IndexedDB), backup e planilha.
- `src/telas/` e `src/componentes/`: interface do celular.
- `src/desktop/`: interface do computador (casca, telas, componentes e `desktop.css`).
- `src/componentes/Porteiro.tsx` e `src/dados/porteiro.ts`: tela de entrar e a regra que decide (antes das cascas).
- `src/casca.ts`: escolhe celular ou desktop pelo tamanho da tela.
- `apresentacao/`: página do iPhone para apresentar o painel.
- `public/`: ícones e manifesto. `sw.js`: service worker (modo sem internet), preenchido no build.
