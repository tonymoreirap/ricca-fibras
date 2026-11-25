"use client";

import Link from "next/link";
import MenuApp, { useQuemEsta } from "./MenuApp";
import { IconeCalendario } from "./Icones";

// Botão do topo: Entrar (visitante), Minha área (cliente) ou Painel (dona)
export function BotaoConta() {
  const quem = useQuemEsta();
  if (quem === undefined) return <span className="barra-link barra-link-vazio" aria-hidden="true" />;
  if (quem?.tipo === "admin") return <Link href="/admin" className="barra-link">Painel</Link>;
  if (quem?.tipo === "cliente") return <Link href="/cliente" className="barra-link">Minha área</Link>;
  return <Link href="/entrar" className="barra-link">Entrar</Link>;
}

// Rodapé: quem entrou vê o menu do app; visitante vê o botão de agendar
export function RodapeVisitante() {
  const quem = useQuemEsta();
  if (quem === undefined) return null;
  if (quem) return <MenuApp quem={quem} />;
  return (
    <Link className="cta-flutuante botao-ouro" href="/agendar">
      <IconeCalendario stroke="currentColor" />
      Agendar horário
    </Link>
  );
}
