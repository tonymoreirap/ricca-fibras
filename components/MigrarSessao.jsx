"use client";

import { useEffect } from "react";

// Chegando do endereço antigo (tonsdellas.com.br) com o login no link (#migrar=...):
// guarda neste endereço o que a cliente já tinha e recarrega a página, sem o link.
export default function MigrarSessao() {
  useEffect(() => {
    const h = window.location.hash;
    if (!h.startsWith("#migrar=")) return;
    const limpo = window.location.pathname + window.location.search;
    try {
      const b64 = h.slice(8).replace(/-/g, "+").replace(/_/g, "/");
      const dados = JSON.parse(decodeURIComponent(escape(atob(b64))));
      let mudou = false;
      for (const [k, v] of Object.entries(dados)) {
        // só chaves do app e sem passar por cima do que já existe aqui
        if (typeof k === "string" && k.startsWith("rica:") && typeof v === "string" && localStorage.getItem(k) == null) {
          localStorage.setItem(k, v);
          mudou = true;
        }
      }
      window.history.replaceState(null, "", limpo);
      if (mudou) window.location.reload();
    } catch {
      window.history.replaceState(null, "", limpo);
    }
  }, []);
  return null;
}
