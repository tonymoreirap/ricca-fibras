import { redirect } from "next/navigation";
import { SITE } from "../../lib/plataforma";
import { plataformaDoPedido } from "../../lib/empresaServidor";

// Os planos agora ficam no site de vendas
export default async function Planos() {
  redirect((await plataformaDoPedido()) ? "/#planos" : `${SITE}/#planos`);
}
