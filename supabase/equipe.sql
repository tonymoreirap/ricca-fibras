-- =====================================================================
-- PLANOS ETAPA 2: equipe com várias agendas
--  * cada salão tem a sua equipe (Essencial 1, Profissional 3, Salão 10 + extras)
--  * cada agendamento pertence a uma profissional
--  * conflito de horário passa a ser por profissional
-- Migração sem DROP. A trava antiga (um horário por salão) é removida depois,
-- à mão, no SQL Editor:  alter table public.agendamentos drop constraint agendamentos_sem_conflito;
-- =====================================================================

create table public.equipe (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null default interno.empresa_atual() references public.empresas(id) on delete cascade,
  nome        text not null check (char_length(nome) between 2 and 40),
  servicos    text[] not null default '{}',   -- vazio = faz todos os serviços
  ativo       boolean not null default true,
  ordem       integer not null default 0,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz
);
create index equipe_empresa on public.equipe (empresa_id, ordem);
alter table public.equipe enable row level security;
revoke all on public.equipe from anon, authenticated;
grant select, insert, update, delete on public.equipe to app_dono;
create policy so_da_empresa on public.equipe for all to app_dono
  using (empresa_id = interno.empresa_atual()) with check (empresa_id = interno.empresa_atual());

-- uma profissional para cada salão que já existe (o nome de contato da dona)
insert into public.equipe (empresa_id, nome)
select e.id, left(coalesce(nullif(btrim(e.config->>'contato'), ''), e.nome), 40) from public.empresas e;

-- salão novo já nasce com a dona na equipe
create or replace function interno.equipe_inicial() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.equipe (empresa_id, nome)
  values (new.id, left(coalesce(nullif(btrim(new.config->>'contato'), ''), new.nome), 40));
  return new;
end;
$$;
create trigger empresa_equipe_inicial after insert on public.empresas
  for each row execute function interno.equipe_inicial();

-- profissionais extras contratados (plano Salão: + R$ 20 cada)
alter table public.empresas add column profissionais_extra integer not null default 0
  check (profissionais_extra between 0 and 50);

-- agendamento ganha a profissional
alter table public.agendamentos add column profissional_id uuid references public.equipe(id) on delete set null;
alter table public.agendamentos add column profissional_nome text;
update public.agendamentos a set profissional_id = q.id, profissional_nome = q.nome
from public.equipe q where q.empresa_id = a.empresa_id and a.profissional_id is null;
create index agendamentos_profissional on public.agendamentos (profissional_id, inicio);

-- rede de segurança: inserção sem profissional cai na primeira da equipe
create or replace function interno.agendamento_profissional() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.profissional_id is null then
    select q.id, q.nome into new.profissional_id, new.profissional_nome
    from public.equipe q where q.empresa_id = new.empresa_id and q.ativo
    order by q.ordem, q.criado_em limit 1;
  elsif new.profissional_nome is null then
    select q.nome into new.profissional_nome from public.equipe q where q.id = new.profissional_id;
  end if;
  return new;
end;
$$;
create trigger agendamento_profissional before insert on public.agendamentos
  for each row execute function interno.agendamento_profissional();

-- conflito agora é por profissional
alter table public.agendamentos add constraint agendamentos_sem_conflito_prof
  exclude using gist (empresa_id with =, profissional_id with =, tstzrange(inicio, fim) with &&)
  where (status in ('aguardando_sinal', 'confirmado') and not demo);

-- ---------------------------------------------------------------------
-- limite do plano
-- ---------------------------------------------------------------------
create or replace function interno.limite_equipe(p_emp uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case when e.situacao = 'teste'
                then greatest(pl.profissionais, coalesce((select x.profissionais from public.planos x where x.codigo = 'profissional'), 1))
                else pl.profissionais end
         + case when pl.extra_profissional > 0 then e.profissionais_extra else 0 end
    from public.empresas e join public.planos pl on pl.codigo = e.plano
    where e.id = p_emp), 1);
$$;
grant execute on function interno.limite_equipe(uuid) to app_dono;

-- quem pode atender agora: ativas, na ordem, até o limite do plano
create or replace function interno.equipe_valida() returns setof public.equipe
language sql stable security definer set search_path = '' as $$
  select q.* from public.equipe q
  where q.ativo
  order by q.ordem, q.criado_em
  limit interno.limite_equipe(interno.empresa_atual());
