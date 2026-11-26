-- =====================================================================
-- FASE 2: promoções com prazo + textos do curso e do certificado por salão
-- =====================================================================

create table public.promocoes (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null default interno.empresa_atual() references public.empresas(id) on delete cascade,
  titulo      text not null check (char_length(titulo) between 2 and 60),
  texto       text check (char_length(texto) <= 240),
  imagem      text,
  servico     text,
  preco_promo numeric(10,2) check (preco_promo is null or preco_promo > 0),
  inicio      date not null,
  fim         date not null,
  visivel     boolean not null default true,
  ordem       integer not null default 0,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz,
  check (fim >= inicio),
  check (preco_promo is null or servico is not null),
  foreign key (empresa_id, servico) references public.servicos_agenda (empresa_id, codigo) on delete cascade
);
create index promocoes_empresa_periodo on public.promocoes (empresa_id, inicio, fim);
alter table public.promocoes enable row level security;
revoke all on public.promocoes from anon, authenticated;
grant select, insert, update, delete on public.promocoes to app_dono;
create policy so_da_empresa on public.promocoes for all to app_dono
  using (empresa_id = interno.empresa_atual()) with check (empresa_id = interno.empresa_atual());

-- imagem da promoção
alter table public.arquivos drop constraint arquivos_tipo_check;
alter table public.arquivos add constraint arquivos_tipo_check check (tipo in ('capa', 'logo', 'promo'));

create or replace function interno.hoje() returns date
language sql stable set search_path = '' as $$ select (now() at time zone 'America/Fortaleza')::date $$;
grant execute on function interno.hoje() to app_dono;

-- promoção valendo hoje para um serviço (menor preço, se houver mais de uma)
create or replace function interno.promo_do_servico(p_servico text) returns public.promocoes
language sql stable security definer set search_path = '' as $$
  select p.* from public.promocoes p
  where p.servico = p_servico and p.visivel and p.preco_promo is not null
    and interno.hoje() between p.inicio and p.fim
  order by p.preco_promo limit 1;
$$;
alter function interno.promo_do_servico(text) owner to app_dono;

create or replace function interno.json_promocao(p public.promocoes) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'titulo', p.titulo, 'texto', p.texto, 'imagem', p.imagem,
    'servico', p.servico, 'servico_nome', s.nome, 'valor', s.valor, 'preco_promo', p.preco_promo,
    'agenda_online', coalesce(s.ativo and s.visivel and s.valor is not null, false),
    'inicio', p.inicio, 'fim', p.fim, 'visivel', p.visivel, 'ordem', p.ordem,
    'situacao', case when not p.visivel then 'oculta'
                     when interno.hoje() < p.inicio then 'agendada'
                     when interno.hoje() > p.fim then 'encerrada'
                     else 'no_ar' end)
  from (select 1) x left join public.servicos_agenda s on s.codigo = p.servico;
$$;
alter function interno.json_promocao(public.promocoes) owner to app_dono;

create function public.promocoes_publicas() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(interno.json_promocao(p) - 'visivel' - 'situacao' order by p.ordem, p.fim), '[]'::jsonb)
  from public.promocoes p
  where p.visivel and interno.hoje() between p.inicio and p.fim;
$$;
alter function public.promocoes_publicas() owner to app_dono;

