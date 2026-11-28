"use client";

import { useEffect, useState } from "react";

// Linha do tempo ou lista: a escolha fica guardada no aparelho
export function useVistaAgenda(quem) {
  const chave = `tons:agenda-vista:${quem}`;
  const [vista, setVista] = useState("linha");
  useEffect(() => {
    try {
      const v = localStorage.getItem(chave);
      if (v === "lista" || v === "linha") setVista(v);
    } catch {}
  }, [chave]);
  const mudar = (v) => {
    setVista(v);
    try { localStorage.setItem(chave, v); } catch {}
  };
  return [vista, mudar];
}

export function TrocaVista({ vista, mudar }) {
  return (
    <div className="lt-troca" role="radiogroup" aria-label="Como ver a agenda">
      {[["linha", "Linha do tempo"], ["lista", "Lista"]].map(([k, t]) => (
        <button key={k} type="button" role="radio" aria-checked={vista === k} onClick={() => mudar(k)}>{t}</button>
      ))}
    </div>
  );
}

// Folha que abre ao tocar num horário da linha do tempo
export function FolhaHorario({ aoFechar, children }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aoFechar]);
  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha lt-folha" role="dialog" aria-modal="true" aria-label="Detalhes do horário" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        <ul className="ag-lista vidro">{children}</ul>
        <button type="button" className="folha-fechar" onClick={aoFechar}>Fechar</button>
      </div>
    </div>
  );
}
