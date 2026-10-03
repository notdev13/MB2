-- MB2 Obras · estrutura inicial do banco (Supabase / Postgres)
-- Segurança: RLS ligado em todas as tabelas. Cada pessoa só enxerga as obras
-- em que é membro; a diretoria (papel 'diretoria' no perfil) enxerga todas.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type papel_empresa as enum ('diretoria', 'engenheiro', 'mestre', 'visualizador');
create type papel_obra    as enum ('responsavel', 'engenheiro', 'mestre', 'visualizador');
create type status_etapa  as enum ('nao_iniciada', 'em_andamento', 'concluida');
create type clima         as enum ('sol', 'nublado', 'chuva');
create type status_pedido as enum ('solicitado', 'aprovado', 'recusado', 'entregue');
create type gravidade     as enum ('baixa', 'media', 'alta');

-- ---------------------------------------------------------------------------
-- Pessoas
-- ---------------------------------------------------------------------------
create table perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  telefone    text,
  papel       papel_empresa not null default 'visualizador',
  criado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Obras e acesso
-- ---------------------------------------------------------------------------
create table obras (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  endereco         text,
  cidade           text,
  inicio_previsto  date,
  entrega_prevista date,
  orcamento_total  numeric(14,2),
  arquivada        boolean not null default false,
  criado_por       uuid references perfis(id),
  criado_em        timestamptz not null default now()
);

create table obra_membros (
  obra_id    uuid not null references obras(id) on delete cascade,
  perfil_id  uuid not null references perfis(id) on delete cascade,
  papel      papel_obra not null,
  primary key (obra_id, perfil_id)
);

-- ---------------------------------------------------------------------------
-- Cronograma
-- ---------------------------------------------------------------------------
create table etapas (
  id               uuid primary key default gen_random_uuid(),
  obra_id          uuid not null references obras(id) on delete cascade,
  nome             text not null,
  ordem            int not null default 0,
  inicio_previsto  date,
  fim_previsto     date,
  inicio_real      date,
  fim_real         date,
  percentual       numeric(5,2) not null default 0 check (percentual between 0 and 100),
  status           status_etapa not null default 'nao_iniciada'
);

-- ---------------------------------------------------------------------------
-- Diário de obra
-- ---------------------------------------------------------------------------
create table diarios (
  id          uuid primary key default gen_random_uuid(),
  obra_id     uuid not null references obras(id) on delete cascade,
  data        date not null default current_date,
  clima       clima,
  atividades  text,
  autor_id    uuid not null references perfis(id) default auth.uid(),
  criado_em   timestamptz not null default now(),
  unique (obra_id, data)
);

create table diario_efetivo (
  id         uuid primary key default gen_random_uuid(),
  diario_id  uuid not null references diarios(id) on delete cascade,
  funcao     text not null,           -- ex.: Pedreiros, Serventes
  quantidade int  not null check (quantidade >= 0)
);

