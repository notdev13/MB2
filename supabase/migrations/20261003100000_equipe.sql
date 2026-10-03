-- MB2 Obras · equipe da obra pelo app
-- Permite que quem aprova na obra (diretoria, responsável ou engenheiro —
-- a mesma regra de pode_aprovar) inclua e tire pessoas da equipe sem SQL.
--
-- Regras:
--   * listar: qualquer membro da obra (ou diretoria) vê nome, e-mail e papel.
--   * adicionar / remover: só quem pode_aprovar(obra).
--   * só diretoria ou responsável podem dar o papel 'responsavel' ou mexer em
--     quem já é responsável (o engenheiro não passa por cima do responsável).
--   * ninguém muda o próprio papel nem tira a si mesmo da equipe.
--   * estas funções nunca mexem em perfis.papel (papel da empresa): ninguém se
--     promove a diretoria por aqui.
--   * a pessoa precisa já ter conta no app (o e-mail precisa existir).
--
-- Pode rodar de novo sem problema (create or replace).

create or replace function listar_equipe(p_obra uuid)
returns table (perfil_id uuid, nome text, email text, papel papel_obra)
language plpgsql stable security definer set search_path = public as $$
begin
  if not eh_membro(p_obra) then
    raise exception 'Você não faz parte desta obra.' using errcode = '42501';
  end if;

  return query
    select m.perfil_id, p.nome, u.email::text, m.papel
    from obra_membros m
    join perfis p on p.id = m.perfil_id
    left join auth.users u on u.id = m.perfil_id
    where m.obra_id = p_obra
    order by array_position(array['responsavel','engenheiro','mestre','visualizador']::papel_obra[], m.papel),
             p.nome;
end $$;

-- true se quem chama é diretoria ou responsável nesta obra
create or replace function eh_responsavel(p_obra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_diretoria() or exists (
    select 1 from obra_membros
    where obra_id = p_obra and perfil_id = auth.uid() and papel = 'responsavel');
$$;

create or replace function adicionar_membro(p_obra uuid, p_email text, p_papel papel_obra)
returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_id    uuid;
  v_nome  text;
  v_atual papel_obra;
begin
  if auth.uid() is null or not pode_aprovar(p_obra) then
    raise exception 'Só engenheiro, responsável ou diretoria podem mudar a equipe.' using errcode = '42501';
  end if;
  if p_papel is null then
    raise exception 'Escolha o papel da pessoa na obra.' using errcode = '22023';
  end if;

  select u.id into v_id
  from auth.users u
  where lower(u.email) = lower(trim(coalesce(p_email, '')))
  limit 1;

  if v_id is null then
    raise exception 'Nenhuma conta com o e-mail %. A pessoa precisa primeiro criar a conta no app MB2 Obras (tela de entrar → Criar conta) e depois você adiciona aqui.',
      trim(coalesce(p_email, '')) using errcode = 'P0002';
  end if;

  if v_id = auth.uid() then
    raise exception 'Você não pode mudar o seu próprio papel na obra.' using errcode = '42501';
  end if;

  select m.papel into v_atual from obra_membros m where m.obra_id = p_obra and m.perfil_id = v_id;

  if (p_papel = 'responsavel' or v_atual = 'responsavel') and not eh_responsavel(p_obra) then
    raise exception 'Só o responsável da obra ou a diretoria podem definir ou mudar o responsável.' using errcode = '42501';
  end if;

  -- garante o perfil (contas criadas antes do gatilho podem não ter)
  insert into perfis (id, nome)
  select u.id, coalesce(u.raw_user_meta_data->>'nome', u.email) from auth.users u where u.id = v_id
  on conflict (id) do nothing;

  insert into obra_membros (obra_id, perfil_id, papel)
  values (p_obra, v_id, p_papel)
  on conflict (obra_id, perfil_id) do update set papel = excluded.papel;

  select p.nome into v_nome from perfis p where p.id = v_id;
  return v_nome;
end $$;

create or replace function remover_membro(p_obra uuid, p_perfil uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_atual papel_obra;
begin
  if auth.uid() is null or not pode_aprovar(p_obra) then
    raise exception 'Só engenheiro, responsável ou diretoria podem mudar a equipe.' using errcode = '42501';
  end if;
  if p_perfil = auth.uid() then
    raise exception 'Você não pode tirar você mesmo da equipe.' using errcode = '42501';
  end if;

  select m.papel into v_atual from obra_membros m where m.obra_id = p_obra and m.perfil_id = p_perfil;
  if v_atual is null then
    return; -- já não estava na equipe
  end if;
  if v_atual = 'responsavel' and not eh_responsavel(p_obra) then
    raise exception 'Só o responsável da obra ou a diretoria podem tirar o responsável.' using errcode = '42501';
  end if;

  delete from obra_membros where obra_id = p_obra and perfil_id = p_perfil;
end $$;

-- Só usuários logados chamam; anônimos não.
revoke execute on function listar_equipe(uuid)                    from public, anon;
revoke execute on function eh_responsavel(uuid)                   from public, anon;
revoke execute on function adicionar_membro(uuid, text, papel_obra) from public, anon;
revoke execute on function remover_membro(uuid, uuid)             from public, anon;
grant  execute on function listar_equipe(uuid)                    to authenticated;
grant  execute on function eh_responsavel(uuid)                   to authenticated;
grant  execute on function adicionar_membro(uuid, text, papel_obra) to authenticated;
grant  execute on function remover_membro(uuid, uuid)             to authenticated;
