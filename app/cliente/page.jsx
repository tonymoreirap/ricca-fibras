"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clienteDemo as c } from "../../content/demo";
import { linkAgendar } from "../../content/salao";
import {
  IconeCasa,
  IconeHistorico,
  IconeBrilho,
  IconeSair,
  IconeCalendario,
  IconeCoroa,
  IconeConversa,
  IlustracaoServico,
} from "../../components/Icones";

const ext = { target: "_blank", rel: "noopener" };
const DIA = 864e5;
const curta = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
const longa = (d) => d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const mesAno = (d) => d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "").replace(" de ", "/");

function saudacao(h) {
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function Anel({ feito, total }) {
  const r = 50;
  const volta = 2 * Math.PI * r;
  const p = Math.min(1, feito / total);
  const ang = p * 2 * Math.PI - Math.PI / 2;
  const px = 60 + r * Math.cos(ang);
  const py = 60 + r * Math.sin(ang);
  return (
    <svg className="anel" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r={r} className="anel-trilho" />
      <circle
        cx="60"
        cy="60"
        r={r}
        className="anel-progresso"
        strokeDasharray={volta}
        strokeDashoffset={volta * (1 - p)}
        transform="rotate(-90 60 60)"
      />
      <circle cx={px} cy={py} r="7" className="anel-brilho" />
      <circle cx={px} cy={py} r="3.6" className="anel-ponto" />
    </svg>
  );
}

export default function Cliente() {
  const [hoje, setHoje] = useState(null);
  useEffect(() => setHoje(new Date()), []);

  const u = c.ultimoServico;
  const faltam = u.cicloDias - u.diasAtras;
  const vence = hoje && new Date(hoje.getTime() + faltam * DIA);
  const quase = faltam <= 5;

  return (
    <div className="app app-cliente">
      <p className="faixa-demo">Demonstração · os dados abaixo são de exemplo</p>

      <header className="c-topo entra">
        <div>
          <p className="c-saudacao">{hoje ? saudacao(hoje.getHours()) : "Olá"},</p>
          <h1>{c.nome}</h1>
        </div>
        <span className="avatar" aria-hidden="true">
          <span>{c.nome[0]}</span>
        </span>
      </header>

      <main className="tela">
        <section className="cartao-rica entra" aria-label="Cartão Rica">
          <span className="cartao-brilho" aria-hidden="true" />
          <div className="cartao-rica-topo">
            <img src="/monograma.webp" alt="" width="46" height="46" />
            <span className="cartao-nivel">
              <IconeCoroa stroke="currentColor" width="16" height="16" />
              Cliente Ouro
            </span>
          </div>
          <p className="cartao-rica-nome">
            {c.nome} {c.sobrenome}
          </p>
          <div className="cartao-rica-rodape">
            <span>
              Cliente desde
              <strong>{hoje ? mesAno(new Date(hoje.getTime() - c.clienteHaDias * DIA)) : "—"}</strong>
            </span>
            <span>
              Rica Fibras
              <strong>Cartão Rica</strong>
            </span>
          </div>
        </section>

        <section className="manut vidro entra" aria-labelledby="manut-titulo">
          <div className="manut-topo">
            <div className="manut-anel">
              <Anel feito={u.diasAtras} total={u.cicloDias} />
              <span className="manut-numero">
                {faltam}
                <small>{faltam === 1 ? "dia" : "dias"}</small>
              </span>
            </div>
            <div className="manut-texto">
              <span className={`chip ${quase ? "chip-alerta" : ""}`}>
                {quase ? "Quase na hora" : "Em dia"}
              </span>
              <h2 id="manut-titulo">Sua próxima manutenção</h2>
              <p>{vence ? <>Até {longa(vence)}</> : " "}</p>
              <p className="manut-dia">
                Dia {u.diasAtras} de {u.cicloDias} do ciclo da fibra
              </p>
            </div>
          </div>
          <Link className="botao-ouro" href="/agendar?servico=manutencao">
            <IconeCalendario stroke="currentColor" />
            Agendar manutenção
          </Link>
        </section>

        <section className="bloco">
          <div className="bloco-cabeca">
            <h2>Fidelidade</h2>
            <span className="bloco-fio" aria-hidden="true" />
          </div>
          <div className="selos vidro">
            <div className="selos-grade" aria-label={`${c.selos} de 10 selos`}>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={i < c.selos ? "selo-cheio" : "selo-vazio"}>
                  {i < c.selos ? <IlustracaoServico tipo="fibra" tamanho={26} /> : i + 1}
                </span>
              ))}
            </div>
            <p>
              Faltam <strong>{10 - c.selos} manutenções</strong> para o seu mimo.
            </p>
          </div>
        </section>

        <section className="bloco" id="historico">
          <div className="bloco-cabeca">
            <h2>Seus atendimentos</h2>
            <span className="bloco-fio" aria-hidden="true" />
          </div>
          <ol className="linha-tempo">
            {c.historico.map((h, i) => (
              <li key={i}>
                <span className="linha-icone">
                  <IlustracaoServico tipo={h.icone} tamanho={26} />
                </span>
                <span className="linha-texto">
                  <span className="linha-nome">{h.nome}</span>
                  <span className="linha-data">
                    {hoje ? curta(new Date(hoje.getTime() - h.diasAtras * DIA)) : ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="bloco">
          <div className="bloco-cabeca">
            <h2>Seus cuidados</h2>
            <span className="bloco-fio" aria-hidden="true" />
          </div>
          <div className="cuidados">
            <div className="vidro">
              <span>Técnica</span>
              <strong>{c.tecnica}</strong>
            </div>
            <div className="vidro">
              <span>Formato</span>
              <strong>{c.formato}</strong>
            </div>
          </div>
          <a className="botao-linha" href={linkAgendar(`Oi, Luana! Sou a ${c.nome}.`)} {...ext}>
            <IconeConversa stroke="currentColor" width="20" height="20" />
            Falar com a Luana
          </a>
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
          <IconeHistorico />
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
