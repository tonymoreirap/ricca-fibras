-- =====================================================================
-- Nome da profissional no recibo, no PDF e nos avisos da dona.
-- Só aparece quando o salão tem mais de uma profissional ativa.
-- =====================================================================

-- " com Bia" quando o salão tem equipe; vazio quando é só a dona
create or replace function interno.com_quem(a public.agendamentos) returns text
language sql stable security definer set search_path = '' as $$
  select case when a.profissional_nome is not null
               and (select count(*) from public.equipe q where q.empresa_id = a.empresa_id and q.ativo) > 1
              then ' com ' || split_part(a.profissional_nome, ' ', 1) else '' end;
$$;
grant execute on function interno.com_quem(public.agendamentos) to app_dono;

-- recibo com a profissional (a função antiga fica para quem ainda a usa)
create or replace function public.consultar_reserva(p_codigo text)
returns table(codigo text, servico_nome text, cliente_nome text, inicio timestamptz, fim timestamptz, valor numeric,
              sinal numeric, status text, criado_em timestamptz, pix_informado_em timestamptz, profissional_nome text)
language sql stable security definer set search_path = '' as $$
  select a.codigo, a.servico_nome, a.cliente_nome, a.inicio, a.fim, a.valor, a.sinal, a.status, a.criado_em, a.pix_informado_em,
         case when interno.com_quem(a) <> '' then a.profissional_nome end
  from public.agendamentos a where a.codigo = upper(btrim(p_codigo));
$$;
alter function public.consultar_reserva(text) owner to app_dono;
grant execute on function public.consultar_reserva(text) to anon, authenticated;

-- resumo do dia e lembrete de 1 hora: "9h Ana com Bia"
create or replace function interno.lista_dia(p_dia date) returns text
language sql stable set search_path = '' as $$
  select string_agg(to_char(a.inicio at time zone 'America/Fortaleza', 'HH24"h"') || ' ' || split_part(a.cliente_nome, ' ', 1)
         || interno.com_quem(a)
         || case when a.status = 'aguardando_sinal' then ' (sinal pendente)' else '' end, ', ' order by a.inicio)
  from public.agendamentos a
  where not a.demo and a.status in ('aguardando_sinal', 'confirmado')
    and (a.inicio at time zone 'America/Fortaleza')::date = p_dia;
$$;

create or replace function interno.lembrete_proximo() returns void
language plpgsql security definer set search_path = '' as $$
declare a public.agendamentos;
begin
  for a in select * from public.agendamentos x where not x.demo and x.status in ('aguardando_sinal', 'confirmado')
           and x.inicio >= now() + interval '30 minutes' and x.inicio < now() + interval '90 minutes' loop
    perform interno.enviar_push('Daqui a 1 hora',
      split_part(a.cliente_nome, ' ', 1) || interno.com_quem(a) || ' às ' || to_char(a.inicio at time zone 'America/Fortaleza', 'HH24"h"MI') || ' · ' || a.servico_nome
      || case when a.status = 'aguardando_sinal' then ' · sinal ainda pendente' else '' end,
      '/admin', 'proximo-' || a.codigo);
  end loop;
end;
$$;
