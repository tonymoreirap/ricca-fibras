"use client";

import { useEffect, useState } from "react";
import { salao } from "../content/salao";

// Calcula "Aberto agora" / "Fechado" pelo horário de Fortaleza.
function status(agora) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Fortaleza",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(agora);
  const dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dia = dias[partes.find((p) => p.type === "weekday").value];
  const hora =
    Number(partes.find((p) => p.type === "hour").value) +
    Number(partes.find((p) => p.type === "minute").value) / 60;
  const hoje = salao.horarios.find((h) => h.diasSemana.includes(dia));
  if (hoje?.abre != null && hora >= hoje.abre && hora < hoje.fecha) {
    return { aberto: true, texto: `Aberto agora · até ${hoje.fecha}h` };
  }
  return { aberto: false, texto: "Fechado agora · agende pelo WhatsApp" };
}

export default function StatusAberto() {
  const [s, setS] = useState(null);
  useEffect(() => {
    setS(status(new Date()));
    const t = setInterval(() => setS(status(new Date())), 60000);
    return () => clearInterval(t);
  }, []);
  if (!s) return <span className="status status-vazio" aria-hidden="true" />;
  return (
    <span className={`status ${s.aberto ? "status-aberto" : ""}`}>
      <span className="status-ponto" aria-hidden="true" />
      {s.texto}
    </span>
  );
}
