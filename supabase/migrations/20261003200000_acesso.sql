-- MB2 Obras · controle de acesso: aprovação de contas e convites
--
-- Como funciona:
--   * Conta criada sem convite fica "pendente": entra no app, mas não vê nada
--     até a diretoria aprovar (escolhendo função e obras).
--   * A diretoria gera um convite (código de 8 letras, vale 7 dias, uso único)
--     já com nome, função e obras. Quem cria a conta com o código entra direto,
--     com essas permissões. A diretoria também pode criar a conta pela pessoa
--     (com senha provisória) usando o mesmo convite por baixo.
--   * Conta "bloqueada" perde o acesso a tudo (ex.: saiu da empresa).
--   * Contas que já existiam continuam ativas.
--
-- Pode rodar de novo sem problema.

-- ---------------------------------------------------------------------------
-- Situação da conta
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'perfis' and column_name = 'situacao') then
    -- quem já tem conta fica ativo; contas novas nascem pendentes
    alter table perfis add column situacao text not null default 'ativo'
      check (situacao in ('pendente', 'ativo', 'bloqueado'));
    alter table perfis alter column situacao set default 'pendente';
  end if;
end $$;

create or replace function conta_ativa() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and situacao = 'ativo');
$$;

-- As regras de permissão passam a exigir conta ativa.
create or replace function eh_diretoria() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and papel = 'diretoria' and situacao = 'ativo');
$$;

