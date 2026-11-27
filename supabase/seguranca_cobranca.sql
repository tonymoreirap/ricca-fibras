-- =====================================================================
-- REVISÃO DE SEGURANÇA DA COBRANÇA (27/11/2026)
--  1. dona de um salão não lê nem mexe na mensalidade de outro salão
--  2. salão fora do ar não recebe agendamento nem pela API
--  3. pagamento estornado ou contestado (chargeback) tira o mês de volta
--  4. só vale pagamento aprovado em reais e com o valor líquido completo
--  5. troca de plano no meio do mês: o que sobrou vira dias no plano novo
--     (subir de plano não sai mais barato; pagar atrasado conta da data do vencimento)
--  6. quem pagou duas vezes por engano tem os dois pagamentos contados
-- =====================================================================

alter table public.cobrancas add column if not exists estornada_em timestamptz;

-- 1) sessão de dona que confere o salão do endereço (o Master passa sempre)
create or replace function interno.dona_atual(p_token text) returns public.contas
language plpgsql stable security definer set search_path = '' as $$
declare v public.contas;
begin
  v := interno.conta_da_sessao(p_token, array['admin', 'master']);
  if v.papel <> 'master' and v.empresa_id is distinct from interno.empresa_atual() then
    raise exception 'Sessão expirada. Entre novamente.';
  end if;
  return v;
end;
$$;

do $$
declare f text; d text;
begin
  foreach f in array array['public.admin_mensalidade_info(text)', 'public.admin_mensalidade(text,text)', 'public.admin_mensalidade_verificar(text)', 'public.admin_meu_plano(text)'] loop
    d := pg_get_functiondef(f::regprocedure);
    d := replace(d, 'v := interno.conta_da_sessao(p_token, array[''admin'', ''master'']);', 'v := interno.dona_atual(p_token);');
    d := replace(d, 'perform interno.conta_da_sessao(p_token, array[''admin'', ''master'']);', 'perform interno.dona_atual(p_token);');
    if position('dona_atual' in d) = 0 then raise exception 'troca falhou em %', f; end if;
    execute d;
  end loop;
end $$;

-- 2) salão suspenso (ou estreando sem pagar) não agenda
do $$
declare d text := pg_get_functiondef('interno.inserir_agendamento_eq(text,timestamptz,text,text,uuid,text,text,uuid)'::regprocedure);
begin
  d := replace(d, E'  v_max := case when v_admin then interval ''180 days'' else interval ''60 days'' end;',
    E'  if (select x.situacao from public.empresas x where x.id = interno.empresa_atual()) = ''suspensa'' then\n    raise exception ''A agenda deste salão está fora do ar no momento.'';\n  end if;\n  v_max := case when v_admin then interval ''180 days'' else interval ''60 days'' end;');
  if position('fora do ar no momento' in d) = 0 then raise exception 'troca inserir falhou'; end if;
  execute d;
end $$;
revoke execute on function public.criar_agendamento(text, timestamptz, text, text) from public, anon, authenticated;

