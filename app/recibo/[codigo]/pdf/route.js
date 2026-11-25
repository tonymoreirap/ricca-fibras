import { readFile } from "node:fs/promises";
import path from "node:path";
import { rpc } from "../../../../lib/supabase";
import { gerarReciboPdf } from "../../../../lib/reciboPdf";
import { salao } from "../../../../content/salao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let recursos;
async function carregarRecursos() {
  if (recursos) return recursos;
  const pasta = path.join(process.cwd(), "assets", "pdf");
  const ler = (nome) => readFile(path.join(pasta, nome));
  const [marcellus, jostLight, jostRegular, jostMedium, monograma] = await Promise.all([
    ler("Marcellus-Regular.ttf"),
    ler("Jost-Light.ttf"),
    ler("Jost-Regular.ttf"),
    ler("Jost-Medium.ttf"),
    ler("monograma.png"),
  ]);
  recursos = { marcellus, jostLight, jostRegular, jostMedium, monograma };
  return recursos;
}

export async function GET(request, { params }) {
  const { codigo } = await params;
  const limpo = String(codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  try {
    const lista = await rpc("consultar_agendamento", { p_codigo: limpo });
    if (!lista?.length) return new Response("Recibo não encontrado.", { status: 404 });
    const a = lista[0];
    const origem = new URL(request.url).origin;
    const bytes = await gerarReciboPdf(a, await carregarRecursos(), {
      pix: salao.pix,
      urlRecibo: `${origem}/recibo/${a.codigo}`,
    });
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Recibo-${a.codigo}-Rica-Fibras.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response("Não foi possível gerar o recibo agora. Tente novamente.", { status: 500 });
  }
}
