-- Teste grátis de 7 dias, plano anual (2 meses grátis no 1º ano) e painel do dono da plataforma.

-- 1. colunas ---------------------------------------------------------------------------------------
alter table public.planos add column if not exists preco_anual numeric(10,2);          -- 1º ano
alter table public.planos add column if not exists preco_anual_renova numeric(10,2);   -- renovação
update public.planos set preco_anual = preco * 10 where preco_anual is null;
update public.planos set preco_anual_renova = preco * 11 where preco_anual_renova is null;

alter table public.empresas add column if not exists ciclo text not null default 'mensal';
alter table public.empresas drop constraint if exists empresas_ciclo_check;
alter table public.empresas add constraint empresas_ciclo_check check (ciclo in ('mensal', 'anual'));
alter table public.empresas add column if not exists anual_promo_usado boolean not null default false;
alter table public.empresas add column if not exists nota_master text;

alter table public.cobrancas add column if not exists meses integer not null default 1;
alter table public.cobrancas drop constraint if exists cobrancas_meses_check;
alter table public.cobrancas add constraint cobrancas_meses_check check (meses in (1, 12));

-- 2. preços -----------------------------------------------------------------------------------------
create or replace function interno.json_plano(pl public.planos)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('codigo', pl.codigo, 'nome', pl.nome, 'descricao', pl.descricao, 'preco', pl.preco,
    'preco_anual', coalesce(pl.preco_anual, pl.preco * 10), 'preco_anual_renova', coalesce(pl.preco_anual_renova, pl.preco * 11),
    'profissionais', pl.profissionais, 'extra_profissional', pl.extra_profissional, 'recursos', to_jsonb(pl.recursos));
$$;

-- valor do ano: preço anual (1º ano ou renovação) proporcional aos extras da equipe
create or replace function interno.valor_anual(p_emp uuid, p_plano text)
returns numeric language sql stable security definer set search_path = '' as $$
  select round(
    (case when e.anual_promo_usado then coalesce(pl.preco_anual_renova, pl.preco * 11) else coalesce(pl.preco_anual, pl.preco * 10) end)
    * interno.valor_mensal(e.id, pl.codigo) / nullif(pl.preco, 0), 2)
  from public.empresas e, public.planos pl where e.id = p_emp and pl.codigo = p_plano;
$$;
grant execute on function interno.valor_anual(uuid, text) to app_dono;

-- 3. pagar mensal ou anual -------------------------------------------------------------------------------
create or replace function public.admin_mensalidade_ciclo(p_token text, p_plano text, p_ciclo text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.contas; e public.empresas; c public.cobrancas; pl public.planos;
  v_meses integer := case when p_ciclo = 'anual' then 12 else 1 end;
  v_valor numeric; v_site text; j jsonb;
begin
  v := interno.dona_atual(p_token);
  select * into e from public.empresas where id = interno.empresa_atual();
  select * into pl from public.planos where codigo = coalesce(nullif(p_plano, ''), e.plano) and visivel;
  if not found then return jsonb_build_object('ok', false, 'erro', 'Plano inválido.'); end if;
  if not exists (select 1 from interno.segredos where chave = 'mp_token' and valor <> '') then
    return jsonb_build_object('ok', false, 'erro', 'Pagamento pelo app ainda não está disponível. Fale com a Tons Dellas.');
  end if;
  v_valor := case when v_meses = 12 then interno.valor_anual(e.id, pl.codigo) else interno.valor_mensal(e.id, pl.codigo) end;
  if v_valor is null or v_valor <= 0 then return jsonb_build_object('ok', false, 'erro', 'Valor do plano não configurado.'); end if;

  select * into c from public.cobrancas x
  where x.empresa_id = e.id and x.status = 'pendente' and x.plano = pl.codigo and x.valor = v_valor and x.meses = v_meses
    and x.link is not null and x.criado_em > now() - interval '24 hours'
  order by x.criado_em desc limit 1;
  if found then return jsonb_build_object('ok', true, 'link', c.link, 'id', c.id, 'valor', c.valor, 'meses', c.meses); end if;

  insert into public.cobrancas (empresa_id, plano, valor, meses) values (e.id, pl.codigo, v_valor, v_meses) returning * into c;
  v_site := 'https://' || coalesce(e.dominio, e.slug || '.tonsdellas.com.br');
  j := interno.mp('POST', '/checkout/preferences', jsonb_strip_nulls(jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object(
      'id', 'plano-' || pl.codigo || case when v_meses = 12 then '-anual' else '' end,
      'title', 'Tons Dellas · Plano ' || pl.nome || case when v_meses = 12 then ' · anual (12 meses)' else ' · 1 mês' end,
      'description', 'Assinatura do app ' || e.nome, 'quantity', 1, 'currency_id', 'BRL', 'unit_price', v_valor)),
    'external_reference', c.id::text,
    'payer', case when v.email is not null then jsonb_build_object('email', v.email, 'name', v.nome) else null end,
    'payment_methods', case when v_meses = 12 then jsonb_build_object('installments', 12) else null end,
    'back_urls', jsonb_build_object(
      'success', v_site || '/admin/plano?pagamento=' || c.id,
      'pending', v_site || '/admin/plano?pagamento=' || c.id,
      'failure', v_site || '/admin/plano?pagamento=' || c.id),
    'auto_return', 'approved',
    'statement_descriptor', 'TONSDELLAS',
    'expires', true,
    'expiration_date_to', to_char((now() + interval '3 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.000"Z"'))));
  update public.cobrancas set link = j->>'init_point', mp_preferencia = j->>'id' where id = c.id;
  return jsonb_build_object('ok', true, 'link', j->>'init_point', 'id', c.id, 'valor', v_valor, 'meses', v_meses);