-- 5) e 6) marca paga e renova
create or replace function interno.cobranca_paga(p_id uuid, p_pagamento text, p_forma text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  c public.cobrancas; e public.empresas; v_hoje date := interno.hoje();
  v_base date; v_credito integer := 0; v_ate date; v_antigo numeric; v_novo numeric;
begin
  select * into c from public.cobrancas
  where id = p_id and (status = 'pendente' or (status = 'cancelada' and estornada_em is null)) for update;
  if not found then return false; end if;
  select * into e from public.empresas where id = c.empresa_id for update;

  if e.situacao = 'ativa' and e.vence_em is not null and e.vence_em > v_hoje and e.plano is distinct from c.plano then
    -- troca de plano: os dias que sobraram do plano antigo viram dias no plano novo, pelo valor
    v_antigo := coalesce(interno.valor_mensal(e.id, e.plano), 0);
    v_novo := coalesce(interno.valor_mensal(e.id, c.plano), 0);
    if v_novo > 0 then v_credito := floor((e.vence_em - v_hoje) * v_antigo / v_novo); end if;
    v_base := v_hoje;
  elsif e.situacao = 'teste' then
    v_base := greatest(v_hoje, coalesce(e.teste_ate, v_hoje));
  elsif e.situacao in ('ativa', 'atrasada') and e.vence_em is not null and e.vence_em >= v_hoje - 7 then
    -- renovação (em dia ou nos 7 dias de tolerância): conta da data do vencimento
    v_base := e.vence_em;
  else
    -- estreia ou volta de suspensão: começa hoje
    v_base := v_hoje;
  end if;
  v_ate := (v_base + interval '1 month')::date + v_credito;

  update public.cobrancas set status = 'paga', mp_pagamento = p_pagamento, forma = p_forma, pago_em = now(), valido_ate = v_ate
  where id = p_id;
  update public.empresas set plano = c.plano, situacao = 'ativa', ativa = true, vence_em = v_ate, atualizado_em = now()
  where id = c.empresa_id;
  update public.cobrancas set status = 'cancelada' where empresa_id = c.empresa_id and status = 'pendente' and id <> p_id;
  return true;
end;
$$;

-- 4) só vale aprovado, em reais, com o valor líquido completo
create or replace function interno.mp_conferir(p_id uuid) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare c public.cobrancas; j jsonb; x jsonb;
begin
  select * into c from public.cobrancas where id = p_id;
  if not found then return false; end if;
  if c.status = 'paga' then return true; end if;
  if c.estornada_em is not null then return false; end if;
  j := interno.mp('GET', '/v1/payments/search?sort=date_created&criteria=desc&external_reference=' || c.id::text);
  for x in select * from jsonb_array_elements(coalesce(j->'results', '[]'::jsonb)) loop
    if x->>'status' = 'approved'
       and coalesce(x->>'currency_id', 'BRL') = 'BRL'
       and x->>'external_reference' = c.id::text
       and (x->>'transaction_amount')::numeric - coalesce((x->>'transaction_amount_refunded')::numeric, 0) >= c.valor - 0.01 then
      return interno.cobranca_paga(c.id, x->>'id', x->>'payment_type_id');
    end if;
  end loop;
  return false;
end;
$$;

-- confere os abertos e também os cancelados recentes (quem pagou dois links)
create or replace function interno.conciliar_cobrancas() returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare c record; n integer := 0;
begin
  update public.cobrancas set status = 'cancelada' where status = 'pendente' and criado_em < now() - interval '45 days';
  if not exists (select 1 from interno.segredos where chave = 'mp_token' and valor <> '') then return 0; end if;
  for c in select id from public.cobrancas
           where (status = 'pendente' or (status = 'cancelada' and estornada_em is null and link is not null and criado_em > now() - interval '10 days'))
           order by criado_em desc limit 60 loop
    begin
      if interno.mp_conferir(c.id) then n := n + 1; end if;
    exception when others then null;
    end;
  end loop;
  return n;
end;
$$;

-- 3) estorno ou contestação: o mês pago sai do vencimento
create or replace function interno.mp_revisar_pagas() returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare c record; j jsonb; n integer := 0; v_hoje date := interno.hoje(); e public.empresas;
begin
  if not exists (select 1 from interno.segredos where chave = 'mp_token' and valor <> '') then return 0; end if;
  for c in select * from public.cobrancas
           where status = 'paga' and mp_pagamento is not null and mp_pagamento ~ '^[0-9]+$' and pago_em > now() - interval '180 days'
           order by pago_em desc limit 300 loop
    begin
      e := null;
      j := interno.mp('GET', '/v1/payments/' || c.mp_pagamento);
      if j->>'status' in ('refunded', 'charged_back', 'cancelled')
         or (j->>'transaction_amount')::numeric - coalesce((j->>'transaction_amount_refunded')::numeric, 0) < c.valor - 0.01 then
        update public.cobrancas set status = 'cancelada', estornada_em = now() where id = c.id;
        update public.empresas set vence_em = (vence_em - interval '1 month')::date, atualizado_em = now()
        where id = c.empresa_id and vence_em is not null
        returning * into e;
        if e.id is not null then
          update public.empresas set situacao = case when e.vence_em < v_hoje - 7 then 'suspensa'
                                                     when e.vence_em < v_hoje then 'atrasada' else situacao end
          where id = e.id;
        end if;
        n := n + 1;
      end if;
    exception when others then null;
    end;
  end loop;
  return n;
end;
$$;

select cron.schedule('cobrancas-estornos', '40 7 * * *', $$select interno.mp_revisar_pagas()$$);

-- Master vê quantos estornos houve
do $$
declare d text := pg_get_functiondef('public.master_cobranca_info(text)'::regprocedure);
begin
  d := replace(d, E'    ''mes'', coalesce(', E'    ''estornadas'', (select count(*) from public.cobrancas where estornada_em > now() - interval ''90 days''),\n    ''mes'', coalesce(');
  if position('estornadas' in d) = 0 then raise exception 'troca master_cobranca_info falhou'; end if;
  execute d;
end $$;
