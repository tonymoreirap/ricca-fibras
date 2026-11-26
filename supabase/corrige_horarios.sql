-- O banco bloqueia DELETE sem WHERE nas chamadas do app (safeupdate).
-- admin_empresa_salvar apagava os horários contando só com o filtro por
-- empresa (RLS); agora o filtro vai explícito.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.admin_empresa_salvar(text, jsonb)'::regprocedure);
  d := replace(d, 'delete from public.horario_funcionamento;', 'delete from public.horario_funcionamento where empresa_id = e.id;');
  execute d;
end $$;
