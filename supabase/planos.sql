-- =====================================================================
-- PLANOS: Essencial, Profissional e Salão
-- O plano de cada salão define os recursos. As travas ficam no banco,
-- então nenhum recurso de fora do plano funciona, mesmo por outro caminho.
-- =====================================================================

create table if not exists public.planos (
  codigo        text primary key,
  nome          text not null,
  descricao     text not null default '',
  preco         numeric(10,2) not null,
  profissionais integer not null,
  extra_profissional numeric(10,2),
  recursos      text[] not null,
  ordem         integer not null default 0,
  visivel       boolean not null default true
);
alter table public.planos enable row level security;
revoke all on public.planos from anon, authenticated;
grant select on public.planos to app_dono;
create policy planos_ler on public.planos for select to app_dono using (true);

insert into public.planos (codigo, nome, descricao, preco, profissionais, extra_profissional, recursos, ordem) values
  ('essencial', 'Essencial', 'Para quem está começando ou atende sozinha.', 59, 1, null,
   array['agenda'], 1),
  ('profissional', 'Profissional', 'Para estúdios que querem automatizar e vender mais.', 119, 3, null,
   array['agenda', 'push', 'resumo', 'promocoes', 'cor_livre', 'natal'], 2),
  ('salao', 'Salão', 'Marca própria completa, curso e certificados.', 229, 10, 20,
   array['agenda', 'push', 'resumo', 'promocoes', 'cor_livre', 'natal', 'curso', 'rede', 'dominio', 'sem_assinatura'], 3)
on conflict (codigo) do nothing;

alter table public.empresas add column if not exists plano text not null default 'essencial' references public.planos(codigo);
alter table public.empresas add column if not exists situacao text not null default 'teste';
alter table public.empresas add column if not exists teste_ate date default ((now() at time zone 'America/Fortaleza')::date + 30);
alter table public.empresas add column if not exists vence_em date;
alter table public.empresas add column if not exists cortesias text[] not null default '{}';
do $$ begin
  alter table public.empresas add constraint empresas_situacao_check check (situacao in ('teste', 'ativa', 'atrasada', 'suspensa'));
exception when duplicate_object then null; end $$;

-- a Rica fica com tudo, sem vencimento
update public.empresas set plano = 'salao', situacao = 'ativa', teste_ate = null, vence_em = null where slug = 'rica';

insert into interno.parametros (chave, valor) values ('vendas_whatsapp', '') on conflict do nothing;

-- recursos que valem hoje para a empresa: plano + teste (dá o Profissional) + cortesias
create or replace function interno.recursos_empresa(p_emp uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array(select distinct x from unnest(
           pl.recursos
           || case when e.situacao = 'teste' and coalesce(e.teste_ate, interno.hoje()) >= interno.hoje()
                   then (select recursos from public.planos where codigo = 'profissional') else '{}'::text[] end
           || e.cortesias) x order by x), '{}')
  from public.empresas e join public.planos pl on pl.codigo = e.plano
  where e.id = p_emp;
$$;

