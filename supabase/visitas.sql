-- Contador de visitas (sem cookies): uma linha por visitante por dia, por endereço.
-- O visitante é um hash de IP + navegador + dia + segredo: não dá para voltar ao IP
-- e não dá para seguir a pessoa de um dia para o outro.

create table if not exists public.visitas (
  dia date not null,
  empresa_id uuid references public.empresas(id) on delete cascade,
  visitante text not null,
  paginas integer not null default 1,
  primeira_pagina text,
  origem text,
  aparelho text,
  primeiro_em timestamptz not null default now(),
  ultimo_em timestamptz not null default now()
);
create unique index if not exists visitas_unica
  on public.visitas (dia, coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid), visitante);
create index if not exists visitas_empresa_dia on public.visitas (empresa_id, dia);
alter table public.visitas enable row level security;
revoke all on public.visitas from anon, authenticated;

insert into interno.segredos (chave, valor)
select 'visitas_sal', encode(extensions.gen_random_bytes(24), 'hex')
where not exists (select 1 from interno.segredos where chave = 'visitas_sal');

create or replace function interno.origem_da_visita(p_ref text)
returns text language sql immutable set search_path = '' as $$
  select case
    when coalesce(p_ref, '') = '' then 'direto'
    when p_ref ~* 'instagram\.com|l\.instagram' then 'instagram'
    when p_ref ~* 'facebook\.com|fb\.com|l\.facebook' then 'facebook'
    when p_ref ~* 'whatsapp|wa\.me' then 'whatsapp'
    when p_ref ~* 'google\.' then 'google'
    when p_ref ~* 'tiktok' then 'tiktok'
    when p_ref ~* 'bing\.|duckduckgo|yahoo\.' then 'busca'
    else 'outros sites'
  end;
$$;

create or replace function public.registrar_visita(p_caminho text, p_origem text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  h jsonb; v_ua text; v_ip text; v_dia date := (now() at time zone 'America/Fortaleza')::date;
  v_emp uuid := interno.empresa_atual(); v_sal text; v_vis text;
begin
  begin h := nullif(current_setting('request.headers', true), '')::jsonb; exception when others then h := null; end;
  v_ua := left(coalesce(h->>'user-agent', ''), 300);
  -- robôs e prévias de link não contam
  if v_ua = '' or v_ua ~* '(bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|vercel|curl|wget|python|node-fetch|axios)' then
    return;
  end if;
  v_ip := coalesce(interno.ip_do_pedido(), 'sem-ip');
  select valor into v_sal from interno.segredos where chave = 'visitas_sal';
  v_vis := interno.hash(v_ip || '|' || v_ua || '|' || v_dia::text || '|' || coalesce(v_sal, ''));

  insert into public.visitas as x (dia, empresa_id, visitante, primeira_pagina, origem, aparelho)
  values (v_dia, v_emp, v_vis, left(coalesce(p_caminho, '/'), 120), interno.origem_da_visita(p_origem),
          case when v_ua ~* 'mobi|android|iphone|ipad' then 'celular' else 'computador' end)
  on conflict (dia, coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid), visitante)
  do update set paginas = least(x.paginas + 1, 500), ultimo_em = now();
end;
$$;
revoke all on function public.registrar_visita(text, text) from public;
grant execute on function public.registrar_visita(text, text) to anon, authenticated;

-- resumo de um conjunto de visitas (mesmo formato no Master e no painel)
create or replace function interno.resumo_visitas(p_emp uuid, p_plataforma boolean, p_dias integer)
returns jsonb
language sql stable set search_path = '' as $$
  with hoje as (select (now() at time zone 'America/Fortaleza')::date d),
  v as (
    select x.* from public.visitas x, hoje
    where x.dia > hoje.d - p_dias
      and (case when p_plataforma then x.empresa_id is null else x.empresa_id = p_emp end)
  )
  select jsonb_build_object(
    'hoje', (select count(*) from v, hoje where v.dia = hoje.d),
    'ontem', (select count(*) from v, hoje where v.dia = hoje.d - 1),
    'semana', (select count(*) from v, hoje where v.dia > hoje.d - 7),
    'mes', (select count(*) from v, hoje where v.dia > hoje.d - 30),
    'paginas_mes', (select coalesce(sum(paginas), 0) from v, hoje where v.dia > hoje.d - 30),
    'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', g.d, 'visitas', coalesce(c.n, 0)) order by g.d), '[]'::jsonb)
                from hoje, generate_series(hoje.d - 13, hoje.d, interval '1 day') g0(t)
                cross join lateral (select g0.t::date d) g
                left join lateral (select count(*) n from v where v.dia = g.d) c on true),
    'origens', (select coalesce(jsonb_agg(jsonb_build_object('origem', o.origem, 'visitas', o.n) order by o.n desc), '[]'::jsonb)
                from (select coalesce(origem, 'direto') origem, count(*) n from v, hoje where v.dia > hoje.d - 30 group by 1) o),
    'celular_pct', (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where aparelho = 'celular') / count(*)) end
                    from v, hoje where v.dia > hoje.d - 30)
  );
$$;

create or replace function public.master_visitas(p_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform interno.so_master(p_token);
  return jsonb_build_object('ok', true,
    'site', interno.resumo_visitas(null, true, 30),
    'saloes', coalesce((
      select jsonb_agg(jsonb_build_object('nome', e.nome, 'slug', e.slug, 'semana', s.semana, 'mes', s.mes) order by s.mes desc, e.nome)
      from public.empresas e
      cross join lateral (
        select count(*) filter (where x.dia > (now() at time zone 'America/Fortaleza')::date - 7) semana,
               count(*) mes
        from public.visitas x where x.empresa_id = e.id and x.dia > (now() at time zone 'America/Fortaleza')::date - 30) s
      where s.mes > 0), '[]'::jsonb));
end;
$$;

create or replace function public.admin_visitas(p_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.contas;
begin
  v := interno.dona_atual(p_token);
  return jsonb_build_object('ok', true, 'visitas', interno.resumo_visitas(interno.empresa_atual(), false, 30));
end;
$$;
