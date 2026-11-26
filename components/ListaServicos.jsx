"use client";

import { useEffect, useState } from "react";
import { linkAgendar, mensagemServico, aContato } from "../lib/empresa";
import { useSalao } from "./Empresa";
import { precoServico, linhaServico } from "../lib/servicos";

// preço com a promoção que estiver valendo (o normal aparece riscado)
function Preco({ s }) {
  if (!s.promocao) return precoServico(s.valor);
  return (
    <>
      <s className="preco-cheio">{precoServico(s.valor)}</s> {precoServico(s.promocao.preco)}
    </>
  );
}
import Link from "next/link";
import { IconeSeta, IconeConversa, IconeCalendario, IlustracaoServico } from "./Icones";

export default function ListaServicos({ servicos = [] }) {
  const salao = useSalao();
  const [aberto, setAberto] = useState(null);
  const assinatura = servicos.find((s) => s.destaque);
  const outros = servicos.filter((s) => s !== assinatura);

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

  if (!servicos.length) return <p className="bloco-vazio">Serviços em atualização. Fale com a gente pelo WhatsApp.</p>;

  return (
    <>
      {assinatura && (
      <button type="button" className="assinatura vidro" onClick={() => setAberto(assinatura)}>
        <span className="assinatura-arte" aria-hidden="true">
          <span className="assinatura-halo" />
          <IlustracaoServico tipo={assinatura.icone} tamanho={112} />
        </span>
        <span className="assinatura-texto">
          {assinatura.selo && <span className="selo">{assinatura.selo}</span>}
          <span className="assinatura-nome">{assinatura.nome}</span>
          {assinatura.descricao && <span className="assinatura-desc">{assinatura.descricao}</span>}
          <span className="assinatura-rodape">
            {assinatura.promocao ? (
              <span className="chip chip-promo"><Preco s={assinatura} /></span>
            ) : (
              <span className="chip">{linhaServico(assinatura) || precoServico(assinatura.valor)}</span>
            )}
            <span className="assinatura-ver">
              Ver detalhes <IconeSeta />
            </span>
          </span>
        </span>
      </button>
      )}

      <ul className="servicos-lista">
        {outros.map((s, i) => (
          <li key={s.codigo} style={{ "--i": i }}>
            <button type="button" className="servico vidro" onClick={() => setAberto(s)}>
              <span className="servico-icone">
                <IlustracaoServico tipo={s.icone} tamanho={38} />
              </span>
              <span className="servico-texto">
                <span className="servico-nome">{s.nome}</span>
                {s.promocao ? (
                  <span className="servico-sub servico-promo">{s.promocao.titulo}</span>
                ) : (
                  linhaServico(s) && <span className="servico-sub">{linhaServico(s)}</span>
                )}
              </span>
              <span className="servico-preco"><Preco s={s} /></span>
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
            {aberto.descricao && <p>{aberto.descricao}</p>}
            <dl className="folha-dados">
              <div>
                <dt>{aberto.promocao ? `Valor (${aberto.promocao.titulo})` : "Valor"}</dt>
                <dd><Preco s={aberto} /></dd>
              </div>
              {aberto.ciclo_dias && (
                <div>
                  <dt>Manutenção</dt>
                  <dd>a cada {aberto.ciclo_dias} dias</dd>
                </div>
              )}
            </dl>
            {aberto.agenda_online ? (
              <Link className="botao-ouro" href={`/agendar?servico=${aberto.codigo}`}>
                <IconeCalendario stroke="currentColor" />
                Ver horários e agendar
              </Link>
            ) : (
              <a
                className="botao-ouro"
                href={linkAgendar(salao, mensagemServico(salao, aberto.nome))}
                target="_blank"
                rel="noopener"
              >
                <IconeConversa stroke="currentColor" />
                Agendar com {aContato(salao)}
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
