import Link from "next/link";
import { IconeVoltar } from "./Icones";

export default function BarraTopo({ voltar = "/", direita, sobreposta = false }) {
  return (
    <header className={`barra-topo ${sobreposta ? "barra-sobreposta" : ""}`}>
      <Link href={voltar} className="barra-voltar" aria-label="Voltar">
        <IconeVoltar />
      </Link>
      <span className="barra-marca">
        <img src="/monograma.webp" alt="" width="30" height="30" />
        Rica Fibras
      </span>
      <span className="barra-direita">{direita}</span>
    </header>
  );
}