create function public.admin_promocoes(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform interno.conta_da_sessao(p_token, array['admin', 'master']);
  return coalesce((select jsonb_agg(interno.json_promocao(p)
    order by (interno.hoje() > p.fim), p.ordem, p.inicio desc) from public.promocoes p), '[]'::jsonb);
end;
$$;
alter function public.admin_promocoes(text) owner to app_dono;

create function public.admin_promocao_salvar(p_token text, p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r public.promocoes; v_id uuid := nullif(p->>'id', '')::uuid;
  v_serv text := nullif(btrim(coalesce(p->>'servico', '')), '');
  v_preco numeric := nullif(replace(btrim(coalesce(p->>'preco_promo', '')), ',', '.'), '')::numeric;
  v_valor numeric; v_img_antiga text;
begin
  perform interno.conta_da_sessao(p_token, array['admin', 'master']);
  if char_length(btrim(coalesce(p->>'titulo', ''))) not between 2 and 60 then
    return jsonb_build_object('ok', false, 'erro', 'Dê um título para a promoção.');
  end if;
  if coalesce(p->>'inicio', '') = '' or coalesce(p->>'fim', '') = '' then
    return jsonb_build_object('ok', false, 'erro', 'Informe o início e o fim.');
  end if;
  if (p->>'fim')::date < (p->>'inicio')::date then
    return jsonb_build_object('ok', false, 'erro', 'O fim precisa ser depois do início.');
  end if;
  if v_serv is not null then
    select valor into v_valor from public.servicos_agenda where codigo = v_serv;
    if not found then return jsonb_build_object('ok', false, 'erro', 'Serviço não encontrado.'); end if;
  end if;
  if v_preco is not null and v_serv is null then
    return jsonb_build_object('ok', false, 'erro', 'Escolha o serviço do preço promocional.');
  end if;
  if v_preco is not null and v_valor is not null and v_preco >= v_valor then
    return jsonb_build_object('ok', false, 'erro', 'O preço promocional precisa ser menor que o normal.');
  end if;

  if v_id is null then
    insert into public.promocoes (titulo, texto, imagem, servico, preco_promo, inicio, fim, visivel, ordem)
    values (btrim(p->>'titulo'), nullif(btrim(coalesce(p->>'texto', '')), ''), nullif(p->>'imagem', ''), v_serv, v_preco,
            (p->>'inicio')::date, (p->>'fim')::date, coalesce((p->>'visivel')::boolean, true),
            coalesce((select max(ordem) + 1 from public.promocoes), 1))
    returning * into r;
  else
    select imagem into v_img_antiga from public.promocoes where id = v_id;
    update public.promocoes set titulo = btrim(p->>'titulo'), texto = nullif(btrim(coalesce(p->>'texto', '')), ''),
      imagem = nullif(p->>'imagem', ''), servico = v_serv, preco_promo = v_preco,
      inicio = (p->>'inicio')::date, fim = (p->>'fim')::date,
      visivel = coalesce((p->>'visivel')::boolean, visivel), atualizado_em = now()
    where id = v_id returning * into r;
    if not found then return jsonb_build_object('ok', false, 'erro', 'Promoção não encontrada.'); end if;
    if v_img_antiga is not null and v_img_antiga is distinct from r.imagem then
      delete from public.arquivos where tipo = 'promo' and '/api/arquivo/' || id = v_img_antiga;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'promocao', interno.json_promocao(r));
end;
$$;
alter function public.admin_promocao_salvar(text, jsonb) owner to app_dono;

create function public.admin_promocao_visivel(p_token text, p_id uuid, p_visivel boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform interno.conta_da_sessao(p_token, array['admin', 'master']);
  update public.promocoes set visivel = p_visivel, atualizado_em = now() where id = p_id;
  return jsonb_build_object('ok', found);
end;
$$;
alter function public.admin_promocao_visivel(text, uuid, boolean) owner to app_dono;

create function public.admin_promocao_excluir(p_token text, p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_img text;
begin
  perform interno.conta_da_sessao(p_token, array['admin', 'master']);
  delete from public.promocoes where id = p_id returning imagem into v_img;
  if not found then return jsonb_build_object('ok', false, 'erro', 'Promoção não encontrada.'); end if;
  if v_img is not null then delete from public.arquivos where tipo = 'promo' and '/api/arquivo/' || id = v_img; end if;
  return jsonb_build_object('ok', true);
end;
$$;
alter function public.admin_promocao_excluir(text, uuid) owner to app_dono;

-- envio de imagem: capa e logo trocam a da empresa; promo só guarda e devolve o endereço
create or replace function public.admin_arquivo_salvar(p_token text, p_tipo text, p_mime text, p_base64 text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v public.contas; v_id uuid; v_url text;
begin
  v := interno.conta_da_sessao(p_token, array['admin', 'master']);
  if p_tipo not in ('capa', 'logo', 'promo') or p_mime not in ('image/webp', 'image/png', 'image/jpeg') then
    return jsonb_build_object('ok', false, 'erro', 'Imagem inválida.');
  end if;
  if char_length(coalesce(p_base64, '')) > 2000000 then
    return jsonb_build_object('ok', false, 'erro', 'Imagem muito grande.');
  end if;
  -- imagens de promoção enviadas e não usadas por nenhuma promoção somem depois de 1 dia
  delete from public.arquivos a where a.tipo = 'promo' and a.criado_em < now() - interval '1 day'
    and not exists (select 1 from public.promocoes p where p.imagem = '/api/arquivo/' || a.id);
  if p_tipo <> 'promo' then delete from public.arquivos where tipo = p_tipo; end if;
  insert into public.arquivos (tipo, mime, dados) values (p_tipo, p_mime, decode(p_base64, 'base64')) returning id into v_id;
  v_url := '/api/arquivo/' || v_id;
  if p_tipo = 'capa' then update public.empresas set foto_capa = v_url, atualizado_em = now() where id = interno.empresa_atual();
  elsif p_tipo = 'logo' then update public.empresas set logo = v_url, atualizado_em = now() where id = interno.empresa_atual(); end if;
  return jsonb_build_object('ok', true, 'url', v_url);
end;
$$;

-- agendamento cobra o preço promocional que estiver valendo
create or replace function interno.inserir_agendamento(p_servico text, p_inicio timestamptz, p_nome text, p_celular text, p_conta uuid, p_por text, p_status text)
returns public.agendamentos
language plpgsql volatile security definer set search_path = '' as $$
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

  v_valor := coalesce((interno.promo_do_servico(v_serv.codigo)).preco_promo, v_serv.valor);

  begin
    insert into public.agendamentos
      (codigo, servico, servico_nome, cliente_nome, cliente_celular, inicio, fim, valor, sinal, status, conta_id, criado_por)
    values
      ('RF' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
       v_serv.codigo, v_serv.nome, v_nome, v_cel, p_inicio, p_inicio + make_interval(mins => v_serv.duracao_min),
       v_valor, round(v_valor * v_serv.sinal_pct / 100, 2), p_status, p_conta, p_por)
    returning * into v_reg;
  exception when exclusion_violation then
    raise exception 'Esse horário acabou de ser reservado. Escolha outro.';
  end;
  return v_reg;
end;
$$;

-- lista do agendamento mostra o preço com desconto (e o cheio para riscar)
drop function public.servicos_agendaveis();
create function public.servicos_agendaveis()
returns table (codigo text, nome text, valor numeric, duracao_min integer, sinal_pct numeric, sinal numeric, valor_cheio numeric, promocao text)
language sql stable security definer set search_path = '' as $$
  select s.codigo, s.nome, coalesce(pr.preco_promo, s.valor), s.duracao_min, s.sinal_pct,
         round(coalesce(pr.preco_promo, s.valor) * s.sinal_pct / 100, 2),
         case when pr.id is not null then s.valor end, pr.titulo
  from public.servicos_agenda s
  left join lateral (select * from interno.promo_do_servico(s.codigo)) pr on pr.id is not null
  where s.ativo and s.visivel and s.valor is not null
  order by s.ordem;
$$;
alter function public.servicos_agendaveis() owner to app_dono;
grant execute on function public.servicos_agendaveis() to anon, authenticated;

create or replace function public.servicos_catalogo() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'codigo', s.codigo, 'nome', s.nome, 'descricao', s.descricao, 'resumo', s.resumo, 'icone', s.icone,
      'valor', s.valor, 'ciclo_dias', s.ciclo_dias, 'destaque', s.destaque, 'selo', s.selo,
      'agenda_online', s.ativo and s.valor is not null,
      'promocao', case when pr.id is not null then jsonb_build_object('titulo', pr.titulo, 'preco', pr.preco_promo, 'fim', pr.fim) end)
    order by s.destaque desc, s.ordem, s.nome), '[]'::jsonb)
  from public.servicos_agenda s
  left join lateral (select * from interno.promo_do_servico(s.codigo)) pr on pr.id is not null
  where s.visivel;
$$;

-- curso e certificado: textos por salão (mesclados, para não apagar o que não veio)
create or replace function public.admin_empresa_salvar(p_token text, p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v public.contas; e public.empresas; c jsonb; h jsonb; v_topicos jsonb;
  v_whats text := regexp_replace(coalesce(p->'config'->>'whatsapp', ''), '\D', '', 'g');
  v_insta text := lower(regexp_replace(coalesce(p->'config'->>'instagram', ''), '^@|\s|https?://(www\.)?instagram\.com/|/.*$', '', 'g'));
begin
  v := interno.conta_da_sessao(p_token, array['admin', 'master']);
  select * into e from public.empresas where id = interno.empresa_atual();
  if not found then return jsonb_build_object('ok', false, 'erro', 'Empresa não encontrada.'); end if;
  if char_length(btrim(coalesce(p->>'nome', ''))) not between 2 and 60 then
    return jsonb_build_object('ok', false, 'erro', 'Informe o nome do salão.');
  end if;
  if v_whats <> '' and v_whats !~ '^55[0-9]{10,11}$' then
    if v_whats ~ '^[0-9]{10,11}$' then v_whats := '55' || v_whats;
    else return jsonb_build_object('ok', false, 'erro', 'WhatsApp inválido. Use DDD + número.'); end if;
  end if;
  if v_insta <> '' and v_insta !~ '^[a-z0-9._]{1,30}$' then
    return jsonb_build_object('ok', false, 'erro', 'Instagram inválido.');
  end if;
  if coalesce(p->>'paleta', e.paleta) not in ('cafe-ouro', 'perola-rose', 'noite-champanhe', 'verde-salvia', 'lavanda', 'terracota', 'grafite-prata', 'vinho-ouro') then
    return jsonb_build_object('ok', false, 'erro', 'Paleta inválida.');
  end if;
  if nullif(p->>'cor_principal', '') is not null and (p->>'cor_principal') !~ '^#[0-9a-fA-F]{6}$' then
    return jsonb_build_object('ok', false, 'erro', 'Cor inválida.');
  end if;

  c := e.config
    || jsonb_strip_nulls(jsonb_build_object(
      'contato', left(btrim(p->'config'->>'contato'), 40),
      'titulo', left(btrim(p->'config'->>'titulo'), 90),
      'frase', left(btrim(p->'config'->>'frase'), 200),
      'ola', left(btrim(p->'config'->>'ola'), 40),
      'descricao_site', left(btrim(p->'config'->>'descricao_site'), 200),
      'mensagem_whatsapp', left(btrim(p->'config'->>'mensagem_whatsapp'), 200),
      'endereco', left(btrim(p->'config'->>'endereco'), 120),
      'bairro_cidade', left(btrim(p->'config'->>'bairro_cidade'), 80)))
    || jsonb_build_object('whatsapp', v_whats, 'instagram', v_insta);
  if p->'config' ? 'pix' then
    c := c || jsonb_build_object('pix', jsonb_build_object(
      'chave', left(btrim(coalesce(p->'config'->'pix'->>'chave', '')), 77),
      'exibicao', left(btrim(coalesce(p->'config'->'pix'->>'exibicao', '')), 77),
      'nome', left(btrim(coalesce(p->'config'->'pix'->>'nome', '')), 25),
      'cidade', left(btrim(coalesce(p->'config'->'pix'->>'cidade', '')), 15)));
  end if;
  if p->'config' ? 'curso' then
    select coalesce(jsonb_agg(left(btrim(t), 120)), '[]'::jsonb) into v_topicos
    from (select t from jsonb_array_elements_text(coalesce(p->'config'->'curso'->'topicos', '[]'::jsonb)) t
          where btrim(t) <> '' limit 12) x;
    c := c || jsonb_build_object('curso', coalesce(e.config->'curso', '{}'::jsonb) || jsonb_build_object(
      'nome', left(btrim(coalesce(p->'config'->'curso'->>'nome', '')), 60),
      'descricao', left(btrim(coalesce(p->'config'->'curso'->>'descricao', '')), 300),
      'chamada', left(btrim(coalesce(p->'config'->'curso'->>'chamada', '')), 200),
      'topicos', v_topicos,
      'carga_horaria', left(btrim(coalesce(p->'config'->'curso'->>'carga_horaria', '')), 20)));
  end if;
  if p->'config' ? 'certificado' then
    c := c || jsonb_build_object('certificado', jsonb_build_object(
      'assinatura', left(btrim(coalesce(p->'config'->'certificado'->>'assinatura', '')), 60),
      'cargo', left(btrim(coalesce(p->'config'->'certificado'->>'cargo', '')), 60),
      'texto', left(btrim(coalesce(p->'config'->'certificado'->>'texto', '')), 160)));
  end if;

  update public.empresas set nome = btrim(p->>'nome'), config = c,
    paleta = coalesce(p->>'paleta', paleta), cor_principal = nullif(p->>'cor_principal', ''), atualizado_em = now()
  where id = e.id;

  if jsonb_typeof(p->'horarios') = 'array' then
    for h in select * from jsonb_array_elements(p->'horarios') loop
      if (h->>'abre')::time >= (h->>'fecha')::time then
        raise exception 'Horário inválido: a abertura precisa ser antes do fechamento.';
      end if;
    end loop;
    delete from public.horario_funcionamento;
    insert into public.horario_funcionamento (dia_semana, abre, fecha)
    select (x->>'dia')::int, (x->>'abre')::time, (x->>'fecha')::time from jsonb_array_elements(p->'horarios') x
    where (x->>'dia')::int between 0 and 6;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.promocoes_publicas(), public.admin_promocoes(text), public.admin_promocao_salvar(text, jsonb),
  public.admin_promocao_visivel(text, uuid, boolean), public.admin_promocao_excluir(text, uuid) from public;
grant execute on function public.promocoes_publicas(), public.admin_promocoes(text), public.admin_promocao_salvar(text, jsonb),
  public.admin_promocao_visivel(text, uuid, boolean), public.admin_promocao_excluir(text, uuid) to anon, authenticated, app_dono;
grant execute on all functions in schema interno to app_dono;

-- ajuste: servicos_agendaveis também devolve o ícone (migração servicos_agendaveis_icone)
