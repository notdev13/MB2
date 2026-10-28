# Painel MB² · sincronização na nuvem

Com a nuvem ligada, o dono lança no iPhone e vê no computador (e vice-versa). Cada aparelho
continua guardando tudo (funciona sem internet); a nuvem só troca o que mudou.

## Como funciona
- Banco: [Supabase](https://supabase.com) (plano grátis). Uma tabela, `painel_registros`, com uma
  linha por obra ou lançamento (`painel/supabase/painel.sql`).
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

## Ligar (uma vez)
1. Em supabase.com, crie uma conta e um projeto novo (ex.: `mb2-painel`, região São Paulo).
   Guarde a senha do banco num lugar seguro; ela não é usada pelo painel.
2. **SQL Editor › New query**: cole o conteúdo de `painel/supabase/painel.sql` e clique **Run**.
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
   computador: **Ajustes › Sincronizar aparelhos › Entrar**.

## Bom saber
- O plano grátis do Supabase pausa o projeto depois de 7 dias **sem nenhum acesso**. Com o painel em
  uso isso não acontece; se pausar, é só reativar no site do Supabase (os dados ficam).
- Para testar no `npm run dev`: copie `.env.exemplo` para `.env.local` e preencha.
- Desconectar um aparelho (Ajustes) não apaga os dados dele; ao entrar de novo, tudo é conferido.
