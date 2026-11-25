"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { rpc } from "../lib/supabase";
import { lerSessao, limparSessao } from "../lib/sessao";
import { IconeCasa, IconeBrilho, IconeCalendario, IconeSair, IconeCoroa, IconeMais } from "./Icones";

// Quem está usando o app neste aparelho: "admin" (Luana ou master), "cliente" ou null (visitante)
export function useQuemEsta() {
  const [quem, setQuem] = useState(undefined);
  useEffect(() => {
    const adm = lerSessao("admin");
    const cli = lerSessao("cliente");
    setQuem(adm?.token ? { tipo: "admin", ...adm } : cli?.token ? { tipo: "cliente", ...cli } : null);
  }, []);
  return quem;
}

export async function sairDeTudo(router) {
  const tokens = [lerSessao("admin")?.token, lerSessao("cliente")?.token].filter(Boolean);
  limparSessao("admin");
  limparSessao("cliente");
  await Promise.all(tokens.map((t) => rpc("sair", { p_token: t }).catch(() => {})));
  router.replace("/");
}

// Menu fixo do rodapé para quem entrou. A dona vê o Painel; a cliente vê a área dela.
export default function MenuApp({ quem, aoNovoHorario }) {
  const router = useRouter();
  const rota = usePathname();
  if (!quem) return null;
  const atual = (h) => (rota === h ? "page" : undefined);
  const admin = quem.tipo === "admin";

  return (
    <nav className="abas" aria-label="Menu">
      {admin ? (
        <Link href="/admin" aria-current={atual("/admin")}>
          <IconeCoroa />
          Painel
        </Link>
      ) : (
        <Link href="/cliente" aria-current={atual("/cliente")}>
          <IconeCasa />
          Minha área
        </Link>
      )}
      <Link href="/visitante" aria-current={atual("/visitante")}>
        <IconeBrilho />
        Salão
      </Link>
      {admin && aoNovoHorario ? (
        <button type="button" onClick={aoNovoHorario}>
          <IconeMais />
          Novo horário
        </button>
      ) : (
        <Link href={admin ? "/admin?novo=1" : "/agendar"} aria-current={atual("/agendar")}>
          <IconeCalendario />
          {admin ? "Novo horário" : "Agendar"}
        </Link>
      )}
      <button type="button" onClick={() => sairDeTudo(router)}>
        <IconeSair />
        Sair
      </button>
    </nav>
  );
}
