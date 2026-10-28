# MB2 · Painel de gestão de obras

Construtora MB2 (casas no Sul da Ilha, Campeche, Florianópolis). O dono lança, pelo iPhone,
os custos de cada obra e acompanha gasto x orçamento.

## Onde está o quê
- `painel/`: **arquitetura atual** (recomeço de out/2026). Web app instalável (PWA) em React +
  TypeScript + Vite. Dados no próprio aparelho (IndexedDB), com backup em arquivo.
- Duas interfaces sobre os mesmos `src/dominio/` e `src/dados/`: celular (`src/App.tsx`, `telas/`,
  `componentes/`) e computador (`src/desktop/`, ver `painel/docs/desktop.md`). `src/casca.ts` escolhe.
  Mudança pedida só para uma delas não pode alterar a outra.
- `painel/apresentacao/iphone.html`: o painel dentro de um iPhone desenhado, para apresentar.
  Regerar (`npm run pagina` + `npm run iphone`) sempre que o painel mudar.
- `painel/supabase/painel.sql`: banco na nuvem da sincronização (ver `painel/docs/nuvem.md`).
- A versão anterior (Expo + Supabase em `app/` e `supabase/`) foi removida em out/2026; está no
  histórico do Git.

## Comandos (dentro de `painel/`)
- `npm install`, `npm run dev` (abre em http://localhost:5173 e na rede local)
- `npm run check`: tipos + testes. Rodar antes de concluir qualquer tarefa.
- `npm run build`: gera `dist/` para publicar.

## Regras
- Textos da interface em português do Brasil, simples, para quem não é técnico.
- Dinheiro sempre em **centavos inteiros**; datas como `AAAA-MM-DD`.
- Regras de negócio em `src/dominio/` (funções puras, com teste). Telas não fazem conta.
- Acesso a dados só pelo contrato `src/dados/repositorio.ts` (para trocar por nuvem depois).
- Mudanças pequenas e no escopo pedido. Não expor credenciais.
- Pedir aprovação antes de apagar dados, código antigo ou mudar a branch principal.

## Entrega
Resumir arquivos alterados, testes rodados com resultado e o que ficou pendente.

## Time de agentes (`.claude/agents/`)
A sessão principal é o mestre: planeja, delega quando vale a pena, integra e confere.
`pesquisador` investiga, `desenvolvedor` implementa, `revisor` revisa sem alterar arquivos.
Acione só quando ajudar; tarefa pequena o mestre faz sozinho.