create or replace function interno.tem_recurso(p_recurso text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(p_recurso = any(interno.recursos_empresa(interno.empresa_atual())), false);
$$;

create or replace function interno.exigir_recurso(p_recurso text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not interno.tem_recurso(p_recurso) then
    raise exception '%', case p_recurso
      when 'push' then 'Avisos no celular fazem parte do plano Profissional.'
      when 'promocoes' then 'Promoções fazem parte do plano Profissional.'
      when 'cor_livre' then 'A cor livre da marca faz parte do plano Profissional.'
      when 'curso' then 'Curso e turmas fazem parte do plano Salão.'
      when 'rede' then 'A rede de certificadas faz parte do plano Salão.'
      else 'Este recurso não faz parte do seu plano.' end;
  end if;
end;
$$;
grant execute on function interno.recursos_empresa(uuid), interno.tem_recurso(text), interno.exigir_recurso(text) to app_dono;

-- trava no início das funções do app
do $$
declare
  alvo record; d text;
begin
  for alvo in select * from (values
      ('public.admin_push_salvar(text, jsonb)', 'perform interno.exigir_recurso(''push'');'),
      ('public.admin_push_teste(text)', 'perform interno.exigir_recurso(''push'');'),
      ('public.admin_promocao_salvar(text, jsonb)', 'perform interno.exigir_recurso(''promocoes'');'),
      ('public.admin_turma_salvar(text, jsonb)', 'perform interno.exigir_recurso(''curso'');'),
      ('public.curso_inscrever(text, uuid, text, text, text, text, text)', 'perform interno.exigir_recurso(''curso'');'),
      ('public.admin_profissional_salvar(text, jsonb)', 'perform interno.exigir_recurso(''rede'');'),
      ('public.curso_publico(text)', 'if not interno.tem_recurso(''curso'') then return ''[]''::jsonb; end if;'),
      ('public.rede_publica(text)', 'if not interno.tem_recurso(''rede'') then return ''[]''::jsonb; end if;'),
      ('interno.enviar_push(text, text, text, text, uuid)', 'if not interno.tem_recurso(''push'') then return; end if;')
    ) as t(fn, trava)
  loop
    d := pg_get_functiondef(alvo.fn::regprocedure);
    if position(alvo.trava in d) > 0 then continue; end if;
    if d !~ E'\nbegin\n' then raise exception 'sem begin em %', alvo.fn; end if;
    d := regexp_replace(d, E'\nbegin\n', E'\nbegin\n  ' || alvo.trava || E'\n');
    execute d;
  end loop;

  -- cor livre só com o recurso
  d := pg_get_functiondef('public.admin_empresa_salvar(text, jsonb)'::regprocedure);
  if position('cor_livre' in d) = 0 then
    d := replace(d, 'cor_principal = nullif(p->>''cor_principal'', '''')',
      'cor_principal = case when interno.tem_recurso(''cor_livre'') then nullif(p->>''cor_principal'', '''') end');
    if position('cor_livre' in d) = 0 then raise exception 'trecho da cor não encontrado'; end if;
    execute d;
  end if;
end $$;

-- promoções fora do plano não aparecem nem mudam preço
create or replace function interno.promo_do_servico(p_servico text) returns public.promocoes
language sql stable security definer set search_path = '' as $$
  select p.* from public.promocoes p
  where p.servico = p_servico and p.visivel and p.preco_promo is not null
    and interno.hoje() between p.inicio and p.fim
    and interno.tem_recurso('promocoes')
  order by p.preco_promo limit 1;
$$;

create or replace function public.promocoes_publicas() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(interno.json_promocao(p) - 'visivel' - 'situacao' order by p.ordem, p.fim), '[]'::jsonb)
  from public.promocoes p
  where p.visivel and interno.hoje() between p.inicio and p.fim and interno.tem_recurso('promocoes');
$$;

-- dados públicos: módulos passam a sair do plano
create or replace function public.empresa_publica() returns jsonb
language sql stable security definer set search_path = '' as $$
  with r as (select interno.recursos_empresa(e.id) as rec, e.* from public.empresas e where e.id = interno.empresa_atual())
  select jsonb_build_object(
    'id', r.id, 'slug', r.slug, 'nome', r.nome, 'ativa', r.ativa, 'dominio', r.dominio,
    'suspensa', r.situacao = 'suspensa',
    'plano', r.plano, 'recursos', to_jsonb(r.rec),
    'modulos', jsonb_build_object('agenda', true, 'curso', 'curso' = any(r.rec), 'rede', 'rede' = any(r.rec),
                                  'promocoes', 'promocoes' = any(r.rec), 'natal', 'natal' = any(r.rec)),
    'config', r.config, 'paleta', r.paleta,
    'cor_principal', case when 'cor_livre' = any(r.rec) then r.cor_principal end,
    'foto_capa', r.foto_capa, 'logo', r.logo,
    'horarios', coalesce((select jsonb_agg(jsonb_build_object('dia', h.dia_semana, 'abre', to_char(h.abre, 'HH24:MI'), 'fecha', to_char(h.fecha, 'HH24:MI'))
                order by h.dia_semana) from public.horario_funcionamento h), '[]'::jsonb))
  from r;
$$;

create or replace function interno.json_plano(pl public.planos) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('codigo', pl.codigo, 'nome', pl.nome, 'descricao', pl.descricao, 'preco', pl.preco,
    'profissionais', pl.profissionais, 'extra_profissional', pl.extra_profissional, 'recursos', to_jsonb(pl.recursos));
$$;

-- para a página de planos
create or replace function public.planos_publicos() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'planos', coalesce((select jsonb_agg(interno.json_plano(p) order by p.ordem) from public.planos p where p.visivel), '[]'::jsonb),
    'whatsapp', (select nullif(valor, '') from interno.parametros where chave = 'vendas_whatsapp'));
$$;

-- "Meu plano" da dona
create or replace function public.admin_meu_plano(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare e public.empresas;
begin
  perform interno.conta_da_sessao(p_token, array['admin', 'master']);
  select * into e from public.empresas where id = interno.empresa_atual();
  return jsonb_build_object(
    'plano', (select interno.json_plano(p) from public.planos p where p.codigo = e.plano),
    'situacao', e.situacao, 'teste_ate', e.teste_ate, 'vence_em', e.vence_em,
    'recursos', to_jsonb(interno.recursos_empresa(e.id)), 'cortesias', to_jsonb(e.cortesias))
    || public.planos_publicos();
end;
$$;

-- PAINEL MASTER
create or replace function public.master_empresas(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform interno.so_master(p_token);
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', e.id, 'slug', e.slug, 'nome', e.nome, 'dominio', e.dominio, 'ativa', e.ativa, 'modulos', e.modulos,
      'paleta', e.paleta, 'logo', e.logo, 'criado_em', e.criado_em,
      'plano', e.plano, 'situacao', e.situacao, 'teste_ate', e.teste_ate, 'vence_em', e.vence_em,
      'cortesias', to_jsonb(e.cortesias), 'recursos', to_jsonb(interno.recursos_empresa(e.id)),
      'endereco', coalesce(e.dominio, e.slug || '.tonsdellas.com.br'),
      'donas', coalesce((select jsonb_agg(jsonb_build_object('nome', c.nome, 'email', c.email, 'tem_senha', c.senha_hash is not null))
                from public.contas c where c.empresa_id = e.id and c.papel = 'admin'), '[]'::jsonb),
      'clientes', (select count(*) from public.contas c where c.empresa_id = e.id and c.papel = 'cliente'),
      'agendamentos_30d', (select count(*) from public.agendamentos a where a.empresa_id = e.id and a.criado_em > now() - interval '30 days'),
      'servicos', (select count(*) from public.servicos_agenda s where s.empresa_id = e.id and s.visivel))
    order by e.criado_em) from public.empresas e), '[]'::jsonb);
