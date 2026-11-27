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
// "extra": em vez de trocar de plano, pede profissionais extras (plano Salão)
export function FolhaPlano({ recurso, aoFechar, extra }) {
  const salao = useSalao();
  const r = RECURSOS[recurso] || {};
  const [dados, setDados] = useState(planosCache || null);
  useEffect(() => {
    if (planosCache) return;
    rpc("planos_publicos").then((d) => setDados((planosCache = d))).catch(() => setDados({ planos: [] }));
  }, []);
  const plano = dados?.planos?.find((p) => p.codigo === r.plano);
  const msg = extra
    ? `Oi! Sou de ${salao.nome} (${salao.slug}.tonsdellas.com.br) e quero adicionar profissionais extras na minha equipe.`
    : `Oi! Sou de ${salao.nome} (${salao.slug}.tonsdellas.com.br) e quero mudar para o plano ${NOME_PLANO[r.plano]} para usar: ${r.nome}.`;
  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha folha-plano" role="dialog" aria-modal="true" aria-labelledby="fp-titulo" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        <span className="fp-cadeado" aria-hidden="true"><IconeCadeado width="26" height="26" /></span>
        <h2 id="fp-titulo" className="folha-titulo">{extra ? "Equipe completa" : r.nome}</h2>
        {extra ? (
          <p className="fp-texto">Sua equipe chegou ao limite do plano. Cada profissional a mais entra na mensalidade.</p>
        ) : (
          r.texto && <p className="fp-texto">{r.texto}</p>
        )}
        <div className="fp-plano">
          <span>{extra ? "Profissional extra" : "Disponível a partir do plano"}</span>
          <strong>{extra ? (plano?.extra_profissional ? `+ ${precoPlano(plano.extra_profissional)}` : "Sob consulta") : NOME_PLANO[r.plano]}</strong>
          {extra ? <small>por mês, cada uma</small> : plano && <small>{precoPlano(plano.preco)} por mês</small>}
        </div>
        {extra ? (
          <a className="botao-ouro" href={linkVendas(dados?.whatsapp, msg)} target="_blank" rel="noopener">Quero adicionar profissionais</a>
        ) : (
          <Link className="botao-ouro" href="/admin/plano">Mudar para o {NOME_PLANO[r.plano]}</Link>
        )}
        {!extra && (
          <a className="botao-linha" href={linkVendas(dados?.whatsapp, msg)} target="_blank" rel="noopener">Tirar dúvidas no WhatsApp</a>
        )}
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
