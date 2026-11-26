// Fontes e logo para os PDFs (recibo e certificado), no servidor
import { readFile } from "node:fs/promises";
import path from "node:path";
import { rpcDoPedido } from "./empresaServidor";

const pasta = path.join(process.cwd(), "assets", "pdf");
const ler = (nome) => readFile(path.join(pasta, nome));

let fontes;
async function carregarFontes() {
  if (!fontes) {
    const [marcellus, jostLight, jostRegular, jostMedium, monogramaRica] = await Promise.all([
      ler("Marcellus-Regular.ttf"), ler("Jost-Light.ttf"), ler("Jost-Regular.ttf"), ler("Jost-Medium.ttf"), ler("monograma.png"),
    ]);
    fontes = { marcellus, jostLight, jostRegular, jostMedium, monogramaRica };
  }
  return fontes;
}

export async function recursosPdf(salao) {
  const f = await carregarFontes();
  let monograma = null, mime = "image/png";
  if (salao.logo === "/monograma.webp") monograma = f.monogramaRica;
  else if (salao.logo?.startsWith("/api/arquivo/")) {
    const a = await rpcDoPedido("arquivo_ler", { p_id: salao.logo.split("/").pop() }).catch(() => null);
    if (a && (a.mime === "image/png" || a.mime === "image/jpeg")) {
      monograma = Buffer.from(a.base64, "base64");
      mime = a.mime;
    }
  }
  return { ...f, monograma, mime };
}

export const nomeArquivo = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
