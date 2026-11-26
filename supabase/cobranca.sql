-- =====================================================================
-- MENSALIDADE PELO MERCADO PAGO
--  * Tony cola a chave do Mercado Pago no Master (fica num cofre do banco)
--  * a dona toca em "Pagar" e cai no checkout do Mercado Pago (Pix, cartão, boleto)
--  * o banco confere o pagamento no Mercado Pago (na volta e a cada 20 min)
--    e, pago, renova o plano por 1 mês sozinho
-- =====================================================================

-- cofre: só funções do dono do banco leem (o app nunca vê a chave)
create table if not exists interno.segredos (chave text primary key, valor text not null);
revoke all on interno.segredos from public, anon, authenticated, app_dono;

insert into interno.parametros (chave, valor) values ('mp_conta', '') on conflict do nothing;

create table public.cobrancas (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  plano         text not null references public.planos(codigo),
  valor         numeric(10,2) not null check (valor > 0),
  status        text not null default 'pendente' check (status in ('pendente', 'paga', 'cancelada')),
  link          text,
  mp_preferencia text,
  mp_pagamento  text,
  forma         text,
  pago_em       timestamptz,
  valido_ate    date,
  criado_em     timestamptz not null default now()
);
create index cobrancas_empresa on public.cobrancas (empresa_id, criado_em desc);
create index cobrancas_pendentes on public.cobrancas (criado_em) where status = 'pendente';
alter table public.cobrancas enable row level security;
revoke all on public.cobrancas from anon, authenticated;

-- chamada à API do Mercado Pago
create or replace function interno.mp(p_metodo text, p_caminho text, p_corpo jsonb default null, p_chave text default null)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_chave text := p_chave; r record;
begin
  if v_chave is null then select valor into v_chave from interno.segredos where chave = 'mp_token'; end if;
  if coalesce(v_chave, '') = '' then raise exception 'Cobrança pelo Mercado Pago ainda não foi ativada.'; end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '9000');
  select status, content into r from extensions.http((
    p_metodo, 'https://api.mercadopago.com' || p_caminho,
    array[extensions.http_header('Authorization', 'Bearer ' || v_chave)],
    'application/json', case when p_corpo is null then null else p_corpo::text end)::extensions.http_request);
  if r.status = 401 or r.status = 403 then raise exception 'O Mercado Pago recusou a chave de acesso. Confira no Master.'; end if;
  if r.status >= 300 then raise exception 'O Mercado Pago não respondeu como esperado (código %). Tente de novo.', r.status; end if;
  return r.content::jsonb;
end;
$$;

-- valor do mês: plano + profissionais extras
create or replace function interno.valor_mensal(p_emp uuid, p_plano text) returns numeric
language sql stable security definer set search_path = '' as $$
  select pl.preco + case when pl.extra_profissional > 0 then e.profissionais_extra * pl.extra_profissional else 0 end
  from public.empresas e, public.planos pl where e.id = p_emp and pl.codigo = p_plano;
$$;

