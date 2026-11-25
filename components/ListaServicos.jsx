"use client";

import { useEffect, useState } from "react";
import { salao, linkAgendar, mensagemServico } from "../content/salao";
import { IconeSeta } from "./Icones";

export default function ListaServicos() {
  const [aberto, setAberto] = useState(null);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => e.key === "Escape" && setAberto(null);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberto]);

  return (
    <>
      <ul className="grupo">
        {salao.servicos.map((s) => (
          <li key={s.nome}>
            <button type="button" className="grupo-linha" onClick={() => setAberto(s)}>
              <span className="grupo-texto">
                <span className="grupo-titulo">{s.nome}</span>
                {s.manutencaoDias && (
                  <span className="grupo-sub">Manutenção a cada {s.manutencaoDias} dias</span>
                )}
              </span>
              <span className="grupo-valor">{s.preco || "Consulte"}</span>
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
            <a
              className="botao-ouro"
              href={linkAgendar(mensagemServico(aberto.nome))}
              target="_blank"
              rel="noopener"
            >
              Agendar pelo WhatsApp
            </a>
            <button type="button" className="folha-fechar" onClick={() => setAberto(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
