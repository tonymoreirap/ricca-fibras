// Capa e logo enviadas pela dona (ficam no banco, por salão)
import { rpcDoPedido } from "../../../../lib/empresaServidor";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return new Response("Não encontrado.", { status: 404 });
  const a = await rpcDoPedido("arquivo_ler", { p_id: id }).catch(() => null);
  if (!a) return new Response("Não encontrado.", { status: 404 });
  return new Response(Buffer.from(a.base64, "base64"), {
    headers: {
      "Content-Type": a.mime,
      // cada envio gera um id novo, então pode guardar por muito tempo
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
