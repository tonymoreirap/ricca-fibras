// Envia as notificações para os celulares da equipe.
// O banco chama esta rota só com o id de um envio; o conteúdo, os aparelhos e a
// chave de assinatura vêm do banco, e cada id só pode ser usado uma vez.
import webpush from "web-push";
import { rpc } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  let id;
  try {
    ({ id } = await req.json());
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) return Response.json({ ok: false }, { status: 400 });

  const envio = await rpc("push_pegar", { p_id: id }).catch(() => null);
  if (!envio) return Response.json({ ok: false }, { status: 404 });

  webpush.setVapidDetails("mailto:tonymoreirap@gmail.com", envio.publica, envio.privada);
  const carga = JSON.stringify(envio.mensagem);
  const mortos = [];
  let enviados = 0;
  await Promise.all(
    envio.inscricoes.map((s) =>
      webpush
        .sendNotification(s, carga, { TTL: 6 * 3600, urgency: "high", topic: (envio.mensagem.tag || "").slice(0, 32) || undefined })
        .then(() => enviados++)
        .catch((e) => {
          if (e.statusCode === 404 || e.statusCode === 410) mortos.push(s.endpoint);
        })
    )
  );
  if (mortos.length) await rpc("push_descartar", { p_id: id, p_endpoints: mortos }).catch(() => {});
  return Response.json({ ok: true, enviados, removidos: mortos.length });
}
