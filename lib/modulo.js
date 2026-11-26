// Bloqueia uma área quando o módulo está desligado para o salão
import { notFound } from "next/navigation";
import { empresaDoPedido } from "./empresaServidor";

export async function exigirModulo(...nomes) {
  const s = await empresaDoPedido();
  if (!s || !nomes.some((n) => s.modulos?.[n])) notFound();
  return s;
}