$$;
alter function interno.equipe_valida() owner to app_dono;

-- agendamento leva a profissional
create or replace function interno.json_agendamento(a public.agendamentos) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'codigo', a.codigo, 'servico', a.servico, 'servico_nome', a.servico_nome,
    'cliente_nome', a.cliente_nome, 'cliente_celular', a.cliente_celular,
    'inicio', a.inicio, 'fim', a.fim, 'valor', a.valor, 'sinal', a.sinal,
    'status', a.status, 'criado_por', a.criado_por, 'criado_em', a.criado_em,
    'atualizado_em', a.atualizado_em, 'pix_informado_em', a.pix_informado_em, 'demo', a.demo,
    'profissional_id', a.profissional_id, 'profissional_nome', a.profissional_nome);
$$;

-- ---------------------------------------------------------------------
-- público
-- ---------------------------------------------------------------------
create or replace function public.equipe_publica(p_servico text default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'nome', q.nome, 'servicos', q.servicos) order by q.ordem, q.criado_em), '[]')
  from interno.equipe_valida() q
  where p_servico is null or cardinality(q.servicos) = 0 or p_servico = any(q.servicos);
$$;
alter function public.equipe_publica(text) owner to app_dono;
grant execute on function public.equipe_publica(text) to anon, authenticated;

-- horários ocupados com a profissional de cada um.
-- Enquanto a trava antiga existir, um horário bloqueia o salão todo (profissional = null).
create or replace function public.horarios_ocupados_equipe(p_de date, p_ate date)
returns table(inicio timestamptz, fim timestamptz, profissional uuid)
language plpgsql stable security definer set search_path = '' as $$
declare v_trava_antiga boolean := exists (
  select 1 from pg_catalog.pg_constraint where conname = 'agendamentos_sem_conflito' and conrelid = 'public.agendamentos'::regclass);
begin
  if p_ate < p_de or p_ate - p_de > 62 then raise exception 'Intervalo de datas inválido'; end if;
  return query
    select a.inicio, a.fim, case when v_trava_antiga then null else a.profissional_id end
    from public.agendamentos a
    where a.status in ('aguardando_sinal', 'confirmado') and not a.demo
      and a.inicio < ((p_ate + 1)::timestamp at time zone 'America/Fortaleza')
      and a.fim > (p_de::timestamp at time zone 'America/Fortaleza')
    order by a.inicio;
end;
$$;
alter function public.horarios_ocupados_equipe(date, date) owner to app_dono;
grant execute on function public.horarios_ocupados_equipe(date, date) to anon, authenticated;

-- ---------------------------------------------------------------------
-- inserir com profissional (null = a primeira livre, a menos ocupada no dia)
-- ---------------------------------------------------------------------
create or replace function interno.inserir_agendamento_eq(
  p_servico text, p_inicio timestamptz, p_nome text, p_celular text,
  p_conta uuid, p_por text, p_status text, p_prof uuid)
returns public.agendamentos
language plpgsql security definer set search_path = '' as $$
declare
  v_serv  public.servicos_agenda%rowtype;
  v_func  public.horario_funcionamento%rowtype;
  v_local timestamp;
  v_min   integer;
  v_nome  text := btrim(coalesce(p_nome, ''));
  v_cel   text := interno.celular(p_celular);
  v_admin boolean := p_por = 'admin';
  v_max   interval;
  v_reg   public.agendamentos;
  v_valor numeric;
  v_codigo text;
  m record;
