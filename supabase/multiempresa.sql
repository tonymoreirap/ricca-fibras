-- =====================================================================
-- MULTIEMPRESA: cada salão enxerga só os próprios dados.
-- A empresa do pedido vem do endereço (Origin do navegador ou x-empresa
-- enviado pelo servidor). O próprio banco filtra cada consulta (RLS).
-- =====================================================================

create table public.empresas (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$'),
  dominio    text unique check (dominio is null or dominio ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  nome       text not null check (char_length(nome) between 2 and 60),
  ativa      boolean not null default true,
  modulos    jsonb not null default '{"agenda": true, "curso": false, "rede": false, "promocoes": false, "natal": true}'::jsonb,
  config     jsonb not null default '{}'::jsonb,
  paleta     text not null default 'cafe-ouro',
  cor_principal text check (cor_principal is null or cor_principal ~ '^#[0-9a-fA-F]{6}$'),
  foto_capa  text,
  logo       text,
  criado_em  timestamptz not null default now(),
  atualizado_em timestamptz
);

insert into public.empresas (slug, dominio, nome, modulos, config, paleta, foto_capa, logo)
values ('rica', 'tonsdellas.com.br', 'Rica Fibras',
  '{"agenda": true, "curso": true, "rede": true, "promocoes": false, "natal": true}',
  jsonb_build_object(
    'contato', 'Luana',
    'titulo', 'Fibra de vidro com acabamento de joia.',
    'frase', 'Alongamento em fibra, manutenção no tempo certo e um atendimento pensado em cada detalhe.',
    'ola', 'Olá, seja bem-vinda',
    'descricao_site', 'Alongamento em fibra de vidro, esmaltação em gel, manicure e design de sobrancelhas. Agende seu horário.',
    'whatsapp', '5585996447096',
    'mensagem_whatsapp', 'Oi, Luana! Vim pelo site da Rica Fibras e quero agendar um horário.',
    'instagram', 'ricafibra_unhas',
    'pix', jsonb_build_object('chave', '+5585996447096', 'exibicao', '(85) 99644-7096', 'nome', 'Rica Fibras', 'cidade', 'Fortaleza'),
    'curso', jsonb_build_object('nome', 'Método Rica em Mesa',
      'descricao', 'Curso de fibra de vidro com a Luana, para quem quer aprender a técnica e o acabamento que fazem a diferença na mesa.'),
    'endereco', '', 'bairro_cidade', ''),
  'cafe-ouro', '/rica-fundo.webp', '/monograma.webp');

-- imagens enviadas pela dona (capa e logo), servidas por /api/arquivo/<id>
create table public.arquivos (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  tipo       text not null check (tipo in ('capa', 'logo')),
  mime       text not null check (mime in ('image/webp', 'image/png', 'image/jpeg')),
  dados      bytea not null check (octet_length(dados) <= 1500000),
  criado_em  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- empresa do pedido
-- ---------------------------------------------------------------------
create function interno.empresa_atual() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v_guc text := nullif(current_setting('app.empresa', true), '');
  h jsonb;
  v_host text;
  v_id uuid;
begin
  if v_guc is not null then return v_guc::uuid; end if;
  begin
    h := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then h := null;
  end;
  v_host := lower(regexp_replace(coalesce(h->>'x-empresa', h->>'origin', ''), '^https?://|:[0-9]+$|/.*$', '', 'g'));
  if v_host = '' then return null; end if;
  select id into v_id from public.empresas where dominio = v_host or slug = v_host or 'www.' || dominio = v_host;
  if found then return v_id; end if;
  if v_host ~ '\.(tonsdellas\.com\.br|localhost)$' then
    select id into v_id from public.empresas where slug = split_part(v_host, '.', 1);
    return v_id;
  end if;
  if v_host in ('localhost', '127.0.0.1') or v_host like '%.vercel.app' then
    return (select id from public.empresas where slug = 'rica');
  end if;
  return null;
end;
$$;
grant execute on function interno.empresa_atual() to anon, authenticated;

-- ---------------------------------------------------------------------
-- empresa_id em todas as tabelas do salão (dados atuais = Rica)
-- ---------------------------------------------------------------------
do $$
declare v_rica uuid := (select id from public.empresas where slug = 'rica'); t text;
begin
  foreach t in array array['agendamentos', 'servicos_agenda', 'horario_funcionamento', 'turmas', 'inscricoes', 'profissionais', 'push_inscricoes'] loop
    execute format('alter table public.%I add column empresa_id uuid references public.empresas(id) on delete cascade', t);
    execute format('update public.%I set empresa_id = %L', t, v_rica);
    execute format('alter table public.%I alter column empresa_id set not null', t);
    execute format('alter table public.%I alter column empresa_id set default interno.empresa_atual()', t);
  end loop;
  alter table public.contas add column empresa_id uuid references public.empresas(id) on delete cascade;
  update public.contas set empresa_id = v_rica where papel <> 'master';
  alter table public.contas alter column empresa_id set default interno.empresa_atual();
  alter table public.contas add constraint contas_empresa_papel check ((papel = 'master') = (empresa_id is null));
  alter table interno.push_envios add column empresa_id uuid;
  update interno.push_envios set empresa_id = v_rica;
end $$;
alter table public.arquivos alter column empresa_id set default interno.empresa_atual();
alter table public.arquivos add constraint arquivos_empresa_fk foreign key (empresa_id) references public.empresas(id) on delete cascade;

-- chaves e unicidades passam a valer por empresa
alter table public.contas drop constraint contas_celular_key;
create unique index contas_celular_por_empresa on public.contas (empresa_id, celular) where celular is not null;

alter table public.agendamentos drop constraint agendamentos_servico_fkey;
alter table public.servicos_agenda drop constraint servicos_agenda_pkey;
alter table public.servicos_agenda add primary key (empresa_id, codigo);
alter table public.agendamentos add constraint agendamentos_servico_fkey
  foreign key (empresa_id, servico) references public.servicos_agenda (empresa_id, codigo);

alter table public.horario_funcionamento drop constraint horario_funcionamento_pkey;
alter table public.horario_funcionamento add primary key (empresa_id, dia_semana);

drop index if exists public.servicos_um_destaque;
create unique index servicos_um_destaque on public.servicos_agenda (empresa_id) where destaque;

drop index if exists public.inscricoes_unica;
create unique index inscricoes_unica on public.inscricoes (empresa_id, celular, coalesce(turma_id, '00000000-0000-0000-0000-000000000000'::uuid), tipo)
  where status <> 'desistiu';

alter table public.agendamentos drop constraint agendamentos_sem_conflito;
alter table public.agendamentos add constraint agendamentos_sem_conflito
  exclude using gist (empresa_id with =, tstzrange(inicio, fim) with &&)
  where (status in ('aguardando_sinal', 'confirmado') and not demo);

create index if not exists agendamentos_empresa_inicio on public.agendamentos (empresa_id, inicio);
create index if not exists contas_empresa on public.contas (empresa_id);

-- ---------------------------------------------------------------------
-- papel que executa as funções do app: sujeito ao filtro por empresa
-- ---------------------------------------------------------------------
create role app_dono nologin;
grant app_dono to postgres;
grant usage on schema public, interno, extensions to app_dono;
grant create on schema public, interno to app_dono;
grant select, insert, update, delete on all tables in schema public to app_dono;
grant select, insert, update, delete on all tables in schema interno to app_dono;
grant execute on all functions in schema extensions to app_dono;
grant execute on all functions in schema interno to app_dono;
grant execute on all functions in schema public to app_dono;

alter table public.empresas enable row level security;
alter table public.contas enable row level security;
alter table public.sessoes enable row level security;
alter table public.agendamentos enable row level security;
alter table public.servicos_agenda enable row level security;
alter table public.horario_funcionamento enable row level security;
alter table public.turmas enable row level security;
alter table public.inscricoes enable row level security;
alter table public.profissionais enable row level security;
alter table public.push_inscricoes enable row level security;
alter table public.arquivos enable row level security;
revoke all on public.empresas, public.arquivos from anon, authenticated;

create policy empresa_ler on public.empresas for select to app_dono using (true);
create policy empresa_editar on public.empresas for update to app_dono using (id = interno.empresa_atual()) with check (id = interno.empresa_atual());

create policy so_da_empresa on public.contas for all to app_dono
  using (empresa_id is null or empresa_id = interno.empresa_atual())
  with check (empresa_id is null or empresa_id = interno.empresa_atual());
create policy livre on public.sessoes for all to app_dono using (true) with check (true);

do $$
declare t text;
begin
  foreach t in array array['agendamentos', 'servicos_agenda', 'horario_funcionamento', 'turmas', 'inscricoes', 'profissionais', 'push_inscricoes', 'arquivos'] loop
    execute format('create policy so_da_empresa on public.%I for all to app_dono using (empresa_id = interno.empresa_atual()) with check (empresa_id = interno.empresa_atual())', t);
  end loop;
end $$;

-- todas as funções do app passam a rodar como app_dono (exceto as que
-- precisam enxergar todas as empresas: avisos e o painel master)
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'interno') and p.prokind = 'f'
      and p.proname not in ('empresa_atual', 'enviar_push', 'push_chave_publica', 'push_registrar_chaves', 'push_pegar', 'push_descartar', 'criar_agendamento')
  loop
    execute format('alter function %s owner to app_dono', f.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- avisos: cada envio pertence a uma empresa
-- ---------------------------------------------------------------------
create or replace function interno.enviar_push(p_titulo text, p_corpo text, p_url text default '/admin', p_tag text default null, p_conta uuid default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid; v_emp uuid := interno.empresa_atual();
begin
  if v_emp is null then return; end if;
  if not exists (select 1 from public.push_inscricoes i join public.contas c on c.id = i.conta_id
                 where i.empresa_id = v_emp and c.papel in ('admin', 'master') and (p_conta is null or i.conta_id = p_conta)) then
    return;
  end if;
  insert into interno.push_envios (titulo, corpo, url, tag, conta_id, empresa_id)
  values (p_titulo, p_corpo, coalesce(p_url, '/admin'), p_tag, p_conta, v_emp) returning id into v_id;
  perform net.http_post(
    url := 'https://tonsdellas.com.br/api/avisos',
    body := jsonb_build_object('id', v_id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000);
end;
$$;

create or replace function public.push_pegar(p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare e interno.push_envios; k interno.push_chaves; v_nome text;
begin
  update interno.push_envios set pego_em = now()
  where id = p_id and pego_em is null and criado_em > now() - interval '10 minutes'
  returning * into e;
  if not found then return null; end if;
  select * into k from interno.push_chaves where id = 1;
  if not found then return null; end if;
  select nome into v_nome from public.empresas where id = e.empresa_id;
  return jsonb_build_object(
    'publica', k.publica, 'privada', k.privada,
    'mensagem', jsonb_build_object('titulo', e.titulo, 'corpo', e.corpo, 'url', e.url, 'tag', e.tag, 'empresa', v_nome),
    'inscricoes', coalesce((select jsonb_agg(i.dados) from public.push_inscricoes i join public.contas c on c.id = i.conta_id
                   where i.empresa_id = e.empresa_id and c.papel in ('admin', 'master')
                     and (e.conta_id is null or i.conta_id = e.conta_id)), '[]'::jsonb));
end;
$$;

-- lembretes agendados: rodam salão por salão
create function interno.lembretes(p_tipo text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare e record;
begin
  for e in select id from public.empresas where ativa and coalesce((modulos->>'agenda')::boolean, true) loop
    perform set_config('app.empresa', e.id::text, true);
    begin
      if p_tipo = 'manha' then perform interno.lembrete_manha();
      elsif p_tipo = 'noite' then perform interno.lembrete_noite();
      else perform interno.lembrete_proximo();
      end if;
    exception when others then
      raise warning 'lembrete % falhou na empresa %: %', p_tipo, e.id, sqlerrm;
    end;
  end loop;
  perform set_config('app.empresa', '', true);
end;
$$;
select cron.unschedule('rica-lembrete-manha');
select cron.unschedule('rica-lembrete-noite');
select cron.unschedule('rica-lembrete-proximo');
select cron.schedule('lembrete-manha', '0 10 * * *', $$select interno.lembretes('manha')$$);
select cron.schedule('lembrete-noite', '0 22 * * *', $$select interno.lembretes('noite')$$);
select cron.schedule('lembrete-proximo', '0 * * * *', $$select interno.lembretes('proximo')$$);

-- login no endereço errado: diz onde fica o painel da pessoa
create function interno.endereco_da_conta(p_email text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(e.dominio, e.slug || '.tonsdellas.com.br')
  from public.contas c join public.empresas e on e.id = c.empresa_id
  where c.email = lower(btrim(p_email)) and c.papel = 'admin';
$$;
grant execute on function interno.endereco_da_conta(text) to app_dono;

create or replace function public.admin_entrar(p_email text, p_senha text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v public.contas; v_erro text; v_outro text;
begin
  select * into v from public.contas where papel in ('admin', 'master') and email = lower(btrim(p_email));
  if not found then
    v_outro := interno.endereco_da_conta(p_email);
    if v_outro is not null then
      return jsonb_build_object('ok', false, 'outro_endereco', v_outro, 'erro', 'Seu painel fica em ' || v_outro || '. Entre por lá.');
    end if;
    return jsonb_build_object('ok', false, 'erro', 'E-mail ou senha incorretos.');
  end if;
  if v.senha_hash is null then
    return jsonb_build_object('ok', false, 'primeiro_acesso', true, 'erro', 'Primeiro acesso: use o código que você recebeu para criar sua senha.');
  end if;
  v_erro := interno.senha_ok(v, p_senha);
  if v_erro is not null then
    if v_erro like 'Muitas%' then return jsonb_build_object('ok', false, 'erro', v_erro); end if;
    return jsonb_build_object('ok', false, 'erro', 'E-mail ou senha incorretos.');
  end if;
  return jsonb_build_object('ok', true, 'papel', v.papel, 'nome', v.nome, 'token', interno.nova_sessao(v.id, 30));
end;
$$;
alter function public.admin_entrar(text, text) owner to app_dono;

-- ---------------------------------------------------------------------
-- dados públicos da empresa do endereço (o site inteiro usa isto)
-- ---------------------------------------------------------------------
create function public.empresa_publica() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', e.id, 'slug', e.slug, 'nome', e.nome, 'ativa', e.ativa, 'dominio', e.dominio,
    'modulos', e.modulos, 'config', e.config, 'paleta', e.paleta, 'cor_principal', e.cor_principal,
    'foto_capa', e.foto_capa, 'logo', e.logo,
    'horarios', coalesce((select jsonb_agg(jsonb_build_object('dia', h.dia_semana, 'abre', to_char(h.abre, 'HH24:MI'), 'fecha', to_char(h.fecha, 'HH24:MI'))
                order by h.dia_semana) from public.horario_funcionamento h), '[]'::jsonb))
  from public.empresas e where e.id = interno.empresa_atual();
$$;
alter function public.empresa_publica() owner to app_dono;

-- Meu salão: a dona (ou o master) edita a própria empresa
create function public.admin_empresa_salvar(p_token text, p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v public.contas; e public.empresas; c jsonb; h jsonb;
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
    c := c || jsonb_build_object('curso', jsonb_build_object(
      'nome', left(btrim(coalesce(p->'config'->'curso'->>'nome', '')), 60),
      'descricao', left(btrim(coalesce(p->'config'->'curso'->>'descricao', '')), 300)));
  end if;

  update public.empresas set nome = btrim(p->>'nome'), config = c,
    paleta = coalesce(p->>'paleta', paleta), cor_principal = nullif(p->>'cor_principal', ''), atualizado_em = now()
  where id = e.id;

  -- horários: lista de {dia, abre, fecha}; dia ausente = fechado
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
alter function public.admin_empresa_salvar(text, jsonb) owner to app_dono;

-- capa e logo
create function public.admin_arquivo_salvar(p_token text, p_tipo text, p_mime text, p_base64 text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v public.contas; v_id uuid; v_url text;
begin
  v := interno.conta_da_sessao(p_token, array['admin', 'master']);
  if p_tipo not in ('capa', 'logo') or p_mime not in ('image/webp', 'image/png', 'image/jpeg') then
    return jsonb_build_object('ok', false, 'erro', 'Imagem inválida.');
  end if;
  if char_length(coalesce(p_base64, '')) > 2000000 then
    return jsonb_build_object('ok', false, 'erro', 'Imagem muito grande.');
  end if;
  delete from public.arquivos where tipo = p_tipo;
  insert into public.arquivos (tipo, mime, dados) values (p_tipo, p_mime, decode(p_base64, 'base64')) returning id into v_id;
  v_url := '/api/arquivo/' || v_id;
  if p_tipo = 'capa' then update public.empresas set foto_capa = v_url, atualizado_em = now() where id = interno.empresa_atual();
  else update public.empresas set logo = v_url, atualizado_em = now() where id = interno.empresa_atual(); end if;
  return jsonb_build_object('ok', true, 'url', v_url);
end;
$$;
alter function public.admin_arquivo_salvar(text, text, text, text) owner to app_dono;

create function public.arquivo_ler(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('mime', a.mime, 'base64', encode(a.dados, 'base64')) from public.arquivos a where a.id = p_id;
$$;
alter function public.arquivo_ler(uuid) owner to app_dono;

-- ---------------------------------------------------------------------
-- PAINEL MASTER (Tony): enxerga e configura todas as empresas
-- ---------------------------------------------------------------------
create function interno.so_master(p_token text) returns public.contas
language plpgsql stable security definer set search_path = '' as $$
declare v public.contas;
begin
  select c.* into v from public.sessoes s join public.contas c on c.id = s.conta_id
  where s.token_hash = interno.hash(coalesce(p_token, '')) and s.expira_em > now() and c.papel = 'master';
  if not found then raise exception 'Sessão expirada. Entre novamente.'; end if;
  return v;
end;
$$;

create function public.master_empresas(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform interno.so_master(p_token);
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', e.id, 'slug', e.slug, 'nome', e.nome, 'dominio', e.dominio, 'ativa', e.ativa, 'modulos', e.modulos,
      'paleta', e.paleta, 'logo', e.logo, 'criado_em', e.criado_em,
      'endereco', coalesce(e.dominio, e.slug || '.tonsdellas.com.br'),
      'donas', coalesce((select jsonb_agg(jsonb_build_object('nome', c.nome, 'email', c.email, 'tem_senha', c.senha_hash is not null))
                from public.contas c where c.empresa_id = e.id and c.papel = 'admin'), '[]'::jsonb),
      'clientes', (select count(*) from public.contas c where c.empresa_id = e.id and c.papel = 'cliente'),
      'agendamentos_30d', (select count(*) from public.agendamentos a where a.empresa_id = e.id and a.criado_em > now() - interval '30 days'),
      'servicos', (select count(*) from public.servicos_agenda s where s.empresa_id = e.id and s.visivel))
    order by e.criado_em) from public.empresas e), '[]'::jsonb);
end;
$$;

-- cria ou edita empresa; ao criar, já cadastra a dona com código de primeiro acesso
create function public.master_empresa_salvar(p_token text, p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  e public.empresas; v_cod text; v_email text := lower(btrim(coalesce(p->>'dona_email', '')));
  v_slug text := lower(btrim(coalesce(p->>'slug', '')));
  v_dom text := nullif(lower(regexp_replace(btrim(coalesce(p->>'dominio', '')), '^https?://|^www\.|/.*$', '', 'g')), '');
  v_mod jsonb := coalesce(p->'modulos', '{"agenda": true, "curso": false, "rede": false, "promocoes": false, "natal": true}'::jsonb);
begin
  perform interno.so_master(p_token);
  if v_slug !~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$' or v_slug in ('www', 'api', 'admin', 'master', 'app') then
    return jsonb_build_object('ok', false, 'erro', 'Apelido inválido: use letras minúsculas, números e hífen (ex.: ciliosporlivia).');
  end if;
  if char_length(btrim(coalesce(p->>'nome', ''))) not between 2 and 60 then
    return jsonb_build_object('ok', false, 'erro', 'Informe o nome da empresa.');
  end if;
  begin
    if coalesce(p->>'id', '') = '' then
      if v_email !~ '^\S+@\S+\.\S+$' or char_length(btrim(coalesce(p->>'dona_nome', ''))) < 2 then
        return jsonb_build_object('ok', false, 'erro', 'Informe o nome e o e-mail da dona.');
      end if;
      if exists (select 1 from public.contas where email = v_email) then
        return jsonb_build_object('ok', false, 'erro', 'Esse e-mail já tem acesso em outra empresa.');
      end if;
      insert into public.empresas (slug, dominio, nome, modulos, config, paleta)
      values (v_slug, v_dom, btrim(p->>'nome'), v_mod,
              jsonb_build_object('contato', split_part(btrim(p->>'dona_nome'), ' ', 1), 'titulo', btrim(p->>'nome'),
                                 'ola', 'Olá, seja bem-vinda', 'whatsapp', '', 'instagram', ''),
              coalesce(p->>'paleta', 'cafe-ouro'))
      returning * into e;
      insert into public.horario_funcionamento (empresa_id, dia_semana, abre, fecha)
      select e.id, d, '09:00', '18:00' from generate_series(2, 6) d;
      v_cod := upper(substr(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=0O1IlL', ''), 1, 4)) || '-' ||
               upper(substr(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=0O1IlL', ''), 1, 4));
      insert into public.contas (empresa_id, papel, nome, email, codigo_acesso_hash, codigo_expira)
      values (e.id, 'admin', btrim(p->>'dona_nome'), v_email, interno.hash(v_cod), now() + interval '14 days');
    else
      update public.empresas set slug = v_slug, dominio = v_dom, nome = btrim(p->>'nome'),
        ativa = coalesce((p->>'ativa')::boolean, ativa), modulos = coalesce(p->'modulos', modulos), atualizado_em = now()
      where id = (p->>'id')::uuid returning * into e;
      if not found then return jsonb_build_object('ok', false, 'erro', 'Empresa não encontrada.'); end if;
    end if;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'erro', 'Esse apelido ou domínio já está em uso.');
  end;
  return jsonb_build_object('ok', true, 'id', e.id, 'codigo', v_cod,
    'endereco', coalesce(e.dominio, e.slug || '.tonsdellas.com.br'));
end;
$$;

-- novo código de primeiro acesso para a dona
create function public.master_novo_acesso(p_token text, p_email text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_cod text;
begin
  perform interno.so_master(p_token);
  v_cod := upper(substr(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=0O1IlL', ''), 1, 4)) || '-' ||
           upper(substr(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=0O1IlL', ''), 1, 4));
  update public.contas set senha_hash = null, codigo_acesso_hash = interno.hash(v_cod), codigo_expira = now() + interval '14 days',
    tentativas = 0, bloqueado_ate = null
  where email = lower(btrim(p_email)) and papel = 'admin';
  if not found then return jsonb_build_object('ok', false, 'erro', 'Dona não encontrada.'); end if;
  delete from public.sessoes where conta_id = (select id from public.contas where email = lower(btrim(p_email)));
  return jsonb_build_object('ok', true, 'codigo', v_cod);
end;
$$;

revoke all on function public.empresa_publica(), public.admin_empresa_salvar(text, jsonb), public.admin_arquivo_salvar(text, text, text, text),
  public.arquivo_ler(uuid), public.master_empresas(text), public.master_empresa_salvar(text, jsonb), public.master_novo_acesso(text, text) from public;
grant execute on function public.empresa_publica(), public.admin_empresa_salvar(text, jsonb), public.admin_arquivo_salvar(text, text, text, text),
  public.arquivo_ler(uuid), public.master_empresas(text), public.master_empresa_salvar(text, jsonb), public.master_novo_acesso(text, text) to anon, authenticated;
grant execute on all functions in schema public to app_dono;

-- ---------------------------------------------------------------------
-- ajustes aplicados em seguida (migração multiempresa_ajustes)
-- ---------------------------------------------------------------------
alter function public.criar_agendamento(text, timestamptz, text, text) owner to app_dono;
-- empresa_atual(): chamada do servidor sem Origin nem x-empresa cai na Rica
-- (compatibilidade com o site antigo; ver versão final na migração)
