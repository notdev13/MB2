-- Banco na nuvem do Painel MB² (Supabase). Rodar uma vez no SQL Editor do projeto.
-- Cada obra ou lançamento é uma linha; o aparelho guarda tudo localmente e troca só o que mudou.
-- Guia: painel/docs/nuvem.md

create table if not exists public.painel_registros (
  tipo text not null check (tipo in ('obra', 'custo', 'conta')),
  id text not null,
  dados jsonb,                                  -- a obra ou o custo, como o painel guarda
  excluido boolean not null default false,      -- apagado em algum aparelho
  alterado_em timestamptz not null,             -- quando o aparelho fez a mudança
  servidor_em timestamptz not null default clock_timestamp(), -- quando chegou aqui
  primary key (tipo, id)
);

-- Quem criou a tabela antes das contas: libera o tipo 'conta' (não faz mal rodar de novo).
alter table public.painel_registros drop constraint if exists painel_registros_tipo_check;
alter table public.painel_registros add constraint painel_registros_tipo_check check (tipo in ('obra', 'custo', 'conta'));

create index if not exists painel_registros_servidor_em on public.painel_registros (servidor_em);

-- Quem pode ver e lançar: só os e-mails cadastrados aqui (o cadastro aberto fica desligado).
create table if not exists public.painel_membros (
  user_id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- Vale a mudança mais recente: um aparelho que ficou sem internet não desfaz o que outro fez depois.
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

-- Depois de criar o usuário em Authentication > Users, autorize o e-mail:
-- insert into public.painel_membros (user_id) select id from auth.users where email = 'dono@exemplo.com';
