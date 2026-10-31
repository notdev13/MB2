-- ============================================================================
-- Painel MB² · banco na nuvem (Supabase) · SCRIPT ÚNICO
-- Cole TUDO no SQL Editor do projeto e clique em Run. Pode rodar mais de uma vez
-- (não apaga nem duplica nada) e serve tanto para um projeto novo quanto para um
-- que já tenha a versão antiga da tabela.
-- Este script NÃO cria usuários e NÃO contém senha, chave nem dado de ninguém.
-- ============================================================================

-- 1) Tabela dos registros. Cada obra, custo, conta ou saldo é uma linha.
create table if not exists public.painel_registros (
  tipo text not null,
  id text not null,
  dados jsonb,                                  -- o registro, como o painel guarda
  excluido boolean not null default false,      -- apagado em algum aparelho
  alterado_em timestamptz not null,             -- quando o aparelho fez a mudança
  servidor_em timestamptz not null default clock_timestamp(), -- quando chegou aqui
  primary key (tipo, id)
);

-- 1b) Tipos aceitos. Projeto antigo só aceitava obra e custo: aqui passa a aceitar
--     também conta e saldo (contas bancárias e saldos digitados). Não mexe nos dados.
alter table public.painel_registros drop constraint if exists painel_registros_tipo_check;
alter table public.painel_registros
  add constraint painel_registros_tipo_check check (tipo in ('obra', 'custo', 'conta', 'saldo'));

create index if not exists painel_registros_servidor_em on public.painel_registros (servidor_em);

-- 2) Quem pode ver e lançar: só os e-mails cadastrados em painel_membros
--    (o cadastro aberto de usuários fica desligado no Supabase).
create table if not exists public.painel_membros (
  user_id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- 3) Vale a mudança mais recente: um aparelho que ficou sem internet
--    não desfaz o que outro fez depois.
create or replace function public.painel_registros_ao_gravar() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.alterado_em < old.alterado_em then
    return null;
  end if;
  new.servidor_em := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists painel_registros_ao_gravar on public.painel_registros;
create trigger painel_registros_ao_gravar
  before insert or update on public.painel_registros
  for each row execute function public.painel_registros_ao_gravar();

create or replace function public.painel_e_membro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.painel_membros where user_id = auth.uid());
$$;

-- 4) Segurança: ninguém sem login enxerga nada; quem tem login só entra se for membro.
alter table public.painel_registros enable row level security;
alter table public.painel_membros enable row level security;

drop policy if exists painel_registros_membros on public.painel_registros;
create policy painel_registros_membros on public.painel_registros
  for all to authenticated
  using (public.painel_e_membro())
  with check (public.painel_e_membro());

drop policy if exists painel_membros_proprio on public.painel_membros;
create policy painel_membros_proprio on public.painel_membros
  for select to authenticated
  using (user_id = auth.uid());

revoke all on public.painel_registros from anon;
revoke all on public.painel_membros from anon;
grant select, insert, update on public.painel_registros to authenticated;
grant select on public.painel_membros to authenticated;

-- 5) Leitor da planilha do Google (somente leitura). A planilha espelho entra com um usuário
--    próprio, que só enxerga os registros: não consegue lançar, alterar nem apagar nada.
create table if not exists public.painel_leitores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

create or replace function public.painel_e_leitor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.painel_leitores where user_id = auth.uid());
$$;

alter table public.painel_leitores enable row level security;

drop policy if exists painel_registros_leitores on public.painel_registros;
create policy painel_registros_leitores on public.painel_registros
  for select to authenticated
  using (public.painel_e_leitor());

drop policy if exists painel_leitores_proprio on public.painel_leitores;
create policy painel_leitores_proprio on public.painel_leitores
  for select to authenticated
  using (user_id = auth.uid());

revoke all on public.painel_leitores from anon;
grant select on public.painel_leitores to authenticated;

-- ============================================================================
-- DEPOIS de rodar o script acima: crie cada usuário em Authentication > Users
-- (Add user > Create new user, marcando "Auto Confirm User") e autorize o e-mail
-- rodando UMA linha por pessoa (troque o e-mail):
--
--   insert into public.painel_membros (user_id)
--   select id from auth.users where email = 'email-da-pessoa@exemplo.com'
--   on conflict (user_id) do nothing;
--
-- Para o usuário da planilha do Google (só leitura), crie-o do mesmo jeito e rode:
--
--   insert into public.painel_leitores (user_id)
--   select id from auth.users where email = 'planilha@exemplo.com'
--   on conflict (user_id) do nothing;
--
-- Para conferir quem está autorizado (mostra só e-mails):
--   select u.email from public.painel_membros m join auth.users u on u.id = m.user_id;
-- ============================================================================
