"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { temaDoDia } from "../lib/tema";
import { useSalao } from "./Empresa";

// ?tema=natal ou ?tema=padrao para pré-visualizar (vale só nesta aba)
function escolherTema(temas) {
  try {
    const q = new URLSearchParams(window.location.search).get("tema");
    if (q) sessionStorage.setItem("rica:tema", q);
    const forcado = sessionStorage.getItem("rica:tema");
    if (forcado) return forcado === "padrao" ? null : forcado;
  } catch {}
  return temaDoDia(temas);
}

export function useTema() {
  const { temas } = useSalao();
  const [tema, setTema] = useState(null);
  useEffect(() => setTema(escolherTema(temas)), [temas]);
  return tema;
}

// Mostra o conteúdo só quando o tema indicado estiver ativo
export function SoNoTema({ tema = "natal", children }) {
  return useTema() === tema ? children : null;
}

const BRILHOS = Array.from({ length: 7 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  atraso: -((i * 53) % 140) / 10,
  duracao: 9 + ((i * 29) % 70) / 10,
  tamanho: 5 + ((i * 17) % 7),
  deriva: ((i * 41) % 40) - 20,
}));

export default function TemaSazonal() {
  const tema = useTema();
  const rota = usePathname() || "";
  // telas de trabalho (painel, master) ficam sem os brilhos caindo
  const trabalho = /^\/(admin|master|planos|criar)(\/|$)/.test(rota);
  useEffect(() => {
    if (tema) document.documentElement.dataset.tema = tema;
    else delete document.documentElement.dataset.tema;
  }, [tema]);
  if (tema !== "natal" || trabalho) return null;
  return (
    <div className="natal-brilhos" aria-hidden="true">
      {BRILHOS.map((b, i) => (
        <span
          key={i}
          style={{ left: `${b.x}%`, width: b.tamanho, height: b.tamanho, animationDelay: `${b.atraso}s`, animationDuration: `${b.duracao}s`, "--deriva": `${b.deriva}px` }}
        />
      ))}
    </div>
  );
}
