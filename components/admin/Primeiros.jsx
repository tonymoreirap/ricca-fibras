"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { rpc } from "../../lib/supabase";
import { useSalao } from "../Empresa";
import { IconeCheck } from "../Icones";

const ler = (k) => {
  try {
    return localStorage.getItem(k) === "1";
  } catch {
    return false;
  }
};
const marcar = (k) => {
  try {
    localStorage.setItem(k, "1");
  } catch {}
};

// Primeiros passos de um salão novo. Some quando o essencial (logo, serviços e Pix) está pronto.
export default function Primeiros({ nome, bemvinda }) {
  const salao = useSalao();
  const [servicos, setServicos] = useState(null);
  const [marcas, setMarcas] = useState({});
  const [aviso, setAviso] = useState("");
  const chave = (p) => `td:${salao.slug}:passo-${p}`;

  useEffect(() => {
    rpc("servicos_agendaveis").then((l) => setServicos(Array.isArray(l) ? l.length : 0)).catch(() => setServicos(0));
    setMarcas({ horarios: ler(chave("horarios")), link: ler(chave("link")), fechado: ler(chave("fechado")) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (servicos === null) return null;
  const endereco = `https://${salao.dominio || `${salao.slug}.tonsdellas.com.br`}`;
  const passos = [
    { id: "logo", titulo: "Coloque sua logo e foto de capa", href: "/admin/salao", feito: Boolean(salao.logo || salao.fotoCapa) },
    { id: "servicos", titulo: "Cadastre seus serviços e preços", href: "/admin/servicos", feito: servicos > 0 },
    { id: "pix", titulo: "Informe sua chave Pix para o sinal", href: "/admin/salao", feito: Boolean(salao.pix?.chave) },
    { id: "horarios", titulo: "Confira seus dias e horários", href: "/admin/salao", feito: marcas.horarios },
    { id: "link", titulo: "Mande o link do app para as clientes", feito: marcas.link },
  ];
  const essencial = passos.slice(0, 3).every((p) => p.feito);
  // some quando logo, serviços e Pix estão prontos (ou quando a dona escondeu)
  if ((essencial && !bemvinda) || marcas.fechado) return null;
  const feitos = passos.filter((p) => p.feito).length;

  async function compartilhar() {
    const texto = `Agora você agenda comigo pelo app do ${salao.nome}: ${endereco}`;
    try {
      if (navigator.share) await navigator.share({ title: salao.nome, text: texto, url: endereco });
      else {
        await navigator.clipboard.writeText(endereco);
        setAviso("Link copiado.");
      }
      marcar(chave("link"));
      setMarcas((m) => ({ ...m, link: true }));
    } catch {}
  }

  return (
    <section className="primeiros vidro" aria-labelledby="pp-titulo">
      <div className="primeiros-topo">
        <h2 id="pp-titulo">{bemvinda ? `Bem-vinda, ${nome}! Seu app está no ar.` : "Deixe seu app pronto"}</h2>
        <span className="primeiros-conta">{feitos} de {passos.length}</span>
      </div>
      <div className="primeiros-barra" aria-hidden="true"><i style={{ width: `${(feitos / passos.length) * 100}%` }} /></div>
      <ol className="primeiros-lista">
        {passos.map((p) => {
          const corpo = (
            <>
              <span className="pp-marca" aria-hidden="true">{p.feito ? <IconeCheck width="14" height="14" /> : null}</span>
              <span className="pp-texto">{p.titulo}</span>
            </>
          );
          return (
            <li key={p.id} className={p.feito ? "feito" : ""}>
              {p.id === "link" ? (
                <button type="button" className="pp-item" onClick={compartilhar}>{corpo}<span className="pp-acao">Enviar</span></button>
              ) : (
                <Link
                  href={p.href}
                  className="pp-item"
                  onClick={() => {
                    if (p.id === "horarios") marcar(chave("horarios"));
                  }}
                >
                  {corpo}
                  {!p.feito && <span className="pp-acao">Abrir</span>}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <div className="primeiros-pe">
        <p className="primeiros-endereco">
          Seu endereço: <a href={endereco} target="_blank" rel="noopener">{endereco.replace("https://", "")}</a>
        </p>
        <button type="button" className="link-botao" onClick={() => { marcar(chave("fechado")); setMarcas((m) => ({ ...m, fechado: true })); }}>
          Esconder
        </button>
      </div>
      {aviso && <div className="toast" role="status">{aviso}</div>}
    </section>
  );
}
