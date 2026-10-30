# Painel MB² · sincronização na nuvem

Com a nuvem ligada, o dono lança no iPhone e vê no computador (e vice-versa). Cada aparelho
continua guardando tudo (funciona sem internet); a nuvem só troca o que mudou.

## Login obrigatório
Com a nuvem ligada no build, o painel abre **só a tela de entrar** (e-mail e senha) até haver uma
sessão guardada no aparelho. A **primeira entrada num aparelho precisa de internet**; depois o
painel abre direto, mesmo sem internet. Falha de rede, 429 e erros 5xx na renovação nunca
derrubam a sessão (só 400/401). **Ajustes › Sair** volta ao login, **sem apagar** os dados do
aparelho, e para a sincronização. Sem as variáveis (`npm run dev` sem `.env`), não há login.
Na publicação pelo GitHub, o workflow usa `VITE_EXIGIR_LOGIN=1`: se faltar `SUPABASE_URL` ou
`SUPABASE_CHAVE` (ou a URL não for `https://`), o build **falha** com uma mensagem em português e
nada é publicado; a solução é criar as duas variáveis (passo 7 abaixo) e rodar o workflow de novo.
O porteiro trava a tela; os dados na nuvem são protegidos pelo login e pelo RLS do banco.
Mais em [privacidade.md](privacidade.md).

## Como funciona
- Banco: [Supabase](https://supabase.com) (plano grátis). Uma tabela, `painel_registros`, com uma
  linha por obra, lançamento, conta ou saldo (`painel/supabase/painel.sql`).
- Acesso: e-mail e senha. Só entra quem estiver em `painel_membros`; o cadastro aberto fica desligado.
  A chave que vai no painel é a **pública** (anon/publishable): quem protege os dados são as regras
  de acesso do banco (RLS). A chave secreta (service_role) **nunca** vai para o painel nem para o Git.
- No aparelho: cada mudança entra numa fila (`pendentes` no IndexedDB). A sincronização envia a
  fila e depois busca o que chegou desde a última vez (`src/dados/sincronizacao.ts`). Roda ao abrir,
  ao voltar para o app, ao voltar a internet, a cada minuto e logo depois de cada lançamento.
- Conflito (os dois aparelhos mexeram no mesmo lançamento sem internet): vale a mudança mais
  recente. O banco confere ao gravar e o aparelho confere ao receber.
- Primeira vez que um aparelho entra: tudo o que já está nele sobe junto, nada se perde. Se o
  mesmo backup foi restaurado nos dois aparelhos, os lançamentos não se duplicam (mesmo id).

## Contas e saldos na nuvem
- Contas bancárias e saldos sincronizam como obras e custos (mesma fila, "o mais recente vence", excluir
  é marcar). Excluir uma conta leva os saldos dela; um saldo que chega antes da conta espera por ela.
- Mesma segurança: só os e-mails autorizados (`painel_membros`) leem e gravam. O chefe e o dono veem
  os mesmos saldos; não existe papel "somente leitura".
- Saldo é dado sensível: no Git, em testes e em exemplos use só valores inventados.

## Ligar (uma vez)
1. Em supabase.com, crie uma conta e um projeto novo (ex.: `mb2-painel`, região São Paulo).
   Guarde a senha do banco num lugar seguro; ela não é usada pelo painel.
2. **SQL Editor › New query**: cole **todo** o conteúdo de `painel/supabase/painel.sql` (script único) e clique
   **Run**. Pode rodar de novo quando quiser: ele serve para projeto novo e também para **atualizar um
   projeto antigo** (passa a aceitar contas e saldos), sem apagar nem duplicar nada.
3. **Authentication › Sign In / Providers**: desligue **Allow new users to sign up**
   (deixe ligado só o provedor Email).
4. **Authentication › Users › Add user › Create new user**: e-mail e senha do dono (marque
   **Auto Confirm User**). Repita para quem mais for usar.
5. Volte ao **SQL Editor** e autorize cada e-mail:
   `insert into public.painel_membros (user_id) select id from auth.users where email = 'dono@exemplo.com';`
6. **Project Settings › API** (ou **Data API / API Keys**): copie a **Project URL** e a chave
   **anon public** (ou **publishable**).
7. No GitHub, repositório MB2: **Settings › Secrets and variables › Actions › aba Variables ›
   New repository variable**: `SUPABASE_URL` = Project URL e `SUPABASE_CHAVE` = chave pública.
8. **Actions › Publicar painel › Run workflow** (ou qualquer merge na main). Depois, no iPhone e no
   computador, abra o painel e entre com e-mail e senha (com internet, na primeira vez).

## Bom saber
- O plano grátis do Supabase pausa o projeto depois de 7 dias **sem nenhum acesso**. Com o painel em
  uso isso não acontece; se pausar, é só reativar no site do Supabase (os dados ficam).
- Para testar no `npm run dev`: copie `.env.exemplo` para `.env.local` e preencha.
- Sair (Ajustes) não apaga os dados dele; ao entrar de novo, tudo é conferido.