create or replace function eh_membro(p_obra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_diretoria() or (conta_ativa() and exists (
    select 1 from obra_membros where obra_id = p_obra and perfil_id = auth.uid()));
$$;

create or replace function pode_editar(p_obra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_diretoria() or (conta_ativa() and exists (
    select 1 from obra_membros
    where obra_id = p_obra and perfil_id = auth.uid() and papel <> 'visualizador'));
$$;

create or replace function pode_aprovar(p_obra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_diretoria() or (conta_ativa() and exists (
    select 1 from obra_membros
    where obra_id = p_obra and perfil_id = auth.uid() and papel in ('responsavel','engenheiro')));
$$;

create or replace function eh_responsavel(p_obra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_diretoria() or (conta_ativa() and exists (
    select 1 from obra_membros
    where obra_id = p_obra and perfil_id = auth.uid() and papel = 'responsavel'));
$$;

-- Ninguém muda a própria função nem se aprova.
drop policy if exists perfis_editar_proprio on perfis;
create policy perfis_editar_proprio on perfis for update
  using (id = auth.uid())
  with check (id = auth.uid()
              and papel    = (select papel    from perfis where id = auth.uid())
              and situacao = (select situacao from perfis where id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Convites
-- ---------------------------------------------------------------------------
create table if not exists convites (
  codigo      text primary key,                 -- 8 letras/números, sem traço
  nome        text not null,
  email       text,                             -- se preenchido, só esse e-mail usa
  papel       papel_empresa not null,
  obras       uuid[] not null default '{}',
  criado_por  uuid references perfis(id) on delete set null default auth.uid(),
  criado_em   timestamptz not null default now(),
  expira_em   timestamptz not null default now() + interval '7 days',
  usado_por   uuid references perfis(id) on delete set null,
  usado_em    timestamptz,
  cancelado   boolean not null default false
);

alter table convites enable row level security;
drop policy if exists convites_diretoria on convites;
create policy convites_diretoria on convites for all using (eh_diretoria()) with check (eh_diretoria());

drop trigger if exists auditoria_convites on convites;
create trigger auditoria_convites after insert or update or delete on convites
  for each row execute function registrar_auditoria();
drop trigger if exists auditoria_perfis on perfis;
create trigger auditoria_perfis after update on perfis
  for each row execute function registrar_auditoria();

-- Sem letras que confundem (I, L, O, 0, 1).
create or replace function gerar_codigo() returns text
language plpgsql volatile set search_path = public as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  b bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  r text := '';
begin
  for i in 0..7 loop
    r := r || substr(alfabeto, 1 + (get_byte(b, i) % length(alfabeto)), 1);
  end loop;
  return r;
end $$;

create or replace function normalizar_codigo(p text) returns text
language sql immutable as $$
  select upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

-- Função na empresa → papel em cada obra (diretoria já vê todas).
create or replace function papel_padrao_obra(p papel_empresa) returns papel_obra
language sql immutable as $$
  select case p when 'engenheiro' then 'engenheiro'::papel_obra
                when 'mestre'     then 'mestre'::papel_obra
                when 'visualizador' then 'visualizador'::papel_obra
                else null end;
$$;

-- Dá à pessoa a função e as obras escolhidas e ativa a conta.
create or replace function liberar_acesso(p_perfil uuid, p_papel papel_empresa, p_obras uuid[])
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  update perfis set papel = p_papel, situacao = 'ativo' where id = p_perfil;
  if papel_padrao_obra(p_papel) is not null then
    insert into obra_membros (obra_id, perfil_id, papel)
    select o.id, p_perfil, papel_padrao_obra(p_papel)
    from obras o where o.id = any(coalesce(p_obras, '{}'))
    on conflict (obra_id, perfil_id) do nothing;   -- não rebaixa quem já é responsável
  end if;
end $$;

-- Usa o convite para a conta p_perfil. Devolve false se o código não serve.
create or replace function aplicar_convite(p_codigo text, p_perfil uuid, p_email text)
returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare
  c convites%rowtype;
begin
  select * into c from convites
  where codigo = normalizar_codigo(p_codigo)
    and not cancelado and usado_por is null and expira_em > now()
  for update;
  if not found then return false; end if;
  if c.email is not null and lower(c.email) <> lower(coalesce(p_email, '')) then return false; end if;

  perform liberar_acesso(p_perfil, c.papel, c.obras);
  update perfis set nome = c.nome where id = p_perfil and (nome is null or nome = p_email);
  update convites set usado_por = p_perfil, usado_em = now() where codigo = c.codigo;
  return true;
end $$;

-- Conta nova: perfil pendente, ou já liberado se veio com código de convite.
create or replace function criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (id, nome, situacao)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), 'pendente')
  on conflict (id) do nothing;
  if new.raw_user_meta_data ? 'convite' then
    perform aplicar_convite(new.raw_user_meta_data->>'convite', new.id, new.email);
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Funções chamadas pelo app
-- ---------------------------------------------------------------------------

-- Diretoria cria um convite e recebe o código.
create or replace function criar_convite(p_nome text, p_email text, p_papel papel_empresa, p_obras uuid[])
returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_codigo text;
begin
  if not eh_diretoria() then
    raise exception 'Só a diretoria cria convites.' using errcode = '42501';
  end if;
  if trim(coalesce(p_nome, '')) = '' then
    raise exception 'Escreva o nome da pessoa.' using errcode = '22023';
  end if;
  if p_papel is null then
    raise exception 'Escolha a função da pessoa.' using errcode = '22023';
  end if;
  if p_papel <> 'diretoria' and coalesce(cardinality(p_obras), 0) = 0 then
    raise exception 'Escolha pelo menos uma obra.' using errcode = '22023';
  end if;

  loop
    v_codigo := gerar_codigo();
    exit when not exists (select 1 from convites where codigo = v_codigo);
  end loop;

  insert into convites (codigo, nome, email, papel, obras)
  values (v_codigo, trim(p_nome), nullif(lower(trim(coalesce(p_email, ''))), ''), p_papel, coalesce(p_obras, '{}'));
  return v_codigo;
end $$;

-- Tela de criar conta: mostra para quem é o convite antes de usar.
create or replace function ver_convite(p_codigo text)
returns table (nome text, email text, papel papel_empresa, obras text[], expira_em timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select c.nome, c.email, c.papel,
           array(select o.nome from obras o where o.id = any(c.obras) order by o.nome),
           c.expira_em
    from convites c
    where c.codigo = normalizar_codigo(p_codigo)
      and not c.cancelado and c.usado_por is null and c.expira_em > now();
  if not found then
    raise exception 'Código inválido, vencido ou já usado. Peça um novo à diretoria.' using errcode = 'P0002';
  end if;
end $$;

-- Quem já tem conta (pendente) usa um código.
create or replace function usar_convite(p_codigo text)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta primeiro.' using errcode = '42501';
  end if;
  if exists (select 1 from perfis where id = auth.uid() and situacao = 'bloqueado') then
    raise exception 'Sua conta está bloqueada. Fale com a diretoria.' using errcode = '42501';
  end if;
  select u.email into v_email from auth.users u where u.id = auth.uid();
  if not aplicar_convite(p_codigo, auth.uid(), v_email) then
    raise exception 'Código inválido, vencido, já usado ou feito para outro e-mail.' using errcode = 'P0002';
  end if;
end $$;

-- Diretoria: todas as contas, pendentes primeiro.
create or replace function listar_contas()
returns table (id uuid, nome text, email text, papel papel_empresa, situacao text, criado_em timestamptz, obras text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not eh_diretoria() then
    raise exception 'Só a diretoria vê as contas.' using errcode = '42501';
  end if;
  return query
    select p.id, p.nome, u.email::text, p.papel, p.situacao, p.criado_em,
           array(select o.nome from obra_membros m join obras o on o.id = m.obra_id
                 where m.perfil_id = p.id order by o.nome)
    from perfis p
    left join auth.users u on u.id = p.id
    order by array_position(array['pendente','ativo','bloqueado'], p.situacao), p.criado_em desc;
end $$;

create or replace function aprovar_conta(p_perfil uuid, p_papel papel_empresa, p_obras uuid[])
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not eh_diretoria() then
    raise exception 'Só a diretoria aprova contas.' using errcode = '42501';
  end if;
  if p_perfil = auth.uid() then
    raise exception 'Você não pode mudar a sua própria conta.' using errcode = '42501';
  end if;
  if p_papel is null then
    raise exception 'Escolha a função da pessoa.' using errcode = '22023';
  end if;
  if p_papel <> 'diretoria' and coalesce(cardinality(p_obras), 0) = 0 then
    raise exception 'Escolha pelo menos uma obra.' using errcode = '22023';
  end if;
  if not exists (select 1 from perfis where id = p_perfil) then
    raise exception 'Conta não encontrada.' using errcode = 'P0002';
  end if;
  perform liberar_acesso(p_perfil, p_papel, p_obras);
end $$;

create or replace function bloquear_conta(p_perfil uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not eh_diretoria() then
    raise exception 'Só a diretoria bloqueia contas.' using errcode = '42501';
  end if;
  if p_perfil = auth.uid() then
    raise exception 'Você não pode bloquear a sua própria conta.' using errcode = '42501';
  end if;
  update perfis set situacao = 'bloqueado' where id = p_perfil;
end $$;

-- Funções internas: ninguém chama direto.
revoke execute on function liberar_acesso(uuid, papel_empresa, uuid[]) from public, anon, authenticated;
revoke execute on function aplicar_convite(text, uuid, text)           from public, anon, authenticated;
revoke execute on function gerar_codigo()                              from public, anon, authenticated;

-- ver_convite também para quem ainda não entrou (tela de criar conta).
revoke execute on function ver_convite(text) from public;
grant  execute on function ver_convite(text) to anon, authenticated;

revoke execute on function conta_ativa()                                       from public, anon;
revoke execute on function criar_convite(text, text, papel_empresa, uuid[])    from public, anon;
revoke execute on function usar_convite(text)                                  from public, anon;
revoke execute on function listar_contas()                                     from public, anon;
revoke execute on function aprovar_conta(uuid, papel_empresa, uuid[])          from public, anon;
revoke execute on function bloquear_conta(uuid)                                from public, anon;
grant  execute on function conta_ativa()                                       to authenticated;
grant  execute on function criar_convite(text, text, papel_empresa, uuid[])    to authenticated;
grant  execute on function usar_convite(text)                                  to authenticated;
grant  execute on function listar_contas()                                     to authenticated;
grant  execute on function aprovar_conta(uuid, papel_empresa, uuid[])          to authenticated;
grant  execute on function bloquear_conta(uuid)                                to authenticated;

-- Se você ainda não é diretoria, rode uma vez trocando o e-mail:
-- update perfis set papel = 'diretoria', situacao = 'ativo'
-- where id = (select id from auth.users where email = 'seu@email.com');