end;
$$;
alter function public.admin_mensalidade_ciclo(text, text, text) owner to app_dono;
revoke all on function public.admin_mensalidade_ciclo(text, text, text) from public;
grant execute on function public.admin_mensalidade_ciclo(text, text, text) to anon, authenticated;

-- 4. fim do teste: quem veio do cadastro sai do ar no dia seguinte (sem carência) -------------------------
create or replace function interno.atualizar_situacoes()
returns void language sql security definer set search_path = '' as $$
  update public.empresas set situacao = 'suspensa', vence_em = coalesce(vence_em, teste_ate)
    where situacao = 'teste' and teste_ate is not null and teste_ate < interno.hoje() and origem = 'cadastro';
  update public.empresas set situacao = 'atrasada', vence_em = coalesce(vence_em, teste_ate)
    where situacao = 'teste' and teste_ate is not null and teste_ate < interno.hoje();
  update public.empresas set situacao = 'atrasada'
    where situacao = 'ativa' and vence_em is not null and vence_em < interno.hoje();
  update public.empresas set situacao = 'suspensa'
    where situacao = 'atrasada' and vence_em is not null and vence_em < interno.hoje() - 7;
$$;

-- avisos no celular da dona: 2 dias antes e no último dia do teste
create or replace function interno.avisos_teste()
returns void language plpgsql security definer set search_path = '' as $$
declare e record; d integer;
begin
  for e in select id, teste_ate from public.empresas where situacao = 'teste' and teste_ate is not null loop
    d := e.teste_ate - interno.hoje();
    if d in (2, 0) then
      perform set_config('app.empresa', e.id::text, true);
      begin
        perform interno.enviar_push(case when d = 0 then 'Seu teste grátis termina hoje' else 'Faltam 2 dias do seu teste grátis' end,
          'Assine para o app continuar no ar para as suas clientes. Leva 1 minuto pelo Mercado Pago.', '/admin/plano', 'teste-' || d);
      exception when others then null;
      end;
    end if;
  end loop;
  perform set_config('app.empresa', '', true);
end;
$$;
select cron.schedule('teste-avisos', '7 13 * * *', 'select interno.avisos_teste()');

