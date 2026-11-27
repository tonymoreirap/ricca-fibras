-- Agenda flexível:
--  * o salão escolhe se cobra sinal (config.agenda.sinal) e até quando a cliente cancela (config.agenda.cancelar_horas)
--  * sem sinal: cliente de confiança já sai confirmada; cliente nova recebe um código (TD-1234) para mandar ao salão
--    pelo WhatsApp, e o salão confirma no painel. Sem confirmação, a reserva cai sozinha.
--  * a cliente cancela pelo app dizendo o motivo
--  * um horário por dia para o mesmo celular, a não ser em categorias diferentes (ex.: Unhas e Cílios)

-- 1. colunas novas ------------------------------------------------------------------------------
alter table public.agendamentos
  add column if not exists codigo_confirmacao text,
  add column if not exists confirmacao_pedida_em timestamptz,
  add column if not exists cancelado_em timestamptz,
  add column if not exists cancelado_por text,
  add column if not exists motivo_cancelamento text,
  add column if not exists origem_ip text;
alter table public.agendamentos drop constraint if exists agendamentos_cancelado_por_check;
alter table public.agendamentos add constraint agendamentos_cancelado_por_check check (cancelado_por in ('cliente', 'salao', 'sistema'));
alter table public.agendamentos drop constraint if exists agendamentos_motivo_check;
alter table public.agendamentos add constraint agendamentos_motivo_check check (char_length(motivo_cancelamento) <= 200);

alter table public.servicos_agenda add column if not exists categoria text;
alter table public.servicos_agenda drop constraint if exists servicos_agenda_categoria_check;
alter table public.servicos_agenda add constraint servicos_agenda_categoria_check check (char_length(categoria) <= 30);

