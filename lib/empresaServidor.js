// Só no servidor: descobre o salão pelo endereço do pedido.
import { cache } from "react";
import { headers } from "next/headers";
import { rpc } from "./supabase";
import { montarSalao, SALAO_RICA } from "./empresa";
import { ehPlataforma } from "./plataforma";

export const hostDoPedido = cache(async () => {
  const h = await headers();
  return String(h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
});

const ehRica = (host) => !host || host === "ricafibras.tonsdellas.com.br" || host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app");

// é o site de vendas (tonsdellas.com.br)?
export const plataformaDoPedido = cache(async () => ehPlataforma(await hostDoPedido()));

export const empresaDoPedido = cache(async () => {
  const host = await hostDoPedido();
  if (ehPlataforma(host)) return null;
  try {
    const e = await rpc("empresa_publica", undefined, host || "ricafibras.tonsdellas.com.br");
    if (e) return montarSalao(e);
  } catch {}
  return ehRica(host) ? SALAO_RICA : null;
});

// rpc com o salão do endereço
export async function rpcDoPedido(nome, args) {
  return rpc(nome, args, (await hostDoPedido()) || "ricafibras.tonsdellas.com.br");
}
