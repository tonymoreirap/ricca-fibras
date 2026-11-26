import { createClient } from "@supabase/supabase-js";

// Chave publicável: pode ficar no app. O banco só aceita as funções do app,
// e cada chamada enxerga apenas o salão do endereço (Origin no navegador,
// x-empresa quando a chamada sai do servidor).
const URL = "https://tgqtmklnnpgvitnbkjnt.supabase.co";
const CHAVE = "sb_publishable_ewEiX2NvbJMN4rF6flK0YQ_RtAQqXx8";

export const supabase = createClient(URL, CHAVE, {
  auth: { persistSession: false },
});

const porHost = new Map();
function clienteDoHost(host) {
  if (!host) return supabase;
  if (!porHost.has(host)) {
    porHost.set(host, createClient(URL, CHAVE, { auth: { persistSession: false }, global: { headers: { "x-empresa": host } } }));
  }
  return porHost.get(host);
}

export async function rpc(nome, args, host) {
  const { data, error } = await clienteDoHost(host).rpc(nome, args);
  if (error) throw new Error(error.message || "Não foi possível falar com o servidor.");
  return data;
}