begin
  v_max := case when v_admin then interval '180 days' else interval '60 days' end;
  select * into v_serv from public.servicos_agenda s where s.codigo = p_servico and s.ativo and s.visivel and s.valor is not null;
  if not found then raise exception 'Serviço indisponível para agendamento online'; end if;
  if char_length(v_nome) < 2 or char_length(v_nome) > 80 then raise exception 'Informe o nome'; end if;
  if v_cel is null then raise exception 'Celular inválido'; end if;

  if (not v_admin) and p_inicio < now() + interval '1 hour' then
    raise exception 'Escolha um horário com pelo menos 1 hora de antecedência';
  end if;
  if p_inicio < now() - interval '1 day' then raise exception 'Data no passado'; end if;
  if p_inicio > now() + v_max then raise exception 'Data muito distante'; end if;

  v_local := p_inicio at time zone 'America/Fortaleza';
  select * into v_func from public.horario_funcionamento h where h.dia_semana = extract(dow from v_local);
  if not found then raise exception 'O salão não atende neste dia'; end if;
  if v_local::time < v_func.abre
     or (v_local + make_interval(mins => v_serv.duracao_min))::time > v_func.fecha
     or (v_local + make_interval(mins => v_serv.duracao_min))::date <> v_local::date then
    raise exception 'Fora do horário de atendimento';
  end if;
  v_min := (extract(epoch from (v_local::time - v_func.abre)) / 60)::integer;
  if extract(second from v_local) <> 0 or v_min % v_serv.duracao_min <> 0 then
    raise exception 'Horário inválido';
  end if;

  if (not v_admin) and (select count(*) from public.agendamentos a
      where a.cliente_celular = v_cel and a.status = 'aguardando_sinal' and a.inicio > now()) >= 2 then
    raise exception 'Você já tem agendamentos aguardando o sinal. Fale com o salão pelo WhatsApp.';
  end if;

  if p_prof is not null and not exists (
      select 1 from interno.equipe_valida() q
      where q.id = p_prof and (cardinality(q.servicos) = 0 or v_serv.codigo = any(q.servicos))) then
    raise exception 'Essa profissional não está disponível para este serviço. Escolha outra.';
  end if;

  v_valor := coalesce((interno.promo_do_servico(v_serv.codigo)).preco_promo, v_serv.valor);

  for m in
    select e.id, e.nome from interno.equipe_valida() e
    where (p_prof is null or e.id = p_prof)
      and (cardinality(e.servicos) = 0 or v_serv.codigo = any(e.servicos))
    order by (select count(*) from public.agendamentos a
              where a.profissional_id = e.id and a.status in ('aguardando_sinal', 'confirmado')
                and (a.inicio at time zone 'America/Fortaleza')::date = v_local::date),
             e.ordem, e.criado_em
  loop
    begin
      v_codigo := 'RF' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      insert into public.agendamentos
        (codigo, servico, servico_nome, cliente_nome, cliente_celular, inicio, fim, valor, sinal, status,
         conta_id, criado_por, profissional_id, profissional_nome)
      values
        (v_codigo, v_serv.codigo, v_serv.nome, v_nome, v_cel, p_inicio, p_inicio + make_interval(mins => v_serv.duracao_min),
         v_valor, round(v_valor * v_serv.sinal_pct / 100, 2), p_status, p_conta, p_por, m.id, m.nome)
      returning * into v_reg;
      return v_reg;
    exception when exclusion_violation then
      null; -- essa está ocupada: tenta a próxima
    end;
  end loop;

  if p_prof is null and not exists (select 1 from interno.equipe_valida()) then
    raise exception 'O salão ainda não tem profissionais na agenda.';
  end if;
  raise exception 'Esse horário acabou de ser reservado. Escolha outro.';
end;
$$;
alter function interno.inserir_agendamento_eq(text, timestamptz, text, text, uuid, text, text, uuid) owner to app_dono;

-- a função antiga passa a usar a nova (qualquer profissional livre)
create or replace function interno.inserir_agendamento(p_servico text, p_inicio timestamptz, p_nome text, p_celular text, p_conta uuid, p_por text, p_status text)
returns public.agendamentos
language plpgsql security definer set search_path = '' as $$
begin
  return interno.inserir_agendamento_eq(p_servico, p_inicio, p_nome, p_celular, p_conta, p_por, p_status, null);
end;
$$;

