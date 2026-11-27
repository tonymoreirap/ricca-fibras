-- =====================================================================
-- CADASTRO SOZINHA: a dona cria o salão dela, sem precisar do Tony
--  * escolhe nome, endereço (borboletarosa.tonsdellas.com.br), cores e plano
--  * cria a conta com e-mail e senha e já entra no painel, com 30 dias grátis
--  * depois do teste, paga pelo app (Mercado Pago)
-- =====================================================================

-- controle de abuso: quantos cadastros por endereço de internet
create table if not exists interno.cadastros (id bigserial primary key, ip_hash text, criado_em timestamptz not null default now());
-- passe de entrada: leva a dona logada do site principal para o endereço do salão (vale 10 min, uma vez)
create table if not exists interno.passes (
  hash text primary key,
  conta_id uuid not null references public.contas(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  expira timestamptz not null
);
revoke all on interno.cadastros, interno.passes from public, anon, authenticated, app_dono;

alter table public.empresas add column if not exists origem text not null default 'master' check (origem in ('master', 'cadastro'));

-- "Borboleta Rosa" -> "borboletarosa"
create or replace function interno.slug_de(p text) returns text
language sql immutable set search_path = '' as $$
  select left(regexp_replace(translate(lower(coalesce(p, '')),
    'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9]+', '', 'g'), 40);
$$;

create or replace function interno.slug_reservado(p text) returns boolean
language sql immutable set search_path = '' as $$
  select p in ('www', 'api', 'admin', 'master', 'app', 'google', 'planos', 'criar', 'cadastro', 'privacidade', 'ajuda',
               'suporte', 'blog', 'mail', 'email', 'painel', 'entrar', 'login', 'teste', 'demo', 'static', 'cdn', 'tonsdellas', 'rica');
$$;

create or replace function interno.ip_do_pedido() returns text
language plpgsql stable set search_path = '' as $$
declare h jsonb;
begin
  begin h := nullif(current_setting('request.headers', true), '')::jsonb; exception when others then return null; end;
  return nullif(btrim(split_part(coalesce(h->>'cf-connecting-ip', h->>'x-real-ip', h->>'x-forwarded-for', ''), ',', 1)), '');
end;
$$;

-- o endereço está livre?
create or replace function public.slug_disponivel(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s text := interno.slug_de(p_slug); i integer;
begin
  if char_length(s) < 3 then return jsonb_build_object('ok', true, 'slug', s, 'livre', false, 'motivo', 'Use pelo menos 3 letras.'); end if;
  if not interno.slug_reservado(s) and not exists (select 1 from public.empresas where slug = s) then
    return jsonb_build_object('ok', true, 'slug', s, 'livre', true);
  end if;
  for i in 2..30 loop
    if not exists (select 1 from public.empresas where slug = left(s, 38) || i) then
      return jsonb_build_object('ok', true, 'slug', s, 'livre', false, 'motivo', 'Esse endereço já tem dona.', 'sugestao', left(s, 38) || i);
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'slug', s, 'livre', false, 'motivo', 'Esse endereço já tem dona.');
end;
$$;

-- p = { nome, slug, dona_nome, email, whatsapp, senha, plano, paleta }
create or replace function public.criar_salao(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_nome  text := btrim(coalesce(p->>'nome', ''));
  v_slug  text := interno.slug_de(p->>'slug');
  v_dona  text := btrim(coalesce(p->>'dona_nome', ''));
  v_email text := lower(btrim(coalesce(p->>'email', '')));
  v_whats text := regexp_replace(coalesce(p->>'whatsapp', ''), '\D', '', 'g');
  v_senha text := coalesce(p->>'senha', '');
  v_plano text := coalesce(nullif(p->>'plano', ''), 'profissional');
  v_paleta text := coalesce(nullif(p->>'paleta', ''), 'cafe-ouro');
  v_ip text := interno.ip_do_pedido();
  v_iph text; e public.empresas; c public.contas; v_passe text;
begin
  if char_length(v_nome) not between 2 and 60 then return jsonb_build_object('ok', false, 'campo', 'nome', 'erro', 'Informe o nome do salão.'); end if;
  if char_length(v_slug) < 3 or interno.slug_reservado(v_slug) then
    return jsonb_build_object('ok', false, 'campo', 'slug', 'erro', 'Escolha outro endereço (pelo menos 3 letras).');
  end if;
  if exists (select 1 from public.empresas where slug = v_slug) then
    return jsonb_build_object('ok', false, 'campo', 'slug', 'erro', 'Esse endereço já tem dona. Escolha outro.');
  end if;
  if char_length(v_dona) < 2 then return jsonb_build_object('ok', false, 'campo', 'dona_nome', 'erro', 'Informe o seu nome.'); end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'campo', 'email', 'erro', 'Confira o e-mail.'); end if;
  if exists (select 1 from public.contas where email = v_email) then
    return jsonb_build_object('ok', false, 'campo', 'email', 'erro', 'Esse e-mail já tem um painel. Use outro ou entre pelo endereço do seu salão.',
                              'outro_endereco', interno.endereco_da_conta(v_email));
  end if;
  if v_whats ~ '^[0-9]{10,11}$' then v_whats := '55' || v_whats; end if;
  if v_whats !~ '^55[0-9]{10,11}$' then return jsonb_build_object('ok', false, 'campo', 'whatsapp', 'erro', 'Informe o WhatsApp com DDD.'); end if;
  if char_length(v_senha) < 8 then return jsonb_build_object('ok', false, 'campo', 'senha', 'erro', 'A senha precisa ter pelo menos 8 caracteres.'); end if;
  if not exists (select 1 from public.planos where codigo = v_plano and visivel) then v_plano := 'profissional'; end if;
  if v_paleta !~ '^[a-z-]{3,24}$' then v_paleta := 'cafe-ouro'; end if;

  -- freio contra robôs: 3 salões por internet por dia; 20 por hora no total
  if v_ip is not null then
    v_iph := interno.hash(v_ip);
    if (select count(*) from interno.cadastros where ip_hash = v_iph and criado_em > now() - interval '24 hours') >= 3 then
      return jsonb_build_object('ok', false, 'erro', 'Muitos salões criados desta internet hoje. Fale com a gente pelo WhatsApp.');
    end if;
  end if;
  if (select count(*) from interno.cadastros where criado_em > now() - interval '1 hour') >= 20 then
    return jsonb_build_object('ok', false, 'erro', 'Muitos cadastros agora. Tente de novo em alguns minutos.');
  end if;

  begin
    insert into public.empresas (slug, nome, modulos, config, paleta, plano, origem)
    values (v_slug, v_nome, '{"agenda": true, "curso": false, "rede": false, "promocoes": true, "natal": true}'::jsonb,
            jsonb_build_object('contato', split_part(v_dona, ' ', 1), 'titulo', v_nome, 'ola', 'Olá, seja bem-vinda',
                               'whatsapp', v_whats, 'instagram', ''),
            v_paleta, v_plano, 'cadastro')
    returning * into e;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'campo', 'slug', 'erro', 'Esse endereço acabou de ser escolhido. Tente outro.');
  end;
  insert into public.horario_funcionamento (empresa_id, dia_semana, abre, fecha)
  select e.id, d, '09:00', '18:00' from generate_series(2, 6) d;
  insert into public.contas (empresa_id, papel, nome, email, senha_hash)
  values (e.id, 'admin', v_dona, v_email, interno.senha_hash(v_senha)) returning * into c;
  insert into interno.cadastros (ip_hash) values (v_iph);

  v_passe := encode(extensions.gen_random_bytes(24), 'hex');
  insert into interno.passes (hash, conta_id, empresa_id, expira) values (interno.hash(v_passe), c.id, e.id, now() + interval '10 minutes');
  delete from interno.passes where expira < now();

  return jsonb_build_object('ok', true, 'slug', e.slug, 'endereco', 'https://' || e.slug || '.tonsdellas.com.br',
                            'passe', v_passe, 'teste_ate', e.teste_ate);
end;
$$;

-- no endereço do salão: troca o passe por uma sessão
create or replace function public.admin_entrar_passe(p_passe text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare x interno.passes; c public.contas;
begin
  delete from interno.passes where hash = interno.hash(coalesce(p_passe, '')) returning * into x;
  if x.hash is null or x.expira < now() or x.empresa_id is distinct from interno.empresa_atual() then
    return jsonb_build_object('ok', false, 'erro', 'Link de entrada expirado. Entre com seu e-mail e senha.');
  end if;
  select * into c from public.contas where id = x.conta_id;
  return jsonb_build_object('ok', true, 'papel', c.papel, 'nome', c.nome, 'token', interno.nova_sessao(c.id, 30));
end;
$$;

revoke all on function public.slug_disponivel(text), public.criar_salao(jsonb), public.admin_entrar_passe(text) from public;
grant execute on function public.slug_disponivel(text), public.criar_salao(jsonb), public.admin_entrar_passe(text) to anon, authenticated;
