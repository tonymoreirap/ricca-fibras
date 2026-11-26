-- =====================================================================
-- ENTRAR COM GOOGLE
-- O app manda ao banco o comprovante que o Google entrega (ID token).
-- O banco confere esse comprovante direto no Google (tokeninfo), então
-- ninguém consegue entrar só informando um e-mail.
-- =====================================================================

create extension if not exists http with schema extensions;
grant execute on all functions in schema extensions to app_dono;

create table if not exists interno.parametros (chave text primary key, valor text not null default '');
insert into interno.parametros (chave, valor) values ('google_client_id', '') on conflict do nothing;
grant select on interno.parametros to app_dono;

alter table public.contas add column if not exists google_sub text;
alter table public.contas add column if not exists google_email text;
create unique index if not exists contas_google_por_empresa
  on public.contas (coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid), google_sub) where google_sub is not null;

-- quem entrou com Google mas ainda precisa informar o celular (vale 20 minutos)
create table if not exists interno.google_pendentes (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  sub        text not null,
  email      text,
  nome       text,
  criado_em  timestamptz not null default now()
);
grant select, insert, delete on interno.google_pendentes to app_dono;

-- confere o comprovante no Google e devolve os dados da conta Google
create or replace function interno.google_validar(p_credencial text, p_nonce text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare r record; j jsonb; v_cliente text;
begin
  select valor into v_cliente from interno.parametros where chave = 'google_client_id';
  if coalesce(v_cliente, '') = '' then raise exception 'Entrar com Google ainda não foi ativado.'; end if;
  if coalesce(p_credencial, '') !~ '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' or char_length(p_credencial) > 4096 then
    raise exception 'Login do Google inválido. Tente de novo.';
  end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '6000');
  select status, content into r from extensions.http_get('https://oauth2.googleapis.com/tokeninfo?id_token=' || p_credencial);
  if r.status <> 200 then raise exception 'Login do Google expirou. Tente de novo.'; end if;
  j := r.content::jsonb;
  if j->>'aud' <> v_cliente
     or j->>'iss' not in ('accounts.google.com', 'https://accounts.google.com')
     or (j->>'exp')::bigint < extract(epoch from now())
     or coalesce(j->>'email_verified', 'false') <> 'true'
     or coalesce(j->>'nonce', '') <> coalesce(p_nonce, '-') then
    raise exception 'Login do Google não confere. Tente de novo.';
  end if;
  return jsonb_build_object('sub', j->>'sub', 'email', lower(j->>'email'), 'nome', coalesce(j->>'name', j->>'given_name', ''));
end;
$$;
alter function interno.google_validar(text, text) owner to app_dono;

