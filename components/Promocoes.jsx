"use client";

import Link from "next/link";
import { useSalao } from "./Empresa";
import { linkAgendar } from "../lib/empresa";
import { precoServico } from "../lib/servicos";
import { IconeCalendario, IconeConversa } from "./Icones";

const ate = (iso) => {
  const [, m, d] = String(iso).split("-");
  return `${d}/${m}`;
};

// Vitrine de promoções que estão valendo hoje (página do salão)
export default function Promocoes({ lista = [] }) {
  const salao = useSalao();
  if (!lista.length) return null;
  return (
    <section id="promocoes" className="bloco">
      <div className="bloco-cabeca">
        <h2>Promoções</h2>
        <span className="bloco-fio" aria-hidden="true" />
      </div>
      <ul className={`promos ${lista.length > 1 ? "promos-varias" : ""}`}>
        {lista.map((p) => (
          <li key={p.id} className="promo vidro">
            {p.imagem && <img className="promo-foto" src={p.imagem} alt="" loading="lazy" />}
            <div className="promo-corpo">
              <span className="promo-prazo">Até {ate(p.fim)}</span>
              <h3>{p.titulo}</h3>
              {p.texto && <p>{p.texto}</p>}
              {p.preco_promo && (
                <p className="promo-preco">
                  {p.servico_nome && <span className="promo-servico">{p.servico_nome}</span>}
                  {p.valor && <s className="preco-cheio">{precoServico(p.valor)}</s>}
                  <strong>{precoServico(p.preco_promo)}</strong>
                </p>
              )}
              {p.agenda_online && salao.modulos.agenda ? (
                <Link className="botao-ouro" href={`/agendar?servico=${p.servico}`}>
                  <IconeCalendario stroke="currentColor" /> Agendar com desconto
                </Link>
              ) : (
                <a className="botao-linha" href={linkAgendar(salao, `Oi, ${salao.contato}! Vi a promoção "${p.titulo}" no app e quero aproveitar.`)} target="_blank" rel="noopener">
                  <IconeConversa stroke="currentColor" /> Quero aproveitar
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
