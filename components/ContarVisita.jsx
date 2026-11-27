"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { rpc } from "../lib/supabase";

// Conta a visita (sem cookies). Painéis internos não entram na conta.
const INTERNAS = /^\/(admin|master|equipe|api)(\/|$)/;

export default function ContarVisita() {
  const caminho = usePathname();
  useEffect(() => {
    if (!caminho || INTERNAS.test(caminho)) return;
    try {
      if (navigator.webdriver) return;
      const chave = `tons:visita:${caminho}`;
      if (sessionStorage.getItem(chave)) return;
      sessionStorage.setItem(chave, "1");
    } catch {}
    let origem = "";
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.hostname !== window.location.hostname) origem = ref.href.slice(0, 200);
    } catch {}
    rpc("registrar_visita", { p_caminho: caminho, p_origem: origem || null }).catch(() => {});
  }, [caminho]);
  return null;
}
