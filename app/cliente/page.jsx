"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clienteDemo as c } from "../../content/demo";
import { linkAgendar } from "../../content/salao";
import { IconeCasa, IconeLista, IconeBrilho, IconeSair, IconeRelogio } from "../../components/Icones";

const ext = { target: "_blank", rel: "noopener" };
const dia = 864e5;
const fmt = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const fmtLongo = (d) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });

function Anel({ feito, total }) {
  const r = 52, volta = 2 * Math.PI * r;
  const p = Math.min(1, feito / total);
  return (
    <svg className="anel" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r={r} className="anel-fundo" />
      <circle
        cx="60"
        cy="60"
        r={r}
        className="anel-progresso"
        strokeDasharray={volta}
        strokeDashoffset={volta * (1 - p)}
      />
    </svg>
  );
}

export default function Cliente() {
  const [hoje, setHoje] = useState(null);
  useEffect(() => setHoje(new Date()), []);

  const u = c.ultimoServico;
  const faltam = u.cicloDias - u.diasAtras;
  const vence = hoje && new Date(hoje.getTime() + faltam * dia);

  return (
    <div className="app">
      <p className="faixa-demo">Demonstração: os dados abaixo são de exemplo.</p>
      <header className="cliente-topo">
        <div>
          <p className="tela-sub">Olá,</p>
          <h1>{c.nome}</h1>
        </div>
        <span className="avatar" aria-hidden="true">{c.nome[0]}</span>
      </header>

      <main className="tela">
        <section className="cartao cartao-destaque" aria-labelledby="manut">
          <div className="manut">
            <div className="manut-anel">
              <Anel feito={u.diasAtras} total={u.cicloDias} />
              <span className="manut-numero">
                {faltam}
                <small>dias</small>
              </span>
            </div>
            <div>
              <h2 id="manut">Sua manutenção</h2>
              <p>
                {u.nome}
                {vence && <> vence em {fmtLongo(vence)}.</>}
              </p>
            </div>
          </div>
          <a
            className="botao-ouro"
            href={linkAgendar(`Oi, Luana! Sou a ${c.nome} e quero agendar minha manutenção da fibra.`)}
            {...ext}
          >
            Agendar manutenção
          </a>
        </section>

        <section className="bloco">
          <h2>Próximo horário</h2>
          <div className="cartao cartao-linha">
            <IconeRelogio />
            <p>Nenhum horário marcado.</p>
            <a className="link-ouro" href={linkAgendar()} {...ext}>
              Agendar
            </a>
          </div>
        </section>

        <section className="bloco" id="historico">
          <h2>Histórico</h2>
          <ul className="grupo">
            {c.historico.map((h, i) => (
              <li key={i} className="grupo-linha grupo-estatica">
                <span className="grupo-titulo">{h.nome}</span>
                <span className="grupo-valor">
                  {hoje ? fmt(new Date(hoje.getTime() - h.diasAtras * dia)) : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bloco">
          <h2>Seus cuidados</h2>
          <ul className="grupo">
            <li className="grupo-linha grupo-estatica">
              <span className="grupo-titulo">Técnica</span>
              <span className="grupo-valor">{c.tecnica}</span>
            </li>
            <li className="grupo-linha grupo-estatica">
              <span className="grupo-titulo">Formato</span>
              <span className="grupo-valor">{c.formato}</span>
            </li>
          </ul>
        </section>
      </main>

      <nav className="abas" aria-label="Menu">
        <a href="#" aria-current="page">
          <IconeCasa />
          Início
        </a>
        <Link href="/visitante#servicos">
          <IconeBrilho />
          Serviços
        </Link>
        <a href="#historico">
          <IconeLista />
          Histórico
        </a>
        <Link href="/">
          <IconeSair />
          Sair
        </Link>
      </nav>
    </div>
  );
}