create or replace function public.google_entrar(p_credencial text, p_nonce text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare g jsonb; v public.contas; v_emp uuid := interno.empresa_atual(); v_id uuid; v_outro text;
begin
  if v_emp is null then return jsonb_build_object('ok', false, 'erro', 'Salão não encontrado.'); end if;
  begin
    g := interno.google_validar(p_credencial, p_nonce);
  exception when others then
    return jsonb_build_object('ok', false, 'erro', sqlerrm);
  end;

  -- já ligada ao Google neste salão (ou o master)
  select * into v from public.contas where google_sub = g->>'sub' order by (empresa_id is null) limit 1;
  -- dona ou master: o e-mail do Google é o e-mail cadastrado
  if not found then
    select * into v from public.contas where papel in ('admin', 'master') and email = g->>'email';
    if found then
      update public.contas set google_sub = g->>'sub', google_email = g->>'email' where id = v.id;
    else
      v_outro := interno.endereco_da_conta(g->>'email');
      if v_outro is not null then
        return jsonb_build_object('ok', false, 'erro', 'Seu painel fica em ' || v_outro || '. Entre por lá.');
      end if;
    end if;
  end if;

  if v.id is not null then
    if v.bloqueado_ate is not null and v.bloqueado_ate > now() then
      return jsonb_build_object('ok', false, 'erro', 'Acesso bloqueado por alguns minutos. Tente mais tarde.');
    end if;
    return jsonb_build_object('ok', true, 'papel', v.papel, 'nome', v.nome, 'celular', v.celular,
      'token', interno.nova_sessao(v.id, case when v.papel = 'cliente' then 90 else 30 end));
  end if;

  -- cliente nova (ou que ainda não ligou o Google): falta o celular
  delete from interno.google_pendentes where criado_em < now() - interval '20 minutes';
  insert into interno.google_pendentes (empresa_id, sub, email, nome) values (v_emp, g->>'sub', g->>'email', g->>'nome')
  returning id into v_id;
  return jsonb_build_object('ok', false, 'precisa_celular', true, 'ticket', v_id, 'nome', g->>'nome', 'email', g->>'email');
end;
$$;
alter function public.google_entrar(text, text) owner to app_dono;

-- liga o Google ao celular (cria a conta se não existir)
create or replace function public.google_vincular(p_ticket uuid, p_celular text, p_nome text, p_senha text default null, p_convite text default null)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare t interno.google_pendentes; v public.contas; v_cel text := interno.celular(p_celular);
  v_nome text := btrim(coalesce(p_nome, '')); v_erro text; v_contato text;
begin
  select * into t from interno.google_pendentes
  where id = p_ticket and empresa_id = interno.empresa_atual() and criado_em > now() - interval '20 minutes';
  if not found then return jsonb_build_object('ok', false, 'expirou', true, 'erro', 'O tempo para concluir acabou. Entre com o Google de novo.'); end if;
  if v_cel is null then return jsonb_build_object('ok', false, 'erro', 'Celular inválido.'); end if;
  select coalesce(nullif(config->>'contato', ''), 'o salão') into v_contato from public.empresas where id = t.empresa_id;

  select * into v from public.contas where papel = 'cliente' and celular = v_cel;
  if found and v.google_sub is not null and v.google_sub <> t.sub then
    return jsonb_build_object('ok', false, 'erro', 'Esse celular já está ligado a outra conta Google.');
  end if;
  if found and v.senha_hash is not null then
    -- já tem conta com senha: confirma com a senha uma vez
    if coalesce(p_senha, '') = '' then
      return jsonb_build_object('ok', false, 'pede_senha', true, 'erro', 'Esse celular já tem conta. Digite sua senha uma vez para ligar ao Google.');
    end if;
    v_erro := interno.senha_ok(v, p_senha);
    if v_erro is not null then return jsonb_build_object('ok', false, 'pede_senha', true, 'erro', v_erro); end if;
  elsif found then
    -- cadastro feito pelo salão: precisa do link de acesso que chegou no WhatsApp
    if v.convite_hash is null or v.convite_expira < now()
       or v.convite_hash <> interno.hash(upper(btrim(coalesce(p_convite, '')))) then
      return jsonb_build_object('ok', false, 'precisa_convite', true,
        'erro', 'Seu cadastro foi feito no salão. Abra o link de acesso que ' || v_contato || ' te enviou pelo WhatsApp e escolha Google por lá, ou peça um novo link.');
    end if;
    update public.contas set convite_hash = null, convite_expira = null, precisa_confirmar = false,
      confirmada_em = coalesce(confirmada_em, now()) where id = v.id;
  else
    if char_length(v_nome) < 2 then v_nome := coalesce(nullif(t.nome, ''), ''); end if;
    if char_length(v_nome) < 2 then return jsonb_build_object('ok', false, 'erro', 'Informe seu nome.'); end if;
    insert into public.contas (papel, nome, celular) values ('cliente', left(v_nome, 80), v_cel) returning * into v;
    if interno.tem_historico(v_cel) then perform interno.marcar_confirmacao(v.id); end if;
  end if;

  update public.contas set google_sub = t.sub, google_email = t.email where id = v.id returning * into v;
  delete from interno.google_pendentes where id = t.id;
  return jsonb_build_object('ok', true, 'papel', 'cliente', 'nome', v.nome, 'celular', v.celular, 'token', interno.nova_sessao(v.id, 90));
end;
$$;
alter function public.google_vincular(uuid, text, text, text, text) owner to app_dono;

-- o app só mostra o botão quando o Google estiver ativado
create or replace function public.google_ativo() returns text
language sql stable security definer set search_path = '' as $$
  select nullif(valor, '') from interno.parametros where chave = 'google_client_id';
$$;

revoke all on function public.google_entrar(text, text), public.google_vincular(uuid, text, text, text, text), public.google_ativo() from public;
grant execute on function public.google_entrar(text, text), public.google_vincular(uuid, text, text, text, text), public.google_ativo() to anon, authenticated, app_dono;
grant execute on all functions in schema interno to app_dono;
