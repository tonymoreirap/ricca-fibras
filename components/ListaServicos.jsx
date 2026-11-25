"use client";

import { useEffect, useState } from "react";
import { salao, linkAgendar, mensagemServico } from "../content/salao";
import Link from "next/link";
import { IconeSeta, IconeConversa, IconeCalendario, IlustracaoServico } from "./Icones";

const [assinatura, ...outros] = salao.servicos;

export default function ListaServicos() {
  const [aberto, setAberto] = useState(null);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => e.key === "Escape" && setAberto(null);
    window.addEventListener("keydown", fechar);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", fechar);
      document.body.style.overflow = "";
    };
  }, [aberto]);

  return (
    <>
      <button type="button" className="assinatura vidro" onClick={() => setAberto(assinatura)}>
        <span className="assinatura-arte" aria-hidden="true">
          <span className="assinatura-halo" />
          <IlustracaoServico tipo={assinatura.icone} tamanho={112} />
        </span>
        <span className="assinatura-texto">
          <span className="selo">Assinatura da casa</span>
          <span className="assinatura-nome">{assinatura.nome}</span>
          <span className="assinatura-desc">{assinatura.descricao}</span>
          <span className="assinatura-rodape">
            <span className="chip">Manutenção a cada {assinatura.manutencaoDias} dias</span>
            <span className="assinatura-ver">
              Ver detalhes <IconeSeta />
            </span>
          </span>
        </span>
      </button>

      <ul className="servicos-lista">
        {outros.map((s, i) => (
          <li key={s.nome} style={{ "--i": i }}>
            <button type="button" className="servico vidro" onClick={() => setAberto(s)}>
              <span className="servico-icone">
                <IlustracaoServico tipo={s.icone} tamanho={38} />
              </span>
              <span className="servico-texto">
                <span className="servico-nome">{s.nome}</span>
                <span className="servico-sub">
                  {s.manutencaoDias ? `Manutenção a cada ${s.manutencaoDias} dias` : "Cuidado completo"}
                </span>
              </span>
              <span className="servico-preco">{s.preco || "Consulte"}</span>
              <IconeSeta />
            </button>
          </li>
        ))}
      </ul>

      {aberto && (
        <div className="folha-fundo" onClick={() => setAberto(null)}>
          <div
            className="folha"
            role="dialog"
            aria-modal="true"
            aria-labelledby="folha-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="folha-alca" aria-hidden="true" />
            <div className="folha-arte" aria-hidden="true">
              <span className="assinatura-halo" />
              <IlustracaoServico tipo={aberto.icone} tamanho={96} />
            </div>
            <h2 id="folha-titulo">{aberto.nome}</h2>
            <p>{aberto.descricao}</p>
            <dl className="folha-dados">
              <div>
                <dt>Valor</dt>
                <dd>{aberto.preco || "Consulte"}</dd>
              </div>
              {aberto.manutencaoDias && (
                <div>
                  <dt>Manutenção</dt>
                  <dd>a cada {aberto.manutencaoDias} dias</dd>
                </div>
              )}
            </dl>
            {aberto.agendaOnline ? (
              <Link className="botao-ouro" href={`/agendar?servico=${aberto.agendaOnline}`}>
                <IconeCalendario stroke="currentColor" />
                Ver horários e agendar
              </Link>
            ) : (
              <a
                className="botao-ouro"
                href={linkAgendar(mensagemServico(aberto.nome))}
                target="_blank"
                rel="noopener"
              >
                <IconeConversa stroke="currentColor" />
                Agendar com a Luana
              </a>
            )}
            <button type="button" className="folha-fechar" onClick={() => setAberto(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
