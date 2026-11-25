# Banco da Rica Fibras (Supabase)

Projeto: `rica-fibras` (sa-east-1) — https://tgqtmklnnpgvitnbkjnt.supabase.co

As migrações já foram aplicadas no projeto. Funções usadas pelo app:
- `servicos_agendaveis()` — serviços, preço, duração e sinal (30%)
- `horarios_ocupados(p_de, p_ate)` — só intervalos ocupados, sem dados de cliente
- `criar_agendamento(p_servico, p_inicio, p_nome, p_celular)` — valida tudo e reserva
- `consultar_agendamento(p_codigo)` — recibo pelo código

Preços, duração e horário de funcionamento ficam nas tabelas `servicos_agenda`
e `horario_funcionamento`.