-- cliente agenda escolhendo a profissional (null = qualquer uma)
create or replace function public.agendar_com(p_servico text, p_inicio timestamptz, p_nome text, p_celular text,
  p_senha text, p_token text, p_profissional uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.contas; v_token text; v_erro text; v_reg public.agendamentos;
  v_cel text := interno.celular(p_celular); v_sem_sessao boolean := false; v_hist boolean;
begin
  if coalesce(p_token, '') <> '' then
    select c.* into v from public.sessoes s join public.contas c on c.id = s.conta_id
    where s.token_hash = interno.hash(p_token) and s.expira_em > now() and c.papel = 'cliente';
  end if;

  if v.id is null then
    if v_cel is null then return jsonb_build_object('ok', false, 'erro', 'Celular inválido.'); end if;
    select * into v from public.contas where papel = 'cliente' and celular = v_cel;
    if found and v.senha_hash is not null then
      v_erro := interno.senha_ok(v, p_senha);
      if v_erro is not null then
        return jsonb_build_object('ok', false, 'erro', 'Esse celular já tem conta. ' || v_erro, 'tem_conta', true);
      end if;
      v_token := interno.nova_sessao(v.id, 90);
    elsif found then
      v_sem_sessao := true;
    else
      v_hist := interno.tem_historico(v_cel);
      insert into public.contas (papel, nome, celular, senha_hash)
      values ('cliente', btrim(p_nome), v_cel, interno.senha_hash(p_senha)) returning * into v;
      if v_hist then perform interno.marcar_confirmacao(v.id); end if;
      v_token := interno.nova_sessao(v.id, 90);
    end if;
  end if;

  v_reg := interno.inserir_agendamento_eq(p_servico, p_inicio, coalesce(nullif(btrim(p_nome), ''), v.nome), v.celular, v.id,
                                          'cliente', 'aguardando_sinal', p_profissional);
  return jsonb_build_object('ok', true, 'token', v_token, 'nome', v.nome, 'sem_sessao', v_sem_sessao,
    'agendamento', interno.json_agendamento(v_reg));
end;
$$;
alter function public.agendar_com(text, timestamptz, text, text, text, text, uuid) owner to app_dono;
grant execute on function public.agendar_com(text, timestamptz, text, text, text, text, uuid) to anon, authenticated;

-- dona agenda escolhendo a profissional
create or replace function public.admin_agendar_com(p_token text, p_servico text, p_inicio timestamptz, p_nome text,
  p_celular text, p_confirmado boolean, p_profissional uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.contas; c public.contas; v_cel text := interno.celular(p_celular); a public.agendamentos; v_conv text;
begin
  v := interno.conta_da_sessao(p_token, array['admin', 'master']);
  if v_cel is null then return jsonb_build_object('ok', false, 'erro', 'Celular inválido.'); end if;
  select * into c from public.contas where papel = 'cliente' and celular = v_cel;
  if not found then
    insert into public.contas (papel, nome, celular, verificado, cliente_desde)
    values ('cliente', btrim(p_nome), v_cel, true, (now() at time zone 'America/Fortaleza')::date) returning * into c;
  end if;
  a := interno.inserir_agendamento_eq(p_servico, p_inicio, p_nome, v_cel, c.id, 'admin',
         case when p_confirmado then 'confirmado' else 'aguardando_sinal' end, p_profissional);
  update public.contas set verificado = true where id = c.id;
  if c.senha_hash is null and not c.demo then v_conv := interno.gerar_convite(c.id); end if;
  return jsonb_build_object('ok', true, 'convite', v_conv, 'agendamento', interno.json_agendamento(a));
end;
$$;
alter function public.admin_agendar_com(text, text, timestamptz, text, text, boolean, uuid) owner to app_dono;
grant execute on function public.admin_agendar_com(text, text, timestamptz, text, text, boolean, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- painel da dona: equipe
-- ---------------------------------------------------------------------
create or replace function public.admin_equipe(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.contas; v_lim integer; v_emp uuid := interno.empresa_atual();
begin
  v := interno.conta_da_sessao(p_token, array['admin', 'master']);
  v_lim := interno.limite_equipe(v_emp);
  return jsonb_build_object('ok', true, 'limite', v_lim,
    'equipe', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'nome', q.nome, 'servicos', q.servicos, 'ativo', q.ativo, 'ordem', q.ordem,
        'fora_do_plano', q.ativo and q.pos > v_lim,
        'futuros', (select count(*) from public.agendamentos a where a.profissional_id = q.id
                    and a.status in ('aguardando_sinal', 'confirmado') and a.inicio > now() and not a.demo))
        order by not q.ativo, q.ordem, q.criado_em)
      from (select e.*, case when e.ativo then row_number() over (partition by e.ativo order by e.ordem, e.criado_em) end pos
            from public.equipe e) q), '[]'),
    'servicos', coalesce((select jsonb_agg(jsonb_build_object('codigo', s.codigo, 'nome', s.nome) order by s.ordem)
                          from public.servicos_agenda s where s.ativo), '[]'));
