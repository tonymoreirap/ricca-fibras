import { createClient } from "@supabase/supabase-js";

// Chave publicável: pode ficar no app. O banco só aceita as funções de agenda
// (servicos_agendaveis, horarios_ocupados, criar_agendamento, consultar_agendamento).
const URL = "https://tgqtmklnnpgvitnbkjnt.supabase.co";
const CHAVE = "sb_publishable_ewEiX2NvbJMN4rF6flK0YQ_RtAQqXx8";

export const supabase = createClient(URL, CHAVE, {
  auth: { persistSession: false },
});

export async function rpc(nome, args) {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw new Error(error.message || "Não foi possível falar com o servidor.");
  return data;
}
