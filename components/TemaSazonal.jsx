"use client";

import { useEffect, useState } from "react";
import { temaDoDia } from "../lib/tema";

// ?tema=natal ou ?tema=padrao para pré-visualizar (vale só nesta aba)
function escolherTema() {
  try {
    const q = new URLSearchParams(window.location.search).get("tema");
    if (q) sessionStorage.setItem("rica:tema", q);
    const forcado = sessionStorage.getItem("rica:tema");
    if (forcado) return forcado === "padrao" ? null : forcado;
  } catch {}
  return temaDoDia();
}

export function useTema() {
  const [tema, setTema] = useState(null);
  useEffect(() => setTema(escolherTema()), []);
  return tema;
}

// Mostra o conteúdo só quando o tema indicado estiver ativo
export function SoNoTema({ tema = "natal", children }) {
  return useTema() === tema ? children : null;
}

const BRILHOS = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  atraso: -((i * 53) % 140) / 10,
  duracao: 9 + ((i * 29) % 70) / 10,
  tamanho: 5 + ((i * 17) % 7),
  deriva: ((i * 41) % 40) - 20,
}));

export default function TemaSazonal() {
  const tema = useTema();
  useEffect(() => {
    if (tema) document.documentElement.dataset.tema = tema;
    else delete document.documentElement.dataset.tema;
  }, [tema]);
  if (tema !== "natal") return null;
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
