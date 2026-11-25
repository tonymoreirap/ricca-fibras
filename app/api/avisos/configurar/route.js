// Primeira execução: gera o par de chaves das notificações e guarda no banco.
// O banco só aceita uma vez; depois disso esta rota apenas confirma que está pronto.
import webpush from "web-push";
import { rpc } from "../../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const atual = await rpc("push_chave_publica").catch(() => null);
  if (atual) return Response.json({ ok: true, pronto: true });
  const k = webpush.generateVAPIDKeys();
  const gravou = await rpc("push_registrar_chaves", { p_publica: k.publicKey, p_privada: k.privateKey }).catch(() => false);
  return Response.json({ ok: Boolean(gravou), pronto: Boolean(gravou) });
}
