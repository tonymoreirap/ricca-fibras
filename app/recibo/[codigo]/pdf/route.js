import { gerarReciboPdf } from "../../../../lib/reciboPdf";
import { recursosPdf, nomeArquivo } from "../../../../lib/recursosPdf";
import { empresaDoPedido, rpcDoPedido } from "../../../../lib/empresaServidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { codigo } = await params;
  const limpo = String(codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  try {
    const salao = await empresaDoPedido();
    if (!salao) return new Response("Salão não encontrado.", { status: 404 });
    const lista = await rpcDoPedido("consultar_agendamento", { p_codigo: limpo });
    if (!lista?.length) return new Response("Recibo não encontrado.", { status: 404 });
    const a = lista[0];
    const origem = new URL(request.url).origin;
    const bytes = await gerarReciboPdf(a, await recursosPdf(salao), {
      nome: salao.nome,
      contato: salao.contato,
      pix: salao.pix,
      urlRecibo: `${origem}/recibo/${a.codigo}`,
    });
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Recibo-${a.codigo}-${nomeArquivo(salao.nome)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response("Não foi possível gerar o recibo agora. Tente novamente.", { status: 500 });
  }
}