end;
$$;

-- plano, situação, datas e cortesias de um salão; p.pago = true soma 1 mês
create or replace function public.master_empresa_plano(p_token text, p_id uuid, p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare e public.empresas; v_cort text[];
begin
  perform interno.so_master(p_token);
  select * into e from public.empresas where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'erro', 'Empresa não encontrada.'); end if;
  if p ? 'plano' and not exists (select 1 from public.planos where codigo = p->>'plano') then
    return jsonb_build_object('ok', false, 'erro', 'Plano inválido.');
  end if;
  if p ? 'situacao' and p->>'situacao' not in ('teste', 'ativa', 'atrasada', 'suspensa') then
    return jsonb_build_object('ok', false, 'erro', 'Situação inválida.');
  end if;
  if jsonb_typeof(p->'cortesias') = 'array' then
    select coalesce(array_agg(distinct x), '{}') into v_cort from jsonb_array_elements_text(p->'cortesias') x
    where x in ('push', 'resumo', 'promocoes', 'cor_livre', 'natal', 'curso', 'rede', 'dominio', 'sem_assinatura');
  end if;
  update public.empresas set
    plano = coalesce(p->>'plano', plano),
    situacao = case when coalesce((p->>'pago')::boolean, false) then 'ativa' else coalesce(p->>'situacao', situacao) end,
    teste_ate = case when p ? 'teste_ate' then nullif(p->>'teste_ate', '')::date else teste_ate end,
    vence_em = case when coalesce((p->>'pago')::boolean, false)
                    then (greatest(coalesce(vence_em, interno.hoje()), interno.hoje()) + interval '1 month')::date
                    when p ? 'vence_em' then nullif(p->>'vence_em', '')::date else vence_em end,
    cortesias = coalesce(v_cort, cortesias),
    ativa = case when coalesce(p->>'situacao', '') = 'ativa' or coalesce((p->>'pago')::boolean, false) then true else ativa end,
    atualizado_em = now()
  where id = p_id returning * into e;
  return jsonb_build_object('ok', true, 'plano', e.plano, 'situacao', e.situacao, 'vence_em', e.vence_em, 'teste_ate', e.teste_ate);
end;
$$;

-- preços dos planos e WhatsApp de vendas
create or replace function public.master_planos_salvar(p_token text, p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare x jsonb; v_whats text := regexp_replace(coalesce(p->>'whatsapp', ''), '\D', '', 'g');
begin
  perform interno.so_master(p_token);
  for x in select * from jsonb_array_elements(coalesce(p->'planos', '[]'::jsonb)) loop
    update public.planos set preco = greatest(0, replace(x->>'preco', ',', '.')::numeric) where codigo = x->>'codigo';
  end loop;
  if p ? 'whatsapp' then
    if v_whats <> '' and v_whats !~ '^55' then v_whats := '55' || v_whats; end if;
    update interno.parametros set valor = v_whats where chave = 'vendas_whatsapp';
  end if;
  return jsonb_build_object('ok', true) || public.planos_publicos();
end;
$$;

-- todo dia: vencidos viram "atrasada"; 7 dias depois, "suspensa"; teste acabado sem pagamento vira "atrasada"
create or replace function interno.atualizar_situacoes() returns void
language sql volatile security definer set search_path = '' as $$
  update public.empresas set situacao = 'atrasada', vence_em = coalesce(vence_em, teste_ate)
    where situacao = 'teste' and teste_ate is not null and teste_ate < interno.hoje();
  update public.empresas set situacao = 'atrasada'
    where situacao = 'ativa' and vence_em is not null and vence_em < interno.hoje();
  update public.empresas set situacao = 'suspensa'
    where situacao = 'atrasada' and vence_em is not null and vence_em < interno.hoje() - 7;
$$;
select cron.schedule('planos-situacao', '10 3 * * *', $$select interno.atualizar_situacoes()$$);

revoke all on function public.planos_publicos(), public.admin_meu_plano(text), public.master_empresa_plano(text, uuid, jsonb),
  public.master_planos_salvar(text, jsonb) from public;
grant execute on function public.planos_publicos(), public.admin_meu_plano(text), public.master_empresa_plano(text, uuid, jsonb),
  public.master_planos_salvar(text, jsonb) to anon, authenticated, app_dono;
grant execute on all functions in schema interno to app_dono;
