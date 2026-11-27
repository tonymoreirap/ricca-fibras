-- Painel de resultados da dona: despesas, comissão por profissional e o cálculo do mês.

-- 1. despesas ---------------------------------------------------------------------------------
create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default interno.empresa_atual() references public.empresas(id) on delete cascade,
  data date not null,
  categoria text not null check (categoria in ('aluguel', 'material', 'produtos', 'contas', 'salarios', 'marketing', 'impostos', 'equipamentos', 'curso', 'outros')),
  descricao text check (char_length(descricao) <= 80),
  valor numeric(10,2) not null check (valor > 0 and valor <= 1000000),
  recorrente boolean not null default false,  -- repete todo mês a partir de "data"
  ate date,                                   -- última competência da recorrente (null = continua)
  criado_em timestamptz not null default now()
);
create index if not exists despesas_empresa_data on public.despesas (empresa_id, data);
alter table public.despesas enable row level security;
drop policy if exists so_da_empresa on public.despesas;
create policy so_da_empresa on public.despesas to app_dono
  using (empresa_id = interno.empresa_atual()) with check (empresa_id = interno.empresa_atual());
grant select, insert, update, delete on public.despesas to app_dono;
revoke all on public.despesas from anon, authenticated;

-- o painel lê as visitas do próprio salão
drop policy if exists so_da_empresa on public.visitas;
create policy so_da_empresa on public.visitas for select to app_dono using (empresa_id = interno.empresa_atual());
grant select on public.visitas to app_dono;

-- 2. comissão --------------------------------------------------------------------------------
alter table public.equipe add column if not exists comissao_pct numeric(5,2) not null default 0;
alter table public.equipe drop constraint if exists equipe_comissao_check;
alter table public.equipe add constraint equipe_comissao_check check (comissao_pct between 0 and 100);

-- despesas que valem num mês (as do mês + recorrentes ativas)
create or replace function interno.despesas_do_mes(p_ini date)
returns setof public.despesas
language sql stable set search_path = '' as $$
  select d.* from public.despesas d
  where (not d.recorrente and d.data >= p_ini and d.data < (p_ini + interval '1 month')::date)
     or (d.recorrente and d.data < (p_ini + interval '1 month')::date and (d.ate is null or d.ate >= p_ini));
$$;
grant execute on function interno.despesas_do_mes(date) to app_dono;

-- 3. lançar, listar e excluir despesas ------------------------------------------------------------
create or replace function public.admin_despesas(p_token text, p_mes date)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_ini date := date_trunc('month', coalesce(p_mes, (now() at time zone 'America/Fortaleza')::date))::date;
begin
  perform interno.conta_da_sessao(p_token, array['admin', 'master']);
  return jsonb_build_object('ok', true, 'mes', v_ini,
    'lista', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'data', d.data, 'categoria', d.categoria, 'descricao', d.descricao,
                         'valor', d.valor, 'recorrente', d.recorrente, 'ate', d.ate) order by d.recorrente desc, d.data desc, d.criado_em desc)
                       from interno.despesas_do_mes(v_ini) d), '[]'::jsonb));
end;
$$;

