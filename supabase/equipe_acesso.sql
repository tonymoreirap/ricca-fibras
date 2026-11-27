-- Acesso das profissionais ao app.
-- A dona libera pelo celular da profissional; ela recebe um link, cria a senha e entra em /equipe.
-- Cada profissional vê só a própria agenda e as próprias clientes. Valores só se a dona deixar.

alter table public.contas add column if not exists equipe_id uuid references public.equipe(id) on delete cascade;
alter table public.contas add column if not exists ver_valores boolean not null default false;

alter table public.contas drop constraint contas_papel_check;
alter table public.contas add constraint contas_papel_check check (papel in ('cliente', 'admin', 'master', 'profissional'));
alter table public.contas drop constraint contas_check;
alter table public.contas add constraint contas_check check (
  (papel = 'cliente' and celular is not null)
  or (papel in ('admin', 'master') and email is not null)
  or (papel = 'profissional' and celular is not null and equipe_id is not null));

create unique index if not exists contas_profissional_equipe on public.contas (equipe_id) where papel = 'profissional';
create unique index if not exists contas_profissional_celular on public.contas (empresa_id, celular) where papel = 'profissional';

-- a dona libera, troca o link ou tira o acesso
create or replace function public.admin_equipe_acesso(p_token text, p_equipe uuid, p jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.contas; q public.equipe; c public.contas;
  v_acao text := coalesce(p->>'acao', 'salvar');
  v_cel text := interno.celular(p->>'celular');
  v_ver boolean := coalesce((p->>'ver_valores')::boolean, false);
  v_conv text;
begin
  v := interno.conta_da_sessao(p_token, array['admin', 'master']);
  select * into q from public.equipe where id = p_equipe;
  if not found then return jsonb_build_object('ok', false, 'erro', 'Profissional não encontrada.'); end if;
  select * into c from public.contas where papel = 'profissional' and equipe_id = q.id;

  if v_acao = 'remover' then
    if c.id is not null then delete from public.contas where id = c.id; end if;
    return jsonb_build_object('ok', true);
  end if;

  if v_acao = 'novo_link' then
    if c.id is null then return jsonb_build_object('ok', false, 'erro', 'Libere o acesso primeiro.'); end if;
    delete from public.sessoes where conta_id = c.id;
    update public.contas set senha_hash = null, tentativas = 0, bloqueado_ate = null where id = c.id;
    return jsonb_build_object('ok', true, 'convite', interno.gerar_convite(c.id), 'celular', c.celular);
  end if;

  if v_cel is null then return jsonb_build_object('ok', false, 'erro', 'Informe o celular da profissional com DDD.'); end if;
  if exists (select 1 from public.contas x where x.papel = 'profissional' and x.celular = v_cel and x.equipe_id <> q.id) then
    return jsonb_build_object('ok', false, 'erro', 'Esse celular já está liberado para outra profissional.');
  end if;

  if c.id is null then
    insert into public.contas (papel, nome, celular, equipe_id, ver_valores, verificado)
    values ('profissional', q.nome, v_cel, q.id, v_ver, true) returning * into c;
    v_conv := interno.gerar_convite(c.id);
  elsif c.celular <> v_cel then
    -- celular novo: o acesso antigo cai e sai um link novo
    delete from public.sessoes where conta_id = c.id;
    update public.contas set celular = v_cel, ver_valores = v_ver, nome = q.nome, senha_hash = null, tentativas = 0, bloqueado_ate = null
    where id = c.id returning * into c;
    v_conv := interno.gerar_convite(c.id);
  else
    update public.contas set ver_valores = v_ver, nome = q.nome where id = c.id returning * into c;
    if c.senha_hash is null then v_conv := interno.gerar_convite(c.id); end if;
  end if;
  return jsonb_build_object('ok', true, 'convite', v_conv, 'celular', c.celular);
end;
$$;

-- a profissional cria a senha pelo link
create or replace function public.profissional_criar_senha(p_celular text, p_convite text, p_senha text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.contas; v_cel text := interno.celular(p_celular);
begin
  if v_cel is null then return jsonb_build_object('ok', false, 'erro', 'Celular inválido.'); end if;
  if char_length(coalesce(p_senha, '')) < 6 then return jsonb_build_object('ok', false, 'erro', 'A senha precisa ter pelo menos 6 caracteres.'); end if;
  select * into c from public.contas where papel = 'profissional' and celular = v_cel;
  if not found or c.convite_hash is null or c.convite_expira < now()
     or c.convite_hash <> interno.hash(upper(btrim(coalesce(p_convite, '')))) then
    return jsonb_build_object('ok', false, 'erro', 'Link inválido ou vencido. Peça um novo à dona do salão.');
  end if;
  update public.contas set senha_hash = interno.senha_hash(p_senha), convite_hash = null, convite_expira = null,
    tentativas = 0, bloqueado_ate = null
  where id = c.id returning * into c;
  return jsonb_build_object('ok', true, 'nome', c.nome, 'token', interno.nova_sessao(c.id, 30));
end;
$$;

create or replace function public.profissional_entrar(p_celular text, p_senha text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.contas; v_cel text := interno.celular(p_celular); v_erro text;
begin
  if v_cel is null then return jsonb_build_object('ok', false, 'erro', 'Celular inválido.'); end if;
  select * into c from public.contas where papel = 'profissional' and celular = v_cel;
  if not found then return jsonb_build_object('ok', false, 'erro', 'Celular ou senha incorretos.'); end if;
  if c.senha_hash is null then
    return jsonb_build_object('ok', false, 'erro', 'Crie sua senha pelo link que a dona do salão te enviou.');
  end if;
  v_erro := interno.senha_ok(c, p_senha);
  if v_erro is not null then
    if v_erro like 'Muitas%' then return jsonb_build_object('ok', false, 'erro', v_erro); end if;
    return jsonb_build_object('ok', false, 'erro', 'Celular ou senha incorretos.');
  end if;
  return jsonb_build_object('ok', true, 'nome', c.nome, 'token', interno.nova_sessao(c.id, 30));
end;
$$;

-- o painel da profissional: só o que é dela
create or replace function public.profissional_painel(p_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.contas; q public.equipe;
  v_hoje date := (now() at time zone 'America/Fortaleza')::date;
  v_mes_ini timestamptz := (date_trunc('month', now() at time zone 'America/Fortaleza')) at time zone 'America/Fortaleza';
  v_mes_fim timestamptz := (date_trunc('month', now() at time zone 'America/Fortaleza') + interval '1 month') at time zone 'America/Fortaleza';
begin
  c := interno.conta_da_sessao(p_token, array['profissional']);
  select * into q from public.equipe where id = c.equipe_id;
  if not found then raise exception 'Sessão expirada. Entre novamente.'; end if;
  return jsonb_build_object(
    'eu', jsonb_build_object('nome', q.nome, 'ver_valores', c.ver_valores, 'ativo', q.ativo),
    'resumo', jsonb_build_object(
      'hoje', (select count(*) from public.agendamentos a where a.profissional_id = q.id and not a.demo
               and a.status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado', 'concluido')
               and (a.inicio at time zone 'America/Fortaleza')::date = v_hoje),
      'semana', (select count(*) from public.agendamentos a where a.profissional_id = q.id and not a.demo
               and a.status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado')
               and a.inicio >= now() and a.inicio < now() + interval '7 days'),
      'concluidos_mes', (select count(*) from public.agendamentos a where a.profissional_id = q.id and not a.demo
               and a.status = 'concluido' and a.inicio >= v_mes_ini and a.inicio < v_mes_fim),
      'valor_mes', case when c.ver_valores then coalesce((select sum(a.valor) from public.agendamentos a
               where a.profissional_id = q.id and not a.demo and a.status = 'concluido'
               and a.inicio >= v_mes_ini and a.inicio < v_mes_fim), 0) end,
      'previsto_mes', case when c.ver_valores then coalesce((select sum(a.valor) from public.agendamentos a
               where a.profissional_id = q.id and not a.demo
               and a.status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado', 'concluido')
               and a.inicio >= v_mes_ini and a.inicio < v_mes_fim), 0) end),
    'agendamentos', coalesce((
      select jsonb_agg(
        case when c.ver_valores then j else j - 'valor' - 'sinal' end
        order by a.inicio)
      from public.agendamentos a
      cross join lateral (select jsonb_build_object(
        'codigo', a.codigo, 'servico', a.servico, 'servico_nome', a.servico_nome,
        'cliente_nome', a.cliente_nome, 'cliente_celular', a.cliente_celular,
        'inicio', a.inicio, 'fim', a.fim, 'status', a.status, 'valor', a.valor, 'sinal', a.sinal,
        'motivo_cancelamento', a.motivo_cancelamento, 'cancelado_por', a.cancelado_por) j) x
      where a.profissional_id = q.id and not a.demo
        and a.inicio >= now() - interval '45 days' and a.inicio < now() + interval '120 days'), '[]'::jsonb),
    'clientes', coalesce((
      select jsonb_agg(jsonb_build_object('celular', g.celular, 'nome', g.nome, 'atendimentos', g.n, 'ultimo', g.ultimo, 'proximo', g.proximo)
                       order by g.nome)
      from (
        select a.cliente_celular celular, (array_agg(a.cliente_nome order by a.criado_em desc))[1] nome,
               count(*) filter (where a.status = 'concluido') n,
               max(a.inicio) filter (where a.status = 'concluido') ultimo,
               min(a.inicio) filter (where a.status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado') and a.inicio > now()) proximo
        from public.agendamentos a
        where a.profissional_id = q.id and not a.demo and a.status <> 'cancelado'
        group by a.cliente_celular) g), '[]'::jsonb));
end;
$$;

-- a profissional marca o atendimento como concluído (ou desfaz)
create or replace function public.profissional_status(p_token text, p_codigo text, p_status text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.contas; a public.agendamentos;
begin
  c := interno.conta_da_sessao(p_token, array['profissional']);
  select * into a from public.agendamentos where codigo = upper(btrim(p_codigo)) and profissional_id = c.equipe_id;
  if not found then return jsonb_build_object('ok', false, 'erro', 'Horário não encontrado na sua agenda.'); end if;
  if not ((a.status = 'confirmado' and p_status = 'concluido') or (a.status = 'concluido' and p_status = 'confirmado')) then
    return jsonb_build_object('ok', false, 'erro', 'Só a dona do salão pode mudar este horário.');
  end if;
  if p_status = 'concluido' and a.inicio > now() + interval '30 minutes' then
    return jsonb_build_object('ok', false, 'erro', 'Esse atendimento ainda não começou.');
  end if;
  update public.agendamentos set status = p_status, atualizado_em = now() where id = a.id;
  return jsonb_build_object('ok', true);
end;
$$;

-- donos e permissões
alter function public.admin_equipe_acesso(text, uuid, jsonb) owner to app_dono;
alter function public.profissional_criar_senha(text, text, text) owner to app_dono;
alter function public.profissional_entrar(text, text) owner to app_dono;
alter function public.profissional_painel(text) owner to app_dono;
alter function public.profissional_status(text, text, text) owner to app_dono;
revoke all on function public.admin_equipe_acesso(text, uuid, jsonb), public.profissional_criar_senha(text, text, text),
  public.profissional_entrar(text, text), public.profissional_painel(text), public.profissional_status(text, text, text) from public;
grant execute on function public.admin_equipe_acesso(text, uuid, jsonb), public.profissional_criar_senha(text, text, text),
  public.profissional_entrar(text, text), public.profissional_painel(text), public.profissional_status(text, text, text) to anon, authenticated;

-- a lista da equipe mostra o acesso de cada uma
create or replace function pg_temp.trocar(p_fn regprocedure, p_de text, p_para text)
returns void language plpgsql as $$
declare d text := pg_get_functiondef(p_fn);
begin
  if position(p_de in d) = 0 then raise exception 'trecho não encontrado em %: %', p_fn, left(p_de, 80); end if;
  execute replace(d, p_de, p_para);
end;
$$;
select pg_temp.trocar('public.admin_equipe(text)'::regprocedure,
  $x$'id', q.id, 'nome', q.nome,$x$,
  $x$'id', q.id, 'nome', q.nome,
        'acesso', (select jsonb_build_object('celular', c.celular, 'ativo', c.senha_hash is not null,
                     'convite_pendente', c.senha_hash is null and c.convite_expira > now(), 'ver_valores', c.ver_valores)
                   from public.contas c where c.papel = 'profissional' and c.equipe_id = q.id),$x$);