-- 5. painel do dono da plataforma ------------------------------------------------------------------------------
create or replace function public.master_painel(p_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_hoje date := interno.hoje();
  v_mes timestamptz := date_trunc('month', now() at time zone 'America/Fortaleza') at time zone 'America/Fortaleza';
begin
  perform interno.so_master(p_token);
  return (
    with e as (
      select x.*, (select c.valor / c.meses from public.cobrancas c where c.empresa_id = x.id and c.status = 'paga'
                   order by c.pago_em desc limit 1) mensal_pago
      from public.empresas x
    )
    select jsonb_build_object('ok', true, 'hoje', v_hoje,
      'total', (select count(*) from e),
      'ativas', (select count(*) from e where situacao = 'ativa'),
      'pagantes', (select count(*) from e where situacao in ('ativa', 'atrasada') and mensal_pago is not null),
      'cortesia', (select count(*) from e where situacao = 'ativa' and mensal_pago is null),
      'em_teste', (select count(*) from e where situacao = 'teste'),
      'teste_acaba_3d', (select count(*) from e where situacao = 'teste' and teste_ate <= v_hoje + 3),
      'atrasadas', (select count(*) from e where situacao = 'atrasada'),
      'suspensas', (select count(*) from e where situacao = 'suspensa'),
      'nunca_pagaram', (select count(*) from e where situacao = 'suspensa' and mensal_pago is null and origem = 'cadastro'),
      'anuais', (select count(*) from e where ciclo = 'anual' and situacao in ('ativa', 'atrasada')),
      'mensais', (select count(*) from e where ciclo = 'mensal' and situacao in ('ativa', 'atrasada') and mensal_pago is not null),
      'mrr', (select coalesce(round(sum(mensal_pago), 2), 0) from e where situacao in ('ativa', 'atrasada') and mensal_pago is not null),
      'receita_mes', (select coalesce(sum(valor), 0) from public.cobrancas where status = 'paga' and pago_em >= v_mes),
      'novos_mes', (select count(*) from e where criado_em >= v_mes),
      'conversao_teste', (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where mensal_pago is not null) / count(*)) end
                          from e where origem = 'cadastro' and teste_ate is not null and teste_ate < v_hoje and teste_ate >= v_hoje - 90),
      'serie', (select jsonb_agg(jsonb_build_object('mes', m,
                  'receita', (select coalesce(sum(c.valor), 0) from public.cobrancas c where c.status = 'paga'
                              and c.pago_em >= (m::timestamp at time zone 'America/Fortaleza') and c.pago_em < ((m + interval '1 month')::timestamp at time zone 'America/Fortaleza')),
                  'novos', (select count(*) from public.empresas x where x.criado_em >= (m::timestamp at time zone 'America/Fortaleza')
                              and x.criado_em < ((m + interval '1 month')::timestamp at time zone 'America/Fortaleza'))) order by m)
                from generate_series(date_trunc('month', v_hoje)::date - interval '5 months', date_trunc('month', v_hoje)::date, interval '1 month') g(m)),
      'testes', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'slug', slug, 'teste_ate', teste_ate, 'dias', teste_ate - v_hoje,
                    'whatsapp', config->>'whatsapp', 'plano', plano,
                    'servicos', (select count(*) from public.servicos_agenda s where s.empresa_id = e.id and s.visivel),
                    'agendamentos', (select count(*) from public.agendamentos a where a.empresa_id = e.id and not a.demo)) order by teste_ate)
                 from e where situacao = 'teste'), '[]'::jsonb),
      'vencendo', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'slug', slug, 'vence_em', vence_em, 'ciclo', ciclo,
                    'situacao', situacao, 'whatsapp', config->>'whatsapp', 'valor', mensal_pago) order by vence_em)
                 from e where situacao in ('ativa', 'atrasada') and vence_em is not null and vence_em <= v_hoje + 7), '[]'::jsonb)
    ) from (select 1) z);
end;
$$;