create or replace function public.admin_despesa_salvar(p_token text, p jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := nullif(p->>'id', '')::uuid; v_valor numeric; v_data date; d public.despesas;
begin
  perform interno.conta_da_sessao(p_token, array['admin', 'master']);
  begin
    v_valor := round(replace(coalesce(p->>'valor', ''), ',', '.')::numeric, 2);
    v_data := (p->>'data')::date;
  exception when others then
    return jsonb_build_object('ok', false, 'erro', 'Confira o valor e a data.');
  end;
  if v_valor is null or v_valor <= 0 then return jsonb_build_object('ok', false, 'erro', 'Informe o valor.'); end if;
  if v_data is null then return jsonb_build_object('ok', false, 'erro', 'Informe a data.'); end if;
  if coalesce(p->>'categoria', '') not in ('aluguel', 'material', 'produtos', 'contas', 'salarios', 'marketing', 'impostos', 'equipamentos', 'curso', 'outros') then
    return jsonb_build_object('ok', false, 'erro', 'Escolha o tipo da despesa.');
  end if;
  if v_id is null then
    insert into public.despesas (data, categoria, descricao, valor, recorrente)
    values (v_data, p->>'categoria', nullif(left(btrim(coalesce(p->>'descricao', '')), 80), ''), v_valor, coalesce((p->>'recorrente')::boolean, false))
    returning * into d;
  else
    update public.despesas set data = v_data, categoria = p->>'categoria', descricao = nullif(left(btrim(coalesce(p->>'descricao', '')), 80), ''),
      valor = v_valor, recorrente = coalesce((p->>'recorrente')::boolean, false)
    where id = v_id returning * into d;
    if not found then return jsonb_build_object('ok', false, 'erro', 'Despesa não encontrada.'); end if;
  end if;
  return jsonb_build_object('ok', true, 'id', d.id);
end;
$$;

-- recorrente: para de contar a partir do mês escolhido (o histórico fica); avulsa: some
create or replace function public.admin_despesa_excluir(p_token text, p_id uuid, p_mes date)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d public.despesas; v_ini date := date_trunc('month', coalesce(p_mes, (now() at time zone 'America/Fortaleza')::date))::date;
begin
  perform interno.conta_da_sessao(p_token, array['admin', 'master']);
  select * into d from public.despesas where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'erro', 'Despesa não encontrada.'); end if;
  if d.recorrente and d.data < v_ini then
    update public.despesas set ate = (v_ini - interval '1 day')::date where id = d.id;
  else
    delete from public.despesas where id = d.id;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_equipe_comissao(p_token text, p_equipe uuid, p_pct numeric)
returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform interno.conta_da_sessao(p_token, array['admin', 'master']);
  if p_pct is null or p_pct < 0 or p_pct > 100 then return jsonb_build_object('ok', false, 'erro', 'A comissão vai de 0% a 100%.'); end if;
  update public.equipe set comissao_pct = round(p_pct, 2), atualizado_em = now() where id = p_equipe;
  if not found then return jsonb_build_object('ok', false, 'erro', 'Profissional não encontrada.'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 4. o resumo do mês ---------------------------------------------------------------------------------
create or replace function public.admin_resultados(p_token text, p_mes date)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_tz text := 'America/Fortaleza';
  v_hoje date := (now() at time zone 'America/Fortaleza')::date;
  v_mes date := date_trunc('month', coalesce(p_mes, (now() at time zone 'America/Fortaleza')::date))::date;
  v_prox date := (v_mes + interval '1 month')::date;
  v_ini timestamptz := v_mes::timestamp at time zone 'America/Fortaleza';
  v_fim timestamptz := v_prox::timestamp at time zone 'America/Fortaleza';
  v_ate_dia date := least(v_prox - 1, v_hoje);     -- até onde o mês já aconteceu
  v_cap_min numeric := 0;  v_ocup_min numeric := 0;
  r jsonb;
begin
  perform interno.conta_da_sessao(p_token, array['admin', 'master']);

  -- capacidade (minutos abertos × profissionais ativas) e minutos ocupados, até hoje
  if v_ate_dia >= v_mes then
    select coalesce(sum(extract(epoch from (h.fecha - h.abre)) / 60), 0) * greatest(1, (select count(*) from public.equipe q where q.ativo))
    into v_cap_min
    from generate_series(v_mes, v_ate_dia, interval '1 day') g(d)
    join public.horario_funcionamento h on h.dia_semana = extract(dow from g.d);
    select coalesce(sum(extract(epoch from (a.fim - a.inicio)) / 60), 0) into v_ocup_min
    from public.agendamentos a
    where not a.demo and a.status in ('confirmado', 'concluido')
      and a.inicio >= v_ini and a.inicio < least(v_fim, ((v_ate_dia + 1)::timestamp at time zone 'America/Fortaleza'));
  end if;

  with a as (
    select x.*, coalesce(nullif(btrim(s.categoria), ''), 'Sem tipo') categoria, s.valor valor_tabela,
           coalesce(q.comissao_pct, 0) comissao_pct
    from public.agendamentos x
    left join public.servicos_agenda s on s.empresa_id = x.empresa_id and s.codigo = x.servico
    left join public.equipe q on q.id = x.profissional_id
    where not x.demo and x.inicio >= v_ini and x.inicio < v_fim
  ), conc as (select * from a where status = 'concluido'),
  desp as (select * from interno.despesas_do_mes(v_mes)),
  curso as (
    select i.*, t.valor turma_valor from public.inscricoes i left join public.turmas t on t.id = i.turma_id
    where not i.demo and i.criado_em >= v_ini and i.criado_em < v_fim
  )
  select jsonb_build_object(
    'mes', v_mes, 'hoje', v_hoje, 'mes_atual', v_mes = date_trunc('month', v_hoje)::date,
    'faturado', (select coalesce(sum(valor), 0) from conc),
    'atendimentos', (select count(*) from conc),
    'ticket_medio', (select coalesce(round(avg(valor), 2), 0) from conc),
    'a_receber', (select coalesce(sum(valor - case when status = 'confirmado' then sinal else 0 end), 0) from a
                  where status in ('confirmado', 'aguardando_sinal', 'aguardando_confirmacao')),
    'sinais_recebidos', (select coalesce(sum(sinal), 0) from a where status = 'confirmado'),
    'comissoes', (select coalesce(round(sum(valor * comissao_pct / 100), 2), 0) from conc),
    'despesas', (select coalesce(sum(valor), 0) from desp),
    'despesas_por_tipo', coalesce((select jsonb_agg(jsonb_build_object('categoria', categoria, 'valor', v) order by v desc)
                          from (select categoria, sum(valor) v from desp group by 1) z), '[]'::jsonb),
    'por_area', coalesce((select jsonb_agg(jsonb_build_object('area', categoria, 'valor', v, 'qtd', n) order by v desc)
                 from (select categoria, sum(valor) v, count(*) n from conc group by 1) z), '[]'::jsonb),
    'por_servico', coalesce((select jsonb_agg(jsonb_build_object('servico', servico_nome, 'valor', v, 'qtd', n, 'cancelados', c) order by v desc nulls last)
                 from (select servico_nome, sum(valor) filter (where status = 'concluido') v,
                              count(*) filter (where status = 'concluido') n, count(*) filter (where status = 'cancelado') c
                       from a group by 1) z), '[]'::jsonb),
    'por_profissional', coalesce((select jsonb_agg(jsonb_build_object('nome', nome, 'valor', v, 'qtd', n, 'comissao_pct', pct,
                         'comissao', round(v * pct / 100, 2), 'cancelados', c) order by v desc nulls last)
                 from (select coalesce(profissional_nome, 'Sem profissional') nome, max(comissao_pct) pct,
                              coalesce(sum(valor) filter (where status = 'concluido'), 0) v,
                              count(*) filter (where status = 'concluido') n, count(*) filter (where status = 'cancelado') c
                       from a group by 1) z), '[]'::jsonb),
    'por_dia_semana', coalesce((select jsonb_agg(jsonb_build_object('dia', d, 'qtd', n, 'valor', v) order by d)
                 from (select extract(dow from inicio at time zone 'America/Fortaleza')::int d, count(*) n, sum(valor) v from conc group by 1) z), '[]'::jsonb),
    'perdas', jsonb_build_object(
      'cancelados', (select count(*) from a where status = 'cancelado'),
      'cancelados_valor', (select coalesce(sum(valor), 0) from a where status = 'cancelado'),
      'por_quem', coalesce((select jsonb_object_agg(coalesce(cancelado_por, 'salao'), n) from
                   (select cancelado_por, count(*) n from a where status = 'cancelado' group by 1) z), '{}'::jsonb),
      'motivos', coalesce((select jsonb_agg(jsonb_build_object('motivo', motivo_cancelamento, 'qtd', n) order by n desc)
                 from (select motivo_cancelamento, count(*) n from a where status = 'cancelado' and motivo_cancelamento is not null
                       and cancelado_por = 'cliente' group by 1 limit 5) z), '[]'::jsonb),
      'descontos', (select coalesce(sum(greatest(valor_tabela - valor, 0)), 0) from conc where valor_tabela is not null),
      'sinais_pendentes', (select count(*) from a where status = 'aguardando_sinal' and fim > now()),
      'sinais_pendentes_valor', (select coalesce(sum(sinal), 0) from a where status = 'aguardando_sinal' and fim > now()),
      'atrasados_sem_concluir', (select count(*) from a where status = 'confirmado' and fim < now() - interval '1 day')),
    'ocupacao', jsonb_build_object('capacidade_horas', round(v_cap_min / 60), 'ocupadas_horas', round(v_ocup_min / 60),
                  'pct', case when v_cap_min > 0 then round(100 * v_ocup_min / v_cap_min) end,
                  'valor_hora', (select case when sum(extract(epoch from (fim - inicio))) > 0
                                             then round(sum(valor) / (sum(extract(epoch from (fim - inicio))) / 3600), 2) end from conc)),
    'clientes', jsonb_build_object(
      'atendidas', (select count(distinct cliente_celular) from conc),
      'novas', (select count(*) from (select c.cliente_celular from conc c
                 where not exists (select 1 from public.agendamentos o where o.cliente_celular = c.cliente_celular
                                   and o.status = 'concluido' and not o.demo and o.inicio < v_ini) group by 1) z),
      'reservas_app', (select count(*) from public.agendamentos x where not x.demo and x.criado_por = 'cliente'
                       and x.criado_em >= v_ini and x.criado_em < v_fim),
      'reservas_painel', (select count(*) from public.agendamentos x where not x.demo and x.criado_por = 'admin'
                       and x.criado_em >= v_ini and x.criado_em < v_fim),
      'sumidas', coalesce((select jsonb_agg(jsonb_build_object('nome', nome, 'celular', cel, 'ultimo', ultimo, 'total', total, 'vezes', vezes)
                                            order by total desc)
                 from (select (array_agg(o.cliente_nome order by o.inicio desc))[1] nome, o.cliente_celular cel, max(o.inicio) ultimo,
                              sum(o.valor) total, count(*) vezes
                       from public.agendamentos o where not o.demo and o.status = 'concluido'
                       group by o.cliente_celular
                       having max(o.inicio) < now() - interval '60 days' and max(o.inicio) > now() - interval '240 days'
                          and not exists (select 1 from public.agendamentos f where f.cliente_celular = o.cliente_celular
                                          and f.status in ('confirmado', 'aguardando_sinal', 'aguardando_confirmacao') and f.inicio > now())
                       order by sum(o.valor) desc limit 8) z), '[]'::jsonb),
      'melhores', coalesce((select jsonb_agg(jsonb_build_object('nome', nome, 'celular', cel, 'total', total, 'vezes', vezes) order by total desc)
                 from (select (array_agg(o.cliente_nome order by o.inicio desc))[1] nome, o.cliente_celular cel, sum(o.valor) total, count(*) vezes
                       from public.agendamentos o where not o.demo and o.status = 'concluido' and o.inicio > now() - interval '180 days'
                       group by o.cliente_celular order by sum(o.valor) desc limit 5) z), '[]'::jsonb)),
    'visitas', (select count(*) from public.visitas vv where vv.empresa_id = interno.empresa_atual() and vv.dia >= v_mes and vv.dia < v_prox),
    'cursos', jsonb_build_object(
      'inscricoes', (select count(*) from curso),
      'matriculadas', (select count(*) from curso where status = 'matriculada'),
      'desistiu', (select count(*) from curso where status = 'desistiu'),
      'sem_resposta', (select count(*) from public.inscricoes i where not i.demo and i.status = 'nova'),
      'receita', (select coalesce(sum(turma_valor), 0) from curso where status = 'matriculada'),
      'turmas', coalesce((select jsonb_agg(jsonb_build_object('nome', t.nome, 'inicio', t.data_inicio, 'vagas', t.vagas, 'valor', t.valor,
                            'matriculadas', (select count(*) from public.inscricoes i where i.turma_id = t.id and i.status = 'matriculada' and not i.demo)) order by t.data_inicio)
                 from public.turmas t where not t.demo and t.data_inicio >= v_hoje - 30), '[]'::jsonb))
  ) into r;

  -- receita de curso entra no resultado
  r := r || jsonb_build_object('receita_total', (r->>'faturado')::numeric + (r->'cursos'->>'receita')::numeric);
  r := r || jsonb_build_object('lucro', (r->>'receita_total')::numeric - (r->>'despesas')::numeric - (r->>'comissoes')::numeric);

  -- mês anterior e os últimos 6 meses
  r := r || jsonb_build_object('serie', (
    select jsonb_agg(jsonb_build_object('mes', m, 'faturado', f, 'despesas', d, 'comissoes', c, 'lucro', f - d - c, 'atendimentos', n,
                                        'cancelados', k) order by m)
    from (
      select m::date m,
        coalesce((select sum(x.valor) from public.agendamentos x where not x.demo and x.status = 'concluido'
                  and x.inicio >= (m::timestamp at time zone 'America/Fortaleza') and x.inicio < ((m + interval '1 month')::timestamp at time zone 'America/Fortaleza')), 0)
        + coalesce((select sum(t.valor) from public.inscricoes i join public.turmas t on t.id = i.turma_id where not i.demo and i.status = 'matriculada'
                  and i.criado_em >= (m::timestamp at time zone 'America/Fortaleza') and i.criado_em < ((m + interval '1 month')::timestamp at time zone 'America/Fortaleza')), 0) f,
        coalesce((select sum(dd.valor) from interno.despesas_do_mes(m::date) dd), 0) d,
        coalesce((select round(sum(x.valor * coalesce(q.comissao_pct, 0) / 100), 2) from public.agendamentos x left join public.equipe q on q.id = x.profissional_id
                  where not x.demo and x.status = 'concluido'
                  and x.inicio >= (m::timestamp at time zone 'America/Fortaleza') and x.inicio < ((m + interval '1 month')::timestamp at time zone 'America/Fortaleza')), 0) c,
        (select count(*) from public.agendamentos x where not x.demo and x.status = 'concluido'
                  and x.inicio >= (m::timestamp at time zone 'America/Fortaleza') and x.inicio < ((m + interval '1 month')::timestamp at time zone 'America/Fortaleza')) n,
        (select count(*) from public.agendamentos x where not x.demo and x.status = 'cancelado'
                  and x.inicio >= (m::timestamp at time zone 'America/Fortaleza') and x.inicio < ((m + interval '1 month')::timestamp at time zone 'America/Fortaleza')) k
      from generate_series(v_mes - interval '5 months', v_mes, interval '1 month') g(m)
    ) z));
  return jsonb_build_object('ok', true) || r;
end;
$$;

-- donos (RLS por salão) e quem pode chamar
alter function public.admin_despesas(text, date) owner to app_dono;
alter function public.admin_despesa_salvar(text, jsonb) owner to app_dono;
alter function public.admin_despesa_excluir(text, uuid, date) owner to app_dono;
alter function public.admin_equipe_comissao(text, uuid, numeric) owner to app_dono;
alter function public.admin_resultados(text, date) owner to app_dono;
revoke all on function public.admin_despesas(text, date), public.admin_despesa_salvar(text, jsonb), public.admin_despesa_excluir(text, uuid, date),
  public.admin_equipe_comissao(text, uuid, numeric), public.admin_resultados(text, date) from public;
grant execute on function public.admin_despesas(text, date), public.admin_despesa_salvar(text, jsonb), public.admin_despesa_excluir(text, uuid, date),
  public.admin_equipe_comissao(text, uuid, numeric), public.admin_resultados(text, date) to anon, authenticated;

-- a lista da equipe mostra a comissão
create or replace function pg_temp.trocar(p_fn regprocedure, p_de text, p_para text)
returns void language plpgsql as $$
declare d text := pg_get_functiondef(p_fn);
begin
  if position(p_de in d) = 0 then raise exception 'trecho não encontrado em %: %', p_fn, left(p_de, 80); end if;
  execute replace(d, p_de, p_para);
end;
$$;
select pg_temp.trocar('public.admin_equipe(text)'::regprocedure,
  $x$'id', q.id, 'nome', q.nome,$x$, $x$'id', q.id, 'nome', q.nome, 'comissao_pct', q.comissao_pct,$x$);

-- marca como concluídos os horários confirmados que já terminaram (um toque no painel de resultados)
create or replace function public.admin_concluir_passados(p_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  perform interno.conta_da_sessao(p_token, array['admin', 'master']);
  update public.agendamentos set status = 'concluido', atualizado_em = now()
  where status = 'confirmado' and not demo and fim < now() - interval '2 hours';
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'concluidos', n);
end;
$$;
alter function public.admin_concluir_passados(text) owner to app_dono;
revoke all on function public.admin_concluir_passados(text) from public;
grant execute on function public.admin_concluir_passados(text) to anon, authenticated;
