"use client";

import { useEffect, useState } from "react";

// Quem chega aqui pelo app antigo da Rica Fibras (instalado na tela do celular)
// vai direto para o endereço novo; quem só tem login da Rica vê um aviso.
export default function Visitante() {
  const [daRica, setDaRica] = useState(false);
  useEffect(() => {
    const instalado = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone;
    if (instalado) {
      window.location.replace("/mudou?para=/");
      return;
    }
    try {
      if (localStorage.getItem("rica:cliente") || localStorage.getItem("rica:admin")) setDaRica(true);
    } catch {}
  }, []);
  if (!daRica) return null;
  return (
    <div className="st-faixa-rica" role="status">
      <span>Procurando o app da Rica Fibras? Ele mudou para ricafibras.tonsdellas.com.br.</span>
      <a href="/mudou?para=/">Ir para o app</a>
    </div>
  );
}
