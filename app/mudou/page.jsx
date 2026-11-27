"use client";

import { useEffect } from "react";
import { ENDERECO_RICA } from "../../lib/plataforma";

// Endereço antigo da Rica Fibras (tonsdellas.com.br/...): leva a cliente para
// ricafibras.tonsdellas.com.br no mesmo caminho, levando junto o login e os recibos
// guardados neste aparelho (o navegador guarda isso separado por endereço).
export default function Mudou() {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // chega aqui por reescrita (o endereço do navegador continua o antigo) ou por /mudou?para=
    const aqui = window.location.pathname;
    let para = aqui !== "/mudou" ? aqui + window.location.search : q.get("para") || "/";
    if (!para.startsWith("/") || para.startsWith("//")) para = "/";
    const guardado = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("rica:")) guardado[k] = localStorage.getItem(k);
      }
    } catch {}
    let destino = ENDERECO_RICA + para;
    if (Object.keys(guardado).length) {
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(guardado)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      destino += `#migrar=${b64}`;
    }
    window.location.replace(destino);
  }, []);

  return (
    <main className="sem-salao">
      <h1>A Rica Fibras mudou de endereço</h1>
      <p>Agora o app fica em ricafibras.tonsdellas.com.br. Estamos te levando para lá…</p>
      <a className="botao-ouro" href={ENDERECO_RICA}>Ir para o app da Rica Fibras</a>
    </main>
  );
}
