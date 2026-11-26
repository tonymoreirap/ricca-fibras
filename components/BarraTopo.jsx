"use client";

import Link from "next/link";
import { IconeVoltar } from "./Icones";
import { useSalao, LogoDe } from "./Empresa";

export default function BarraTopo({ voltar = "/", direita, sobreposta = false }) {
  const salao = useSalao();
  return (
    <header className={`barra-topo ${sobreposta ? "barra-sobreposta" : ""}`}>
      <Link href={voltar} className="barra-voltar" aria-label="Voltar">
        <IconeVoltar />
      </Link>
      <span className="barra-marca">
        <LogoDe salao={salao} tamanho={30} />
        {salao.nome}
      </span>
      <span className="barra-direita">{direita}</span>
    </header>
  );
}
