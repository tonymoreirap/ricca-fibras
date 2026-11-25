"use client";

import { useState } from "react";
import Link from "next/link";
import BarraTopo from "../../components/BarraTopo";

function mascara(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function Entrar() {
  const [celular, setCelular] = useState("");
  const [enviado, setEnviado] = useState(false);
  const valido = celular.replace(/\D/g, "").length === 11;

  return (
    <div className="app">
      <BarraTopo voltar="/" />
      <main className="tela tela-entrar">
        <h1>Entrar</h1>
        <p className="tela-sub">Use o celular que você informou no salão.</p>

        {!enviado ? (
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (valido) setEnviado(true);
            }}
          >
            <label htmlFor="celular">Celular com DDD</label>
            <input
              id="celular"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="(85) 90000-0000"
              value={celular}
              onChange={(e) => setCelular(mascara(e.target.value))}
            />
            <button className="botao-ouro" type="submit" disabled={!valido}>
              Receber código
            </button>
          </form>
        ) : (
          <div className="aviso">
            <h2>O acesso das clientes está sendo finalizado</h2>
            <p>
              Em breve você entra com um código enviado para o seu celular. Enquanto isso, veja como
              vai ficar a sua área.
            </p>
            <Link className="botao-ouro" href="/cliente">
              Ver demonstração
            </Link>
          </div>
        )}

        <p className="tela-rodape">
          Só quer conhecer? <Link href="/visitante">Continuar como visitante</Link>
        </p>
      </main>
    </div>
  );
}
