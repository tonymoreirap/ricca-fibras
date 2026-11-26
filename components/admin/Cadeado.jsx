"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { rpc } from "../../lib/supabase";
import { RECURSOS, NOME_PLANO, linkVendas, precoPlano } from "../../lib/planos";
import { useSalao } from "../Empresa";

export const IconeCadeado = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
  </svg>
);

let planosCache;

// Folha que explica o recurso travado e leva para o plano que o libera
export function FolhaPlano({ recurso, aoFechar }) {
  const salao = useSalao();
  const r = RECURSOS[recurso] || {};
  const [dados, setDados] = useState(planosCache || null);
  useEffect(() => {
    if (planosCache) return;
    rpc("planos_publicos").then((d) => setDados((planosCache = d))).catch(() => setDados({ planos: [] }));
  }, []);
  const plano = dados?.planos?.find((p) => p.codigo === r.plano);
  const msg = `Oi! Sou de ${salao.nome} (${salao.slug}.tonsdellas.com.br) e quero mudar para o plano ${NOME_PLANO[r.plano]} para usar: ${r.nome}.`;
  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha folha-plano" role="dialog" aria-modal="true" aria-labelledby="fp-titulo" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        <span className="fp-cadeado" aria-hidden="true"><IconeCadeado width="26" height="26" /></span>
        <h2 id="fp-titulo" className="folha-titulo">{r.nome}</h2>
        {r.texto && <p className="fp-texto">{r.texto}</p>}
        <div className="fp-plano">
          <span>Disponível a partir do plano</span>
          <strong>{NOME_PLANO[r.plano]}</strong>
          {plano && <small>{precoPlano(plano.preco)} por mês</small>}
        </div>
        <a className="botao-ouro" href={linkVendas(dados?.whatsapp, msg)} target="_blank" rel="noopener">
          Quero o plano {NOME_PLANO[r.plano]}
        </a>
        <Link className="botao-linha" href="/admin/plano">Comparar os planos</Link>
        <button type="button" className="folha-fechar" onClick={aoFechar}>Agora não</button>
      </div>
    </div>
  );
}

// Atalho do painel: abre a tela normalmente ou mostra o cadeado
export function Atalho({ href, liberado, recurso, arte, titulo, texto, extra, aoTravado }) {
  const corpo = (
    <>
      <span className="atalho-curso-arte" aria-hidden="true">{arte}</span>
      <span className="atalho-curso-texto">
        <strong>{titulo}</strong>
        <small>{liberado ? texto : `Plano ${NOME_PLANO[RECURSOS[recurso]?.plano] || ""}`}</small>
      </span>
      {liberado ? extra : <span className="atalho-cadeado"><IconeCadeado /></span>}
    </>
  );
  if (liberado) return <Link href={href} className="atalho-curso vidro">{corpo}</Link>;
  return (
    <button type="button" className="atalho-curso vidro atalho-travado" onClick={() => aoTravado(recurso)}>
      {corpo}
    </button>
  );
}