-- marca paga e renova o salão
create or replace function interno.cobranca_paga(p_id uuid, p_pagamento text, p_forma text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare c public.cobrancas; e public.empresas; v_base date; v_ate date;
begin
  select * into c from public.cobrancas where id = p_id and status = 'pendente' for update;
  if not found then return false; end if;
  select * into e from public.empresas where id = c.empresa_id for update;
  -- conta a partir do que vier por último: hoje, o vencimento atual ou o fim do teste
  v_base := greatest(interno.hoje(), coalesce(e.vence_em, interno.hoje()),
                     case when e.situacao = 'teste' then coalesce(e.teste_ate, interno.hoje()) else interno.hoje() end);
  v_ate := (v_base + interval '1 month')::date;
  update public.cobrancas set status = 'paga', mp_pagamento = p_pagamento, forma = p_forma, pago_em = now(), valido_ate = v_ate
  where id = p_id;
  update public.empresas set plano = c.plano, situacao = 'ativa', ativa = true, vence_em = v_ate, atualizado_em = now()
  where id = c.empresa_id;
  -- pagamentos antigos ainda abertos deste salão deixam de valer
  update public.cobrancas set status = 'cancelada' where empresa_id = c.empresa_id and status = 'pendente' and id <> p_id;
  return true;
end;
$$;

-- procura no Mercado Pago um pagamento aprovado desta cobrança
create or replace function interno.mp_conferir(p_id uuid) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare c public.cobrancas; j jsonb; x jsonb;
begin
  select * into c from public.cobrancas where id = p_id;
  if not found or c.status <> 'pendente' then return coalesce(c.status = 'paga', false); end if;
  j := interno.mp('GET', '/v1/payments/search?sort=date_created&criteria=desc&external_reference=' || c.id::text);
  for x in select * from jsonb_array_elements(coalesce(j->'results', '[]'::jsonb)) loop
    if x->>'status' = 'approved' and (x->>'transaction_amount')::numeric >= c.valor - 0.01
       and x->>'external_reference' = c.id::text then
      return interno.cobranca_paga(c.id, x->>'id', x->>'payment_type_id');
    end if;
  end loop;
  return false;
end;
$$;

-- a cada 20 minutos: confere o que está aberto; abertos há mais de 45 dias são cancelados
create or replace function interno.conciliar_cobrancas() returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare c record; n integer := 0;
begin
  update public.cobrancas set status = 'cancelada' where status = 'pendente' and criado_em < now() - interval '45 days';
  if not exists (select 1 from interno.segredos where chave = 'mp_token' and valor <> '') then return 0; end if;
  for c in select id from public.cobrancas where status = 'pendente' order by criado_em desc limit 40 loop
    begin
      if interno.mp_conferir(c.id) then n := n + 1; end if;
    exception when others then null; -- tenta de novo na próxima rodada
    end;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- dona
-- ---------------------------------------------------------------------
-- situação da mensalidade: valor, se dá para pagar pelo app e o histórico
create or replace function public.admin_mensalidade_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.contas; e public.empresas;
begin
  v := interno.conta_da_sessao(p_token, array['admin', 'master']);
  select * into e from public.empresas where id = interno.empresa_atual();
  return jsonb_build_object(
    'ok', true,
    'online', exists (select 1 from interno.segredos where chave = 'mp_token' and valor <> ''),
    'valores', (select jsonb_object_agg(p.codigo, interno.valor_mensal(e.id, p.codigo)) from public.planos p where p.visivel),
    'pendente', (select c.id from public.cobrancas c where c.empresa_id = e.id and c.status = 'pendente' order by c.criado_em desc limit 1),
    'historico', coalesce((select jsonb_agg(jsonb_build_object('plano', c.plano, 'valor', c.valor, 'pago_em', c.pago_em,
                                   'valido_ate', c.valido_ate, 'forma', c.forma) order by c.pago_em desc)
                           from (select * from public.cobrancas c where c.empresa_id = e.id and c.status = 'paga'
                                 order by c.pago_em desc limit 12) c), '[]'::jsonb));
end;
$$;

-- abre o pagamento de 1 mês do plano escolhido e devolve o link do Mercado Pago
create or replace function public.admin_mensalidade(p_token text, p_plano text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v public.contas; e public.empresas; c public.cobrancas; pl public.planos;
  v_valor numeric; v_site text; j jsonb;
begin
  v := interno.conta_da_sessao(p_token, array['admin', 'master']);
  select * into e from public.empresas where id = interno.empresa_atual();
  select * into pl from public.planos where codigo = coalesce(nullif(p_plano, ''), e.plano) and visivel;
  if not found then return jsonb_build_object('ok', false, 'erro', 'Plano inválido.'); end if;
  if not exists (select 1 from interno.segredos where chave = 'mp_token' and valor <> '') then
    return jsonb_build_object('ok', false, 'erro', 'Pagamento pelo app ainda não está disponível. Fale com a Tons Dellas.');
  end if;
  v_valor := interno.valor_mensal(e.id, pl.codigo);

  -- reaproveita o link aberto nas últimas 24 h para o mesmo plano e valor
  select * into c from public.cobrancas x
  where x.empresa_id = e.id and x.status = 'pendente' and x.plano = pl.codigo and x.valor = v_valor
    and x.link is not null and x.criado_em > now() - interval '24 hours'
  order by x.criado_em desc limit 1;
  if found then return jsonb_build_object('ok', true, 'link', c.link, 'id', c.id, 'valor', c.valor); end if;

  insert into public.cobrancas (empresa_id, plano, valor) values (e.id, pl.codigo, v_valor) returning * into c;
  v_site := 'https://' || coalesce(e.dominio, e.slug || '.tonsdellas.com.br');
  j := interno.mp('POST', '/checkout/preferences', jsonb_strip_nulls(jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object(
      'id', 'plano-' || pl.codigo, 'title', 'Tons Dellas · Plano ' || pl.nome || ' · 1 mês',
      'description', 'Mensalidade do app ' || e.nome, 'quantity', 1, 'currency_id', 'BRL', 'unit_price', v_valor)),
    'external_reference', c.id::text,
    'payer', case when v.email is not null then jsonb_build_object('email', v.email, 'name', v.nome) else null end,
    'back_urls', jsonb_build_object(
      'success', v_site || '/admin/plano?pagamento=' || c.id,
      'pending', v_site || '/admin/plano?pagamento=' || c.id,
      'failure', v_site || '/admin/plano?pagamento=' || c.id),
    'auto_return', 'approved',
    'statement_descriptor', 'TONSDELLAS',
    'expires', true,
    'expiration_date_to', to_char((now() + interval '3 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.000"Z"'))));
  update public.cobrancas set link = j->>'init_point', mp_preferencia = j->>'id' where id = c.id;
  return jsonb_build_object('ok', true, 'link', j->>'init_point', 'id', c.id, 'valor', v_valor);
end;
$$;

-- na volta do Mercado Pago: confere se já pagou
create or replace function public.admin_mensalidade_verificar(p_token text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v public.contas; e public.empresas; c record; v_pago boolean := false;
begin
  v := interno.conta_da_sessao(p_token, array['admin', 'master']);
  for c in select x.id from public.cobrancas x where x.empresa_id = interno.empresa_atual() and x.status = 'pendente'
           order by x.criado_em desc limit 5 loop
    begin
      if interno.mp_conferir(c.id) then v_pago := true; end if;
    exception when others then null;
    end;
  end loop;
  select * into e from public.empresas where id = interno.empresa_atual();
  return jsonb_build_object('ok', true, 'pago', v_pago or exists (
      select 1 from public.cobrancas x where x.empresa_id = e.id and x.status = 'paga' and x.pago_em > now() - interval '1 hour'),
    'situacao', e.situacao, 'vence_em', e.vence_em, 'plano', e.plano);
end;
$$;

-- ---------------------------------------------------------------------
-- master
-- ---------------------------------------------------------------------
create or replace function public.master_cobranca_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform interno.so_master(p_token);
  return jsonb_build_object('ok', true,
    'ativa', exists (select 1 from interno.segredos where chave = 'mp_token' and valor <> ''),
    'conta', (select nullif(valor, '') from interno.parametros where chave = 'mp_conta'),
    'teste', exists (select 1 from interno.segredos where chave = 'mp_token' and valor like 'TEST-%'),
    'recebidas', coalesce((select jsonb_agg(jsonb_build_object('empresa', e.nome, 'plano', c.plano, 'valor', c.valor,
                                   'pago_em', c.pago_em, 'forma', c.forma) order by c.pago_em desc)
                           from (select * from public.cobrancas where status = 'paga' order by pago_em desc limit 20) c
                           join public.empresas e on e.id = c.empresa_id), '[]'::jsonb),
    'mes', coalesce((select sum(valor) from public.cobrancas where status = 'paga'
                     and pago_em >= date_trunc('month', now() at time zone 'America/Fortaleza') at time zone 'America/Fortaleza'), 0));
end;
$$;

-- p = { chave }  (vazio + desligar = true remove)
create or replace function public.master_cobranca_salvar(p_token text, p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_chave text := btrim(coalesce(p->>'chave', '')); j jsonb; v_conta text;
begin
  perform interno.so_master(p_token);
  if coalesce((p->>'desligar')::boolean, false) then
    delete from interno.segredos where chave = 'mp_token';
    update interno.parametros set valor = '' where chave = 'mp_conta';
    return public.master_cobranca_info(p_token);
  end if;
  if v_chave !~ '^(APP_USR|TEST)-[A-Za-z0-9-]{20,}$' then
    return jsonb_build_object('ok', false, 'erro', 'Cole o "Access Token" do Mercado Pago (começa com APP_USR-).');
  end if;
  begin
    j := interno.mp('GET', '/users/me', null, v_chave);
  exception when others then
    return jsonb_build_object('ok', false, 'erro', 'O Mercado Pago não aceitou essa chave. Confira se copiou o Access Token inteiro.');
  end;
  v_conta := coalesce(nullif(btrim(coalesce(j->>'first_name', '') || ' ' || coalesce(j->>'last_name', '')), ''), j->>'nickname')
             || coalesce(' · ' || (j->>'email'), '');
  insert into interno.segredos (chave, valor) values ('mp_token', v_chave)
  on conflict (chave) do update set valor = excluded.valor;
  update interno.parametros set valor = coalesce(v_conta, 'conta conectada') where chave = 'mp_conta';
  return public.master_cobranca_info(p_token);
end;
$$;

revoke all on function public.admin_mensalidade_info(text), public.admin_mensalidade(text, text),
  public.admin_mensalidade_verificar(text), public.master_cobranca_info(text), public.master_cobranca_salvar(text, jsonb) from public;
grant execute on function public.admin_mensalidade_info(text), public.admin_mensalidade(text, text),
  public.admin_mensalidade_verificar(text), public.master_cobranca_info(text), public.master_cobranca_salvar(text, jsonb)
  to anon, authenticated;
revoke all on function interno.mp(text, text, jsonb, text) from public, app_dono;

select cron.schedule('cobrancas-conciliar', '*/20 * * * *', $$select interno.conciliar_cobrancas()$$);