-- 2. status "aguardando_confirmacao" (segura o horário como os outros) -------------------------------
alter table public.agendamentos drop constraint agendamentos_status_check;
alter table public.agendamentos add constraint agendamentos_status_check
  check (status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado', 'cancelado', 'concluido'));
alter table public.agendamentos drop constraint agendamentos_sem_conflito_prof;
alter table public.agendamentos add constraint agendamentos_sem_conflito_prof
  exclude using gist (empresa_id with =, profissional_id with =, tstzrange(inicio, fim) with &&)
  where (status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado') and not demo);

-- 3. configuração do salão ---------------------------------------------------------------------
create or replace function interno.config_agenda()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'sinal', coalesce((e.config->'agenda'->>'sinal')::boolean, true),
    'cancelar_horas', coalesce((e.config->'agenda'->>'cancelar_horas')::int, 2))
  from public.empresas e where e.id = interno.empresa_atual();
$$;

create or replace function interno.cobra_sinal()
returns boolean language sql stable set search_path = '' as $$
  select coalesce((interno.config_agenda()->>'sinal')::boolean, true);
$$;

-- cliente de confiança: número já conferido pelo salão ou que já foi atendido
create or replace function interno.cliente_confiavel(p_conta uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.contas c
    where c.id = p_conta and c.papel = 'cliente' and not c.precisa_confirmar
      and (c.verificado or exists (select 1 from public.agendamentos a
                                   where a.conta_id = c.id and a.status in ('confirmado', 'concluido') and not a.demo)));
$$;

grant execute on function interno.config_agenda(), interno.cobra_sinal(), interno.cliente_confiavel(uuid) to app_dono;

-- 4. inserir agendamento --------------------------------------------------------------------------
create or replace function interno.inserir_agendamento_eq(
  p_servico text, p_inicio timestamptz, p_nome text, p_celular text,
  p_conta uuid, p_por text, p_status text, p_prof uuid)
returns public.agendamentos
language plpgsql security definer set search_path = '' as $$
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
  v_codigo text;
  v_cobra boolean := interno.cobra_sinal();
  v_ip    text := interno.ip_do_pedido();
  v_iph   text;
  v_cat   text;
  m record;
begin
  if (select x.situacao from public.empresas x where x.id = interno.empresa_atual()) = 'suspensa' then
    raise exception 'A agenda deste salão está fora do ar no momento.';
  end if;
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

  if not v_admin then
    if (select count(*) from public.agendamentos a
        where a.cliente_celular = v_cel and a.status in ('aguardando_sinal', 'aguardando_confirmacao') and a.inicio > now()) >= 2 then
      raise exception 'Você já tem horários esperando confirmação. Fale com o salão pelo WhatsApp.';
    end if;

    if v_ip is not null then v_iph := interno.hash(v_ip); end if;
    if p_status = 'aguardando_confirmacao' and v_iph is not null and (select count(*) from public.agendamentos a
        where a.origem_ip = v_iph and a.status = 'aguardando_confirmacao' and a.criado_em > now() - interval '24 hours') >= 3 then
      raise exception 'Muitas reservas sem confirmação feitas deste aparelho. Fale com o salão pelo WhatsApp.';
    end if;

    -- um horário por dia, a não ser em outro tipo de serviço
    v_cat := lower(btrim(coalesce(v_serv.categoria, '')));
    if exists (
        select 1 from public.agendamentos a
        join public.servicos_agenda s2 on s2.empresa_id = a.empresa_id and s2.codigo = a.servico
        where a.cliente_celular = v_cel and not a.demo
          and a.status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado')
          and (a.inicio at time zone 'America/Fortaleza')::date = v_local::date
          and lower(btrim(coalesce(s2.categoria, ''))) = v_cat) then
      if v_cat = '' then
        raise exception 'Você já tem um horário marcado neste dia. Para marcar mais um no mesmo dia, fale com o salão pelo WhatsApp.';
      end if;
      raise exception 'Você já tem um horário de % neste dia. Para marcar mais um, fale com o salão pelo WhatsApp.', btrim(v_serv.categoria);
    end if;
  end if;

  if p_prof is not null and not exists (
      select 1 from interno.equipe_valida() q
      where q.id = p_prof and (cardinality(q.servicos) = 0 or v_serv.codigo = any(q.servicos))) then
    raise exception 'Essa profissional não está disponível para este serviço. Escolha outra.';
  end if;

  v_valor := coalesce((interno.promo_do_servico(v_serv.codigo)).preco_promo, v_serv.valor);

  for m in
    select e.id, e.nome from interno.equipe_valida() e
    where (p_prof is null or e.id = p_prof)
      and (cardinality(e.servicos) = 0 or v_serv.codigo = any(e.servicos))
    order by (select count(*) from public.agendamentos a
              where a.profissional_id = e.id and a.status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado')
                and (a.inicio at time zone 'America/Fortaleza')::date = v_local::date),
             e.ordem, e.criado_em
  loop
    begin
      v_codigo := 'RF' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      insert into public.agendamentos
        (codigo, servico, servico_nome, cliente_nome, cliente_celular, inicio, fim, valor, sinal, status,
         conta_id, criado_por, profissional_id, profissional_nome, codigo_confirmacao, origem_ip)
      values
        (v_codigo, v_serv.codigo, v_serv.nome, v_nome, v_cel, p_inicio, p_inicio + make_interval(mins => v_serv.duracao_min),
         v_valor, case when v_cobra then round(v_valor * v_serv.sinal_pct / 100, 2) else 0 end, p_status, p_conta, p_por, m.id, m.nome,
         case when p_status = 'aguardando_confirmacao' then 'TD-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0') end,
         case when not v_admin then v_iph end)
      returning * into v_reg;
      return v_reg;
    exception when exclusion_violation then
      null; -- essa está ocupada: tenta a próxima
    end;
  end loop;

  if p_prof is null and not exists (select 1 from interno.equipe_valida()) then
    raise exception 'O salão ainda não tem profissionais na agenda.';
  end if;
  raise exception 'Esse horário acabou de ser reservado. Escolha outro.';
end;
$$;

