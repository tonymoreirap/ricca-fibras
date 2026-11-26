import { gerarCertificadoPdf } from "../../../../lib/certificadoPdf";
import { recursosPdf, nomeArquivo } from "../../../../lib/recursosPdf";
import { empresaDoPedido, rpcDoPedido } from "../../../../lib/empresaServidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { codigo } = await params;
  const limpo = String(codigo || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
  const salao = await empresaDoPedido();
  if (!salao) return new Response("Salão não encontrado.", { status: 404 });
  const c = await rpcDoPedido("certificado_verificar", { p_codigo: limpo }).catch(() => null);
  if (!c) return new Response("Certificado não encontrado.", { status: 404 });
  const origem = new URL(request.url).origin;
  const bytes = await gerarCertificadoPdf(c, await recursosPdf(salao), {
    curso: salao.curso.nome,
    contato: salao.contato,
    salao: salao.nome,
    assinatura: salao.certificado.assinatura,
    cargo: salao.certificado.cargo || (salao.slug === "rica" ? "Criadora do método" : ""),
    texto: salao.certificado.texto,
    carga: salao.curso.carga_horaria,
    selo: salao.slug === "rica" ? ["MÉTODO", "RICA"] : null,
    urlVerificar: `${origem}/certificado/${c.codigo}`,
  });
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Certificado-${c.codigo}-${nomeArquivo(salao.curso.nome)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
