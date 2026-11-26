import { empresaDoPedido } from "../../lib/empresaServidor";

export async function generateMetadata() {
  const s = await empresaDoPedido();
  return { title: `Painel · ${s?.nome || ""}`, robots: { index: false, follow: false } };
}

export default function LayoutAdmin({ children }) {
  return children;
}
