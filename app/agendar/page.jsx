import { Suspense } from "react";
import Agendamento from "../../components/Agendamento";

export const metadata = { title: "Agendar — Rica Fibras" };

export default function Agendar() {
  return (
    <Suspense fallback={<div className="app" />}>
      <Agendamento />
    </Suspense>
  );
}
