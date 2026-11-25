import { readFile } from "node:fs/promises";
import path from "node:path";
import { rpc } from "../../../../lib/supabase";
import { gerarCertificadoPdf } from "../../../../lib/certificadoPdf";
import { salao } from "../../../../content/salao";
import { curso } from "../../../../content/curso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let recursos;
async function carregarRecursos() {
  if (recursos) return recursos;
  const pasta = path.join(process.cwd(), "assets", "pdf");
  const ler = (nome) => readFile(path.join(pasta, nome));
  const [marcellus, jostLight, jostRegular, jostMedium, monograma] = await Promise.all([
    ler("Marcellus-Regular.ttf"), ler("Jost-Light.ttf"), ler("Jost-Regular.ttf"), ler("Jost-Medium.ttf"), ler("monograma.png"),
  ]);
  recursos = { marcellus, jostLight, jostRegular, jostMedium, monograma };
  return recursos;
}

export async function GET(request, { params }) {
  const { codigo } = await params;
  const limpo = String(codigo || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
  const c = await rpc("certificado_verificar", { p_codigo: limpo }).catch(() => null);
  if (!c) return new Response("Certificado não encontrado.", { status: 404 });
  const origem = new URL(request.url).origin;
  const bytes = await gerarCertificadoPdf(c, await carregarRecursos(), {
    curso: curso.nome,
    contato: salao.contato,
    salao: salao.nome,
    urlVerificar: `${origem}/certificado/${c.codigo}`,
  });
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Certificado-${c.codigo}-Metodo-Rica.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