-- ações rápidas do Master sobre um salão
create or replace function public.master_empresa_acao(p_token text, p_id uuid, p jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e public.empresas; v_hoje date := interno.hoje(); v_dias integer := least(400, greatest(1, coalesce((p->>'dias')::integer, 7)));
  v_acao text := coalesce(p->>'acao', '');
begin
  perform interno.so_master(p_token);
  select * into e from public.empresas where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'erro', 'Salão não encontrado.'); end if;
  if v_acao = 'estender_teste' then
    update public.empresas set situacao = 'teste', ativa = true, teste_ate = greatest(coalesce(teste_ate, v_hoje), v_hoje) + v_dias, atualizado_em = now()
    where id = e.id returning * into e;
  elsif v_acao = 'dar_dias' then
    update public.empresas set situacao = 'ativa', ativa = true, vence_em = greatest(coalesce(vence_em, v_hoje), v_hoje) + v_dias, atualizado_em = now()
    where id = e.id returning * into e;
  elsif v_acao = 'pago_anual' then
    update public.empresas set situacao = 'ativa', ativa = true, ciclo = 'anual', anual_promo_usado = true,
      vence_em = (greatest(coalesce(vence_em, v_hoje), v_hoje) + interval '12 months')::date, atualizado_em = now()
    where id = e.id returning * into e;
  elsif v_acao = 'pago_mensal' then
    update public.empresas set situacao = 'ativa', ativa = true, ciclo = 'mensal',
      vence_em = (greatest(coalesce(vence_em, v_hoje), v_hoje) + interval '1 month')::date, atualizado_em = now()
    where id = e.id returning * into e;
  elsif v_acao = 'suspender' then
    update public.empresas set situacao = 'suspensa', atualizado_em = now() where id = e.id returning * into e;
  elsif v_acao = 'reativar' then
    update public.empresas set ativa = true, atualizado_em = now(),
      situacao = case when teste_ate is not null and teste_ate >= v_hoje and (vence_em is null or vence_em < v_hoje) then 'teste'
                      when vence_em is not null and vence_em >= v_hoje then 'ativa'
                      else 'ativa' end,
      vence_em = case when (vence_em is null or vence_em < v_hoje) and not (teste_ate is not null and teste_ate >= v_hoje) then v_hoje + v_dias else vence_em end
    where id = e.id returning * into e;
  elsif v_acao = 'nota' then
    update public.empresas set nota_master = nullif(left(btrim(coalesce(p->>'nota', '')), 500), '') where id = e.id returning * into e;
  else
    return jsonb_build_object('ok', false, 'erro', 'Ação inválida.');
  end if;
  return jsonb_build_object('ok', true, 'situacao', e.situacao, 'teste_ate', e.teste_ate, 'vence_em', e.vence_em, 'ciclo', e.ciclo, 'nota', e.nota_master);
end;
$$;
revoke all on function public.master_painel(text), public.master_empresa_acao(text, uuid, jsonb) from public;
grant execute on function public.master_painel(text), public.master_empresa_acao(text, uuid, jsonb) to anon, authenticated;

-- 6. ajustes em funções longas ---------------------------------------------------------------------------------------
create or replace function pg_temp.trocar(p_fn regprocedure, p_de text, p_para text)
returns void language plpgsql as $$
declare d text := pg_get_functiondef(p_fn);
begin
  if position(p_de in d) = 0 then raise exception 'trecho não encontrado em %: %', p_fn, left(p_de, 80); end if;
  execute replace(d, p_de, p_para);
end;
$$;

-- pagamento: estende 1 ou 12 meses e marca o ciclo
select pg_temp.trocar('interno.cobranca_paga(uuid, text, text)'::regprocedure,
  $x$v_ate := (v_base + interval '1 month')::date + v_credito;$x$,
  $x$v_ate := (v_base + make_interval(months => coalesce(c.meses, 1)))::date + v_credito;$x$);
select pg_temp.trocar('interno.cobranca_paga(uuid, text, text)'::regprocedure,
  $x$update public.empresas set plano = c.plano, situacao = 'ativa', ativa = true, vence_em = v_ate, atualizado_em = now()$x$,
  $x$update public.empresas set plano = c.plano, situacao = 'ativa', ativa = true, vence_em = v_ate, atualizado_em = now(),
    ciclo = case when coalesce(c.meses, 1) = 12 then 'anual' else 'mensal' end,
    anual_promo_usado = anual_promo_usado or coalesce(c.meses, 1) = 12$x$);