-- 5. agendar pelo app ------------------------------------------------------------------------------
create or replace function public.agendar_com(p_servico text, p_inicio timestamptz, p_nome text, p_celular text,
                                              p_senha text, p_token text, p_profissional uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.contas; v_token text; v_erro text; v_reg public.agendamentos;
  v_cel text := interno.celular(p_celular); v_sem_sessao boolean := false; v_hist boolean;
  v_autenticada boolean := false; v_status text; v_cobra boolean;
begin
  if coalesce(p_token, '') <> '' then
    select c.* into v from public.sessoes s join public.contas c on c.id = s.conta_id
    where s.token_hash = interno.hash(p_token) and s.expira_em > now() and c.papel = 'cliente';
    v_autenticada := v.id is not null;
  end if;

  if v.id is null then
    if v_cel is null then return jsonb_build_object('ok', false, 'erro', 'Celular inválido.'); end if;
    select * into v from public.contas where papel = 'cliente' and celular = v_cel;
    if found and v.senha_hash is not null then
      v_erro := interno.senha_ok(v, p_senha);
      if v_erro is not null then
        return jsonb_build_object('ok', false, 'erro', 'Esse celular já tem conta. ' || v_erro, 'tem_conta', true);
      end if;
      v_token := interno.nova_sessao(v.id, 90);
      v_autenticada := true;
    elsif found then
      v_sem_sessao := true;
    else
      v_hist := interno.tem_historico(v_cel);
      insert into public.contas (papel, nome, celular, senha_hash)
      values ('cliente', btrim(p_nome), v_cel, interno.senha_hash(p_senha)) returning * into v;
      if v_hist then perform interno.marcar_confirmacao(v.id); end if;
      v_token := interno.nova_sessao(v.id, 90);
    end if;
  end if;

  v_cobra := interno.cobra_sinal()
    and coalesce((select s.sinal_pct from public.servicos_agenda s where s.codigo = p_servico), 0) > 0;
  v_status := case
    when v_cobra then 'aguardando_sinal'
    when v_autenticada and interno.cliente_confiavel(v.id) then 'confirmado'
    else 'aguardando_confirmacao' end;

  v_reg := interno.inserir_agendamento_eq(p_servico, p_inicio, coalesce(nullif(btrim(p_nome), ''), v.nome), v.celular, v.id,
                                          'cliente', v_status, p_profissional);
  return jsonb_build_object('ok', true, 'token', v_token, 'nome', v.nome, 'sem_sessao', v_sem_sessao,
    'agendamento', interno.json_agendamento(v_reg));
end;
$$;

create or replace function public.agendar(p_servico text, p_inicio timestamptz, p_nome text, p_celular text, p_senha text, p_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  return public.agendar_com(p_servico, p_inicio, p_nome, p_celular, p_senha, p_token, null);
end;
$$;

-- 6. JSON do agendamento -------------------------------------------------------------------------
create or replace function interno.json_agendamento(a public.agendamentos)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'codigo', a.codigo, 'servico', a.servico, 'servico_nome', a.servico_nome,
    'cliente_nome', a.cliente_nome, 'cliente_celular', a.cliente_celular,
    'inicio', a.inicio, 'fim', a.fim, 'valor', a.valor, 'sinal', a.sinal,
    'status', a.status, 'criado_por', a.criado_por, 'criado_em', a.criado_em,
    'atualizado_em', a.atualizado_em, 'pix_informado_em', a.pix_informado_em, 'demo', a.demo,
    'profissional_id', a.profissional_id, 'profissional_nome', a.profissional_nome,
    'codigo_confirmacao', a.codigo_confirmacao, 'confirmacao_pedida_em', a.confirmacao_pedida_em,
    'cancelado_em', a.cancelado_em, 'cancelado_por', a.cancelado_por, 'motivo_cancelamento', a.motivo_cancelamento);
$$;

-- 7. aviso para a dona ---------------------------------------------------------------------------
create or replace function interno.aviso_reserva()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not new.demo and new.criado_por = 'cliente' then
    perform interno.enviar_push(
      case when new.status = 'aguardando_confirmacao' then 'Nova reserva para confirmar' else 'Nova reserva' end,
      split_part(new.cliente_nome, ' ', 1) || ' · ' || new.servico_nome || ' · '
      || to_char(new.inicio at time zone 'America/Fortaleza', 'DD/MM "às" HH24"h"MI')
      || case new.status
           when 'aguardando_sinal' then ' · aguardando sinal de R$ ' || to_char(new.sinal, 'FM999G990D00')
           when 'aguardando_confirmacao' then ' · cliente nova: ela vai te mandar o código ' || new.codigo_confirmacao || ' no WhatsApp'
           else ' · já confirmada' end,
      '/admin', 'reserva-' || new.codigo);
  end if;
  return new;
end;
$$;

-- 8. a cliente avisa que mandou o código ------------------------------------------------------------
create or replace function public.reserva_pedir_confirmacao(p_codigo text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.agendamentos; v_antes timestamptz;
begin
  select * into a from public.agendamentos where codigo = upper(btrim(p_codigo)) and status = 'aguardando_confirmacao';
  if not found then return jsonb_build_object('ok', false); end if;
  v_antes := a.confirmacao_pedida_em;
  update public.agendamentos set confirmacao_pedida_em = now() where id = a.id;
  if not a.demo and (v_antes is null or v_antes < now() - interval '10 minutes') then
    perform interno.enviar_push('Código de confirmação',
      split_part(a.cliente_nome, ' ', 1) || ' enviou o código ' || a.codigo_confirmacao || ' pelo WhatsApp para o horário de '
      || to_char(a.inicio at time zone 'America/Fortaleza', 'DD/MM "às" HH24"h"MI') || '. Confira o número e confirme no painel.',
      '/admin', 'codigo-' || a.codigo);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 9. detalhes extras do recibo (código, cancelamento) -------------------------------------------------
create or replace function public.reserva_extra(p_codigo text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('ok', true,
    'status', a.status,
    'codigo_confirmacao', case when a.status = 'aguardando_confirmacao' then a.codigo_confirmacao end,
    'confirmacao_pedida_em', a.confirmacao_pedida_em,
    'confirmacao_expira', case when a.status = 'aguardando_confirmacao'
                               then least(case when a.confirmacao_pedida_em is null then a.criado_em + interval '12 hours' end, a.inicio) end,
    'cancelado_em', a.cancelado_em, 'cancelado_por', a.cancelado_por, 'motivo', a.motivo_cancelamento,
    'cancelar_horas', coalesce((interno.config_agenda()->>'cancelar_horas')::int, 2))
  from public.agendamentos a where a.codigo = upper(btrim(p_codigo));
$$;

-- 10. a cliente cancela ------------------------------------------------------------------------------
create or replace function public.cliente_cancelar(p_token text, p_codigo text, p_motivo text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.contas; a public.agendamentos;
  v_h integer := coalesce((interno.config_agenda()->>'cancelar_horas')::int, 2);
  v_mot text := left(btrim(coalesce(p_motivo, '')), 200);
begin
  v := interno.conta_da_sessao(p_token, array['cliente']);
  select * into a from public.agendamentos x where x.codigo = upper(btrim(p_codigo))
    and (x.conta_id = v.id or (x.cliente_celular = v.celular and v.verificado and not v.precisa_confirmar));
  if not found then return jsonb_build_object('ok', false, 'erro', 'Esse horário não está na sua conta.'); end if;
  if a.status not in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado') then
    return jsonb_build_object('ok', false, 'erro', 'Esse horário não pode mais ser cancelado.');
  end if;
  if a.inicio <= now() then return jsonb_build_object('ok', false, 'erro', 'Esse horário já passou.'); end if;
  if char_length(v_mot) < 3 then return jsonb_build_object('ok', false, 'erro', 'Conte o motivo do cancelamento.'); end if;
  if a.status = 'confirmado' then
    if v_h = 0 then
      return jsonb_build_object('ok', false, 'falar_com_salao', true, 'erro', 'Para cancelar, fale com o salão pelo WhatsApp.');
    end if;
    if a.inicio < now() + make_interval(hours => v_h) then
      return jsonb_build_object('ok', false, 'falar_com_salao', true,
        'erro', 'Faltam menos de ' || v_h || case when v_h = 1 then ' hora' else ' horas' end
                || ' para o horário. Para cancelar agora, fale com o salão pelo WhatsApp.');
    end if;
  end if;
  update public.agendamentos set status = 'cancelado', cancelado_em = now(), cancelado_por = 'cliente',
    motivo_cancelamento = v_mot, atualizado_em = now()
  where id = a.id returning * into a;
  if not a.demo then
    perform interno.enviar_push('Cliente cancelou',
      split_part(a.cliente_nome, ' ', 1) || interno.com_quem(a) || ' cancelou ' || a.servico_nome || ' de '
      || to_char(a.inicio at time zone 'America/Fortaleza', 'DD/MM "às" HH24"h"MI') || '. Motivo: ' || v_mot,
      '/admin', 'cancelou-' || a.codigo);
  end if;
  return jsonb_build_object('ok', true, 'agendamento', interno.json_agendamento(a));
end;
$$;

-- 11. a dona muda o status ----------------------------------------------------------------------------
create or replace function public.admin_status(p_token text, p_codigo text, p_status text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.contas; a public.agendamentos; v_antes text;
begin
  v := interno.conta_da_sessao(p_token, array['admin', 'master']);
  select * into a from public.agendamentos where codigo = upper(btrim(p_codigo));
  if not found then return jsonb_build_object('ok', false, 'erro', 'Agendamento não encontrado.'); end if;
  v_antes := a.status;
  if not (
    (a.status in ('aguardando_sinal', 'aguardando_confirmacao') and p_status in ('confirmado', 'cancelado')) or
    (a.status = 'confirmado' and p_status in ('concluido', 'cancelado', 'aguardando_sinal')) or
    (a.status = 'concluido' and p_status = 'confirmado') or
    (a.status = 'cancelado' and p_status in ('aguardando_sinal', 'confirmado'))
  ) then
    return jsonb_build_object('ok', false, 'erro', 'Mudança de status não permitida.');
  end if;
  begin
    update public.agendamentos set status = p_status, atualizado_em = now(),
      cancelado_em = case when p_status = 'cancelado' then now() end,
      cancelado_por = case when p_status = 'cancelado' then 'salao' end,
      motivo_cancelamento = case when p_status = 'cancelado' then null end
    where id = a.id returning * into a;
  exception when exclusion_violation then
    return jsonb_build_object('ok', false, 'erro', 'Esse horário já foi ocupado por outro agendamento.');
  end;
  if p_status = 'confirmado' and v_antes = 'aguardando_confirmacao' and a.conta_id is not null then
    -- o código veio do WhatsApp da cliente: o número é dela
    update public.contas set verificado = true, precisa_confirmar = false, confirmada_em = coalesce(confirmada_em, now()),
      confirmacao_codigo = null
    where id = a.conta_id and papel = 'cliente';
  elsif p_status = 'confirmado' then
    update public.contas set verificado = true
    where papel = 'cliente' and celular = a.cliente_celular and not precisa_confirmar;
  end if;
  return jsonb_build_object('ok', true, 'agendamento', interno.json_agendamento(a));
end;
$$;

-- 12. reservas sem confirmação caem sozinhas ------------------------------------------------------------
create or replace function interno.expirar_confirmacoes()
returns void language sql security definer set search_path = '' as $$
  update public.agendamentos set status = 'cancelado', cancelado_em = now(), cancelado_por = 'sistema',
    motivo_cancelamento = 'O código de confirmação não foi enviado a tempo.', atualizado_em = now()
  where status = 'aguardando_confirmacao'
    and (inicio < now() or (confirmacao_pedida_em is null and criado_em < now() - interval '12 hours'));
$$;
select cron.schedule('agendamentos-expirar', '*/15 * * * *', 'select interno.expirar_confirmacoes()');

-- 13. lista de serviços com o sinal do salão ---------------------------------------------------------------
create or replace function public.servicos_agendaveis()
returns table(codigo text, nome text, valor numeric, duracao_min integer, sinal_pct numeric, sinal numeric, valor_cheio numeric, promocao text)
language sql stable security definer set search_path = '' as $$
  select s.codigo, s.nome, coalesce(pr.preco_promo, s.valor), s.duracao_min,
         case when interno.cobra_sinal() then s.sinal_pct else 0 end,
         case when interno.cobra_sinal() then round(coalesce(pr.preco_promo, s.valor) * s.sinal_pct / 100, 2) else 0 end,
         case when pr.id is not null then s.valor end, pr.titulo
  from public.servicos_agenda s
  left join lateral (select * from interno.promo_do_servico(s.codigo)) pr on pr.id is not null
  where s.ativo and s.visivel and s.valor is not null
  order by s.ordem;
$$;

-- 14. novas funções: dono certo (RLS por salão) e quem pode chamar -----------------------------------------
alter function public.reserva_pedir_confirmacao(text) owner to app_dono;
alter function public.reserva_extra(text) owner to app_dono;
alter function public.cliente_cancelar(text, text, text) owner to app_dono;
revoke all on function public.reserva_pedir_confirmacao(text), public.reserva_extra(text), public.cliente_cancelar(text, text, text) from public;
grant execute on function public.reserva_pedir_confirmacao(text), public.reserva_extra(text), public.cliente_cancelar(text, text, text) to anon, authenticated;

-- 15. ajustes pontuais em funções longas (troca de trechos) -------------------------------------------------
create or replace function pg_temp.trocar(p_fn regprocedure, p_de text, p_para text)
returns void language plpgsql as $$
declare d text := pg_get_functiondef(p_fn);
begin
  if position(p_de in d) = 0 then raise exception 'trecho não encontrado em %: %', p_fn, left(p_de, 80); end if;
  execute replace(d, p_de, p_para);
end;
$$;

-- horários ocupados, listas e lembretes passam a contar a reserva a confirmar
select pg_temp.trocar('public.horarios_ocupados(date, date)'::regprocedure,
  $x$status in ('aguardando_sinal', 'confirmado')$x$, $x$status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado')$x$);
select pg_temp.trocar('public.horarios_ocupados_equipe(date, date)'::regprocedure,
  $x$status in ('aguardando_sinal', 'confirmado')$x$, $x$status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado')$x$);
select pg_temp.trocar('public.admin_equipe(text)'::regprocedure,
  $x$status in ('aguardando_sinal', 'confirmado')$x$, $x$status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado')$x$);
select pg_temp.trocar('interno.lembrete_proximo()'::regprocedure,
  $x$status in ('aguardando_sinal', 'confirmado')$x$, $x$status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado')$x$);
select pg_temp.trocar('interno.lista_dia(date)'::regprocedure,
  $x$status in ('aguardando_sinal', 'confirmado')$x$, $x$status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado')$x$);
select pg_temp.trocar('interno.lista_dia(date)'::regprocedure,
  $x$case when a.status = 'aguardando_sinal' then ' (sinal pendente)' else '' end$x$,
  $x$case a.status when 'aguardando_sinal' then ' (sinal pendente)' when 'aguardando_confirmacao' then ' (a confirmar)' else '' end$x$);

-- painel: conta as reservas a confirmar
select pg_temp.trocar('public.admin_painel(text)'::regprocedure,
  $x$status in ('aguardando_sinal', 'confirmado', 'concluido')$x$, $x$status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado', 'concluido')$x$);
select pg_temp.trocar('public.admin_painel(text)'::regprocedure,
  $x$status in ('aguardando_sinal', 'confirmado')$x$, $x$status in ('aguardando_sinal', 'aguardando_confirmacao', 'confirmado')$x$);
select pg_temp.trocar('public.admin_painel(text)'::regprocedure,
  $x$'exemplos', (select$x$,
  $x$'confirmar', (select count(*) from public.agendamentos a where a.status = 'aguardando_confirmacao' and a.fim > now()),
      'exemplos', (select$x$);

-- agendamento feito pela dona: sem sinal no salão, já entra confirmado
select pg_temp.trocar('public.admin_agendar_com(text, text, timestamptz, text, text, boolean, uuid)'::regprocedure,
  $x$case when p_confirmado then 'confirmado' else 'aguardando_sinal' end$x$,
  $x$case when p_confirmado or not interno.cobra_sinal() then 'confirmado' else 'aguardando_sinal' end$x$);
select pg_temp.trocar('public.admin_agendar(text, text, timestamptz, text, text, boolean)'::regprocedure,
  $x$'aguardando_sinal'$x$, $x$case when interno.cobra_sinal() then 'aguardando_sinal' else 'confirmado' end$x$);

-- Meu salão: guarda as opções da agenda
select pg_temp.trocar('public.admin_empresa_salvar(text, jsonb)'::regprocedure,
  $x$  update public.empresas set nome = btrim(p->>'nome'), config = c,$x$,
  $x$  if p->'config' ? 'agenda' then
    c := c || jsonb_build_object('agenda', jsonb_build_object(
      'sinal', coalesce((p->'config'->'agenda'->>'sinal')::boolean, true),
      'cancelar_horas', greatest(0, least(72, coalesce((p->'config'->'agenda'->>'cancelar_horas')::int, 2)))));
  end if;

  update public.empresas set nome = btrim(p->>'nome'), config = c,$x$);

-- Serviços: categoria
select pg_temp.trocar('public.admin_servicos(text)'::regprocedure,
  $x$'ordem', s.ordem,$x$, $x$'ordem', s.ordem, 'categoria', s.categoria,$x$);
select pg_temp.trocar('public.admin_servico_salvar(text, jsonb)'::regprocedure,
  $x$  return jsonb_build_object('ok', true, 'codigo', s.codigo);$x$,
  $x$  if p ? 'categoria' then
    update public.servicos_agenda set categoria = nullif(left(btrim(p->>'categoria'), 30), '') where codigo = s.codigo;
  end if;
  return jsonb_build_object('ok', true, 'codigo', s.codigo);$x$);

-- mensagem que citava a Luana em todos os salões
select pg_temp.trocar('public.cliente_criar_conta(text, text, text, text)'::regprocedure,
  $x$Use o link de acesso que a Luana te enviou pelo WhatsApp, ou peça um novo a ela.$x$,
  $x$Use o link de acesso que o salão te enviou pelo WhatsApp, ou peça um novo.$x$);
