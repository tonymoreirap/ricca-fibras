import { Suspense } from "react";
import Agendamento from "../../components/Agendamento";
import { empresaDoPedido } from "../../lib/empresaServidor";

export async function generateMetadata() {
  const s = await empresaDoPedido();
  return { title: `Agendar — ${s?.nome || ""}` };
}

export default function Agendar() {
  return (
    <Suspense fallback={<div className="app" />}>
      <Agendamento />
    </Suspense>
  );
}
