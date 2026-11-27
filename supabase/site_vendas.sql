-- =====================================================================
-- SITE DE VENDAS (tonsdellas.com.br)
--  * assinatura paga na hora: o salão nasce aguardando o 1º pagamento
--    (fora do ar para as clientes) e vai ao ar quando o Mercado Pago aprova
--  * mensagens do formulário de contato, lidas no Master
-- =====================================================================

-- 1) salão criado pelo site começa aguardando o pagamento
do $$
declare d text := pg_get_functiondef('public.criar_salao(jsonb)'::regprocedure);
begin
  d := replace(d, 'insert into public.empresas (slug, nome, modulos, config, paleta, plano, origem)',
                  'insert into public.empresas (slug, nome, modulos, config, paleta, plano, origem, situacao, teste_ate)');
  d := replace(d, E'            v_paleta, v_plano, ''cadastro'')',
                  E'            v_paleta, v_plano, ''cadastro'', ''suspensa'', null)');
  d := replace(d, E'''passe'', v_passe, ''teste_ate'', e.teste_ate);',
                  E'''passe'', v_passe, ''teste_ate'', e.teste_ate, ''plano'', e.plano, ''pagar'', true);');
  if position('''suspensa'', null)' in d) = 0 or position('''pagar'', true' in d) = 0 then raise exception 'troca criar_salao falhou'; end if;
  execute d;
end $$;

-- 2) o app sabe quando é um salão estreando (ainda sem o 1º pagamento)
do $$
declare d text := pg_get_functiondef('public.empresa_publica'::regproc);
begin
  d := replace(d, E'    ''suspensa'', r.situacao = ''suspensa'',',
                  E'    ''suspensa'', r.situacao = ''suspensa'',\n    ''estreia'', r.situacao = ''suspensa'' and r.vence_em is null and r.origem = ''cadastro'',');
  if position('estreia' in d) = 0 then raise exception 'troca empresa_publica falhou'; end if;
  execute d;
end $$;

-- 3) contato do site
create table if not exists public.contatos (
  id         bigserial primary key,
  nome       text not null check (char_length(nome) between 2 and 80),
  email      text,
  whatsapp   text,
  salao      text,
  porte      text,
  mensagem   text not null check (char_length(mensagem) between 5 and 2000),
  ip_hash    text,
  lida       boolean not null default false,
  criado_em  timestamptz not null default now()
);
alter table public.contatos enable row level security;
revoke all on public.contatos from anon, authenticated;

create or replace function public.enviar_contato(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_nome text := btrim(coalesce(p->>'nome', ''));
  v_email text := lower(btrim(coalesce(p->>'email', '')));
  v_whats text := regexp_replace(coalesce(p->>'whatsapp', ''), '\D', '', 'g');
  v_msg text := btrim(coalesce(p->>'mensagem', ''));
  v_ip text := interno.ip_do_pedido(); v_iph text;
begin
  if coalesce(p->>'site', '') <> '' then return jsonb_build_object('ok', true); end if; -- campo-isca de robô
  if char_length(v_nome) < 2 then return jsonb_build_object('ok', false, 'erro', 'Informe o seu nome.'); end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(v_whats) < 10 then
    return jsonb_build_object('ok', false, 'erro', 'Deixe um e-mail ou WhatsApp para a resposta.');
  end if;
  if char_length(v_msg) < 5 then return jsonb_build_object('ok', false, 'erro', 'Escreva a sua mensagem.'); end if;
  if v_ip is not null then
    v_iph := interno.hash(v_ip);
    if (select count(*) from public.contatos where ip_hash = v_iph and criado_em > now() - interval '1 hour') >= 5 then
      return jsonb_build_object('ok', false, 'erro', 'Recebemos suas mensagens. Aguarde a resposta ou chame no WhatsApp.');
    end if;
  end if;
  insert into public.contatos (nome, email, whatsapp, salao, porte, mensagem, ip_hash)
  values (left(v_nome, 80), nullif(v_email, ''), nullif(v_whats, ''), left(nullif(btrim(coalesce(p->>'salao', '')), ''), 80),
          left(nullif(p->>'porte', ''), 30), left(v_msg, 2000), v_iph);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.master_contatos(p_token text, p_marcar_lidas boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare r jsonb;
begin
  perform interno.so_master(p_token);
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'email', c.email, 'whatsapp', c.whatsapp, 'salao', c.salao,
           'porte', c.porte, 'mensagem', c.mensagem, 'lida', c.lida, 'criado_em', c.criado_em) order by c.criado_em desc), '[]'::jsonb)
  into r from (select * from public.contatos order by criado_em desc limit 50) c;
  if p_marcar_lidas then update public.contatos set lida = true where lida = false; end if;
  return jsonb_build_object('ok', true, 'mensagens', r, 'novas', (select count(*) from public.contatos where not lida));
end;
$$;

revoke all on function public.enviar_contato(jsonb), public.master_contatos(text, boolean) from public;
grant execute on function public.enviar_contato(jsonb), public.master_contatos(text, boolean) to anon, authenticated;