end;
$$;
alter function public.admin_equipe(text) owner to app_dono;
grant execute on function public.admin_equipe(text) to anon, authenticated;

-- p = { id?, nome, servicos[], ativo }
create or replace function public.admin_equipe_salvar(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.contas; q public.equipe; v_id uuid := nullif(p->>'id', '')::uuid;
  v_nome text := btrim(coalesce(p->>'nome', ''));
  v_ativo boolean := coalesce((p->>'ativo')::boolean, true);
  v_serv text[]; v_lim integer; v_outras integer;
begin
  v := interno.conta_da_sessao(p_token, array['admin', 'master']);
  if char_length(v_nome) not between 2 and 40 then
    return jsonb_build_object('ok', false, 'erro', 'Informe o nome da profissional (até 40 letras).');
  end if;
  select coalesce(array_agg(s.codigo order by s.ordem), '{}') into v_serv
  from public.servicos_agenda s
  where jsonb_typeof(p->'servicos') = 'array' and s.codigo in (select jsonb_array_elements_text(p->'servicos'));

  if v_id is not null then
    select * into q from public.equipe where id = v_id;
    if not found then return jsonb_build_object('ok', false, 'erro', 'Profissional não encontrada.'); end if;
  end if;

  select count(*) into v_outras from public.equipe e where e.ativo and e.id is distinct from v_id;
  if v_ativo and (v_id is null or not q.ativo) then
    v_lim := interno.limite_equipe(interno.empresa_atual());
    if v_outras >= v_lim then
      return jsonb_build_object('ok', false, 'limite', true, 'erro',
        'Seu plano permite até ' || v_lim || case when v_lim = 1 then ' profissional.' else ' profissionais.' end);
    end if;
  end if;
  if not v_ativo and v_outras = 0 then
    return jsonb_build_object('ok', false, 'erro', 'A agenda precisa de pelo menos uma profissional ativa.');
  end if;

  if v_id is null then
    insert into public.equipe (nome, servicos, ativo, ordem)
    values (v_nome, v_serv, v_ativo, coalesce((select max(e.ordem) + 1 from public.equipe e), 0));
  else
    update public.equipe set nome = v_nome, servicos = v_serv, ativo = v_ativo, atualizado_em = now() where id = v_id;
    if v_nome <> q.nome then
      update public.agendamentos set profissional_nome = v_nome where profissional_id = v_id;
    end if;
  end if;
  return public.admin_equipe(p_token);
end;
$$;
alter function public.admin_equipe_salvar(text, jsonb) owner to app_dono;
grant execute on function public.admin_equipe_salvar(text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- master: profissionais extras (aplicado como "master_profissionais_extra")
-- ---------------------------------------------------------------------
do $$
declare d text;
begin
  d := pg_get_functiondef('public.master_empresas'::regproc);
  d := replace(d, $x$'cortesias', to_jsonb(e.cortesias),$x$,
    $x$'cortesias', to_jsonb(e.cortesias), 'profissionais_extra', e.profissionais_extra,
      'limite_equipe', interno.limite_equipe(e.id),
      'equipe_ativa', (select count(*) from public.equipe q where q.empresa_id = e.id and q.ativo),$x$);
  execute d;
  d := pg_get_functiondef('public.master_empresa_plano'::regproc);
  d := replace(d, '    cortesias = coalesce(v_cort, cortesias),',
    E'    cortesias = coalesce(v_cort, cortesias),\n    profissionais_extra = least(50, greatest(0, coalesce(nullif(p->>''profissionais_extra'', '''')::integer, profissionais_extra))),');
  d := replace(d, $x$'teste_ate', e.teste_ate);$x$, $x$'teste_ate', e.teste_ate, 'profissionais_extra', e.profissionais_extra);$x$);
  execute d;
end $$;
