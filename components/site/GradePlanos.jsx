"use client";

import { useState } from "react";
import { precoPlano } from "../../lib/planos";

// Grade de planos com o seletor Mensal / Anual (2 meses grátis no 1º ano)
export default function GradePlanos({ planos, destaques, check }) {
  const [anual, setAnual] = useState(false);
  const [brilho, setBrilho] = useState(0);
  const trocar = (v) => {
    setAnual(v);
    setBrilho((n) => n + 1);
  };
  return (
    <>
      <div className="st-ciclo" role="radiogroup" aria-label="Forma de pagamento">
        <button type="button" role="radio" aria-checked={!anual} onClick={() => trocar(false)}>Mensal</button>
        <button type="button" role="radio" aria-checked={anual} onClick={() => trocar(true)}>
          Anual <span className="st-ciclo-selo">2 meses grátis</span>
        </button>
        <i className={anual ? "dir" : ""} aria-hidden="true" />
      </div>
      <div className="st-planos-grade">
        {planos.map((pl) => {
          const dd = destaques[pl.codigo] || { para: pl.descricao, itens: [] };
          const meio = pl.codigo === "profissional";
          const anualV = Number(pl.preco_anual || pl.preco * 10);
          const renova = Number(pl.preco_anual_renova || pl.preco * 11);
          return (
            <article key={pl.codigo} className={`st-plano ${meio ? "st-plano-destaque" : ""}`}>
              {meio && <span className="st-plano-selo">Mais escolhido</span>}
              <h3>{pl.nome}</h3>
              <p className="st-plano-para">{dd.para}</p>
              <div key={`${pl.codigo}-${brilho}`} className={`st-plano-valor ${brilho ? "st-brilha" : ""}`}>
                {anual ? (
                  <>
                    <p className="st-plano-preco"><strong>{precoPlano(anualV)}</strong><span>/ano</span></p>
                    <p className="st-plano-equivale">
                      equivale a {precoPlano(Math.round((anualV / 12) * 100) / 100)}/mês · <s>{precoPlano(pl.preco * 12)}</s>
                    </p>
                    <p className="st-plano-renova">ou em até 12x no cartão · a partir do 2º ano, {precoPlano(renova)}/ano</p>
                  </>
                ) : (
                  <>
                    <p className="st-plano-preco"><strong>{precoPlano(pl.preco)}</strong><span>/mês</span></p>
                    <p className="st-plano-equivale">sem fidelidade · cancele quando quiser</p>
                  </>
                )}
              </div>
              <ul className="st-lista">
                {dd.itens.map((t) => <li key={t}>{check}{t}</li>)}
              </ul>
              <a className={`st-botao ${meio ? "st-botao-g" : "st-botao-l"}`} href={`/criar?plano=${pl.codigo}${anual ? "&ciclo=anual" : ""}`}>Testar 7 dias grátis</a>
            </article>
          );
        })}
      </div>
    </>
  );
}
