"use client";

import { createContext, useContext } from "react";
import { SALAO_RICA, iniciais } from "../lib/empresa";

const Contexto = createContext(SALAO_RICA);

export function EmpresaProvider({ salao, children }) {
  return <Contexto.Provider value={salao}>{children}</Contexto.Provider>;
}

// O salão do endereço acessado (nome, contato, WhatsApp, horários, módulos...)
export function useSalao() {
  return useContext(Contexto);
}

// Logo do salão: imagem enviada pela dona ou as iniciais do nome
export function Logo({ tamanho = 64, className = "" }) {
  const s = useSalao();
  return <LogoDe salao={s} tamanho={tamanho} className={className} />;
}

export function LogoDe({ salao: s, tamanho = 64, className = "" }) {
  if (s.logo) return <img className={className} src={s.logo} alt="" width={tamanho} height={tamanho} />;
  const ini = iniciais(s.nome);
  return (
    <span className={`logo-letras ${className}`} style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.36 }} aria-hidden="true">
      {ini}
    </span>
  );
}