create table fotos (
  id            uuid primary key default gen_random_uuid(),
  obra_id       uuid not null references obras(id) on delete cascade,
  diario_id     uuid references diarios(id) on delete set null,
  caminho       text not null,        -- caminho no bucket privado 'fotos-obra'
  legenda       text,
  autor_id      uuid not null references perfis(id) default auth.uid(),
  tirada_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Materiais, ocorrências, custos
-- ---------------------------------------------------------------------------
create table pedidos_material (
  id            uuid primary key default gen_random_uuid(),
  obra_id       uuid not null references obras(id) on delete cascade,
  material      text not null,
  quantidade    numeric(12,2) not null,
  unidade       text not null,        -- sacos, m³, un...
  fornecedor    text,
  entrega_em    timestamptz,
  status        status_pedido not null default 'solicitado',
  solicitante_id uuid not null references perfis(id) default auth.uid(),
  aprovador_id  uuid references perfis(id),
  criado_em     timestamptz not null default now()
);

create table ocorrencias (
  id          uuid primary key default gen_random_uuid(),
  obra_id     uuid not null references obras(id) on delete cascade,
  titulo      text not null,
  descricao   text,
  gravidade   gravidade not null default 'media',
  resolvida   boolean not null default false,
  autor_id    uuid not null references perfis(id) default auth.uid(),
  criado_em   timestamptz not null default now()
);

create table lancamentos (
  id          uuid primary key default gen_random_uuid(),
  obra_id     uuid not null references obras(id) on delete cascade,
  etapa_id    uuid references etapas(id) on delete set null,
  descricao   text not null,
  valor       numeric(14,2) not null,
  data        date not null default current_date,
  autor_id    uuid not null references perfis(id) default auth.uid(),
  criado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Registro de alterações (quem mudou o quê)
-- ---------------------------------------------------------------------------
create table auditoria (
  id         bigint generated always as identity primary key,
  tabela     text not null,
  operacao   text not null,
  registro   jsonb,
  anterior   jsonb,
  autor_id   uuid default auth.uid(),
  feito_em   timestamptz not null default now()
);

create or replace function registrar_auditoria() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into auditoria (tabela, operacao, registro, anterior)
  values (tg_table_name, tg_op,
          case when tg_op = 'DELETE' then null else to_jsonb(new) end,
          case when tg_op = 'INSERT' then null else to_jsonb(old) end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['obras','obra_membros','etapas','diarios','diario_efetivo',
                           'fotos','pedidos_material','ocorrencias','lancamentos']
  loop
    execute format('create trigger auditoria_%1$s after insert or update or delete on %1$I
                    for each row execute function registrar_auditoria()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Funções de permissão (security definer evita recursão nas policies)
-- ---------------------------------------------------------------------------
create or replace function eh_diretoria() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and papel = 'diretoria');
$$;

create or replace function eh_membro(p_obra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_diretoria() or exists (
    select 1 from obra_membros where obra_id = p_obra and perfil_id = auth.uid());
$$;

-- pode editar = diretoria, responsável, engenheiro ou mestre (não visualizador)
create or replace function pode_editar(p_obra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_diretoria() or exists (
    select 1 from obra_membros
    where obra_id = p_obra and perfil_id = auth.uid() and papel <> 'visualizador');
$$;

-- pode aprovar = diretoria, responsável ou engenheiro
create or replace function pode_aprovar(p_obra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_diretoria() or exists (
    select 1 from obra_membros
    where obra_id = p_obra and perfil_id = auth.uid() and papel in ('responsavel','engenheiro'));
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table perfis            enable row level security;
alter table obras             enable row level security;
alter table obra_membros      enable row level security;
alter table etapas            enable row level security;
alter table diarios           enable row level security;
alter table diario_efetivo    enable row level security;
alter table fotos             enable row level security;
alter table pedidos_material  enable row level security;
alter table ocorrencias       enable row level security;
alter table lancamentos       enable row level security;
alter table auditoria         enable row level security;

-- Perfis: cada um vê e edita o próprio (sem trocar o papel); diretoria vê e gerencia todos
create policy perfis_ler on perfis for select using (id = auth.uid() or eh_diretoria());
create policy perfis_editar_proprio on perfis for update
  using (id = auth.uid())
  with check (id = auth.uid() and papel = (select papel from perfis where id = auth.uid()));
create policy perfis_diretoria on perfis for all using (eh_diretoria()) with check (eh_diretoria());

-- Obras
create policy obras_ler on obras for select using (eh_membro(id));
create policy obras_diretoria on obras for all using (eh_diretoria()) with check (eh_diretoria());

-- Membros: quem é da obra vê a equipe; só diretoria muda
create policy membros_ler on obra_membros for select using (eh_membro(obra_id));
create policy membros_diretoria on obra_membros for all using (eh_diretoria()) with check (eh_diretoria());

-- Etapas: ler membro, editar quem aprova
create policy etapas_ler on etapas for select using (eh_membro(obra_id));
create policy etapas_editar on etapas for all using (pode_aprovar(obra_id)) with check (pode_aprovar(obra_id));

-- Diário, fotos, ocorrências: ler membro, criar/editar quem não é visualizador
create policy diarios_ler on diarios for select using (eh_membro(obra_id));
create policy diarios_criar on diarios for insert with check (pode_editar(obra_id) and autor_id = auth.uid());
create policy diarios_editar on diarios for update using (pode_editar(obra_id)) with check (pode_editar(obra_id));

create policy efetivo_ler on diario_efetivo for select
  using (exists (select 1 from diarios d where d.id = diario_id and eh_membro(d.obra_id)));
create policy efetivo_editar on diario_efetivo for all
  using (exists (select 1 from diarios d where d.id = diario_id and pode_editar(d.obra_id)))
  with check (exists (select 1 from diarios d where d.id = diario_id and pode_editar(d.obra_id)));

create policy fotos_ler on fotos for select using (eh_membro(obra_id));
create policy fotos_criar on fotos for insert with check (pode_editar(obra_id) and autor_id = auth.uid());

create policy ocorrencias_ler on ocorrencias for select using (eh_membro(obra_id));
create policy ocorrencias_criar on ocorrencias for insert with check (pode_editar(obra_id) and autor_id = auth.uid());
create policy ocorrencias_editar on ocorrencias for update using (pode_editar(obra_id)) with check (pode_editar(obra_id));

-- Pedidos: qualquer editor pede; só quem aprova muda status
create policy pedidos_ler on pedidos_material for select using (eh_membro(obra_id));
create policy pedidos_criar on pedidos_material for insert
  with check (pode_editar(obra_id) and solicitante_id = auth.uid() and status = 'solicitado');
create policy pedidos_aprovar on pedidos_material for update
  using (pode_aprovar(obra_id)) with check (pode_aprovar(obra_id));

-- Custos: só quem aprova vê e lança (mestre não vê valores)
create policy lancamentos_ler on lancamentos for select using (pode_aprovar(obra_id));
create policy lancamentos_editar on lancamentos for all using (pode_aprovar(obra_id)) with check (pode_aprovar(obra_id));

-- Auditoria: só diretoria lê; ninguém edita pelo app
create policy auditoria_ler on auditoria for select using (eh_diretoria());

-- ---------------------------------------------------------------------------
-- Armazenamento de fotos: bucket privado, pasta = id da obra
-- (o app abre as fotos com links assinados que expiram)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('fotos-obra', 'fotos-obra', false)
on conflict (id) do nothing;

create policy fotos_bucket_ler on storage.objects for select
  using (bucket_id = 'fotos-obra' and eh_membro(((storage.foldername(name))[1])::uuid));
create policy fotos_bucket_enviar on storage.objects for insert
  with check (bucket_id = 'fotos-obra' and pode_editar(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------------
-- Novo usuário ganha perfil 'visualizador' (a diretoria promove depois)
-- ---------------------------------------------------------------------------
create or replace function criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (id, nome) values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email));
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function criar_perfil();

-- Índices para as consultas mais comuns
create index on obra_membros (perfil_id);
create index on etapas (obra_id, ordem);
create index on diarios (obra_id, data desc);
create index on fotos (obra_id, tirada_em desc);
create index on pedidos_material (obra_id, status);
create index on ocorrencias (obra_id, resolvida);
create index on lancamentos (obra_id, data desc);