-- Meu plano: valores anuais e ciclo
select pg_temp.trocar('public.admin_mensalidade_info(text)'::regprocedure,
  $x$'valores', (select jsonb_object_agg(p.codigo, interno.valor_mensal(e.id, p.codigo)) from public.planos p where p.visivel),$x$,
  $x$'valores', (select jsonb_object_agg(p.codigo, interno.valor_mensal(e.id, p.codigo)) from public.planos p where p.visivel),
    'valores_anual', (select jsonb_object_agg(p.codigo, interno.valor_anual(e.id, p.codigo)) from public.planos p where p.visivel),
    'ciclo', e.ciclo, 'anual_promo_usado', e.anual_promo_usado,$x$);
select pg_temp.trocar('public.admin_mensalidade_info(text)'::regprocedure,
  $x$'forma', c.forma)$x$, $x$'forma', c.forma, 'meses', c.meses)$x$);
select pg_temp.trocar('public.admin_meu_plano(text)'::regprocedure,
  $x$'situacao', e.situacao, 'teste_ate', e.teste_ate, 'vence_em', e.vence_em,$x$,
  $x$'situacao', e.situacao, 'teste_ate', e.teste_ate, 'vence_em', e.vence_em, 'ciclo', e.ciclo, 'origem', e.origem,$x$);

-- cadastro: 7 dias grátis, um teste por WhatsApp
select pg_temp.trocar('public.criar_salao(jsonb)'::regprocedure,
  $x$v_iph text; e public.empresas;$x$, $x$v_iph text; v_teste boolean; e public.empresas;$x$);
select pg_temp.trocar('public.criar_salao(jsonb)'::regprocedure,
  $x$  begin
    insert into public.empresas (slug, nome, modulos, config, paleta, plano, origem, situacao, teste_ate)$x$,
  $x$  v_teste := not exists (select 1 from public.empresas x where x.config->>'whatsapp' = v_whats);
  begin
    insert into public.empresas (slug, nome, modulos, config, paleta, plano, origem, situacao, teste_ate)$x$);
select pg_temp.trocar('public.criar_salao(jsonb)'::regprocedure,
  $x$v_paleta, v_plano, 'cadastro', 'suspensa', null)$x$,
  $x$v_paleta, v_plano, 'cadastro', case when v_teste then 'teste' else 'suspensa' end, case when v_teste then interno.hoje() + 7 end)$x$);
select pg_temp.trocar('public.criar_salao(jsonb)'::regprocedure,
  $x$'pagar', true)$x$, $x$'pagar', not v_teste, 'teste', v_teste)$x$);

-- Master: preços anuais e mais dados por salão
select pg_temp.trocar('public.master_planos_salvar(text, jsonb)'::regprocedure,
  $x$update public.planos set preco = greatest(0, replace(x->>'preco', ',', '.')::numeric) where codigo = x->>'codigo';$x$,
  $x$update public.planos set preco = greatest(0, replace(x->>'preco', ',', '.')::numeric),
      preco_anual = coalesce(greatest(0, nullif(replace(coalesce(x->>'preco_anual', ''), ',', '.'), '')::numeric), preco_anual),
      preco_anual_renova = coalesce(greatest(0, nullif(replace(coalesce(x->>'preco_anual_renova', ''), ',', '.'), '')::numeric), preco_anual_renova)
    where codigo = x->>'codigo';$x$);
select pg_temp.trocar('public.master_empresas(text)'::regprocedure,
  $x$'servicos', (select count(*) from public.servicos_agenda s where s.empresa_id = e.id and s.visivel))$x$,
  $x$'servicos', (select count(*) from public.servicos_agenda s where s.empresa_id = e.id and s.visivel),
      'ciclo', e.ciclo, 'origem', e.origem, 'whatsapp', e.config->>'whatsapp', 'nota', e.nota_master,
      'ultimo_acesso', (select max(s.criado_em) from public.sessoes s join public.contas c on c.id = s.conta_id where c.empresa_id = e.id and c.papel = 'admin'),
      'visitas_30d', (select count(*) from public.visitas v where v.empresa_id = e.id and v.dia > interno.hoje() - 30),
      'pago_total', (select coalesce(sum(c.valor), 0) from public.cobrancas c where c.empresa_id = e.id and c.status = 'paga'),
      'valor_mensal', interno.valor_mensal(e.id, e.plano))$x$);
