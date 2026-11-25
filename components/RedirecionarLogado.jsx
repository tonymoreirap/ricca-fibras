"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { lerSessao } from "../lib/sessao";

// Quem já entrou neste aparelho vai direto para a sua área
export default function RedirecionarLogado() {
  const router = useRouter();
  useEffect(() => {
    if (lerSessao("admin")?.token) router.replace("/admin");
    else if (lerSessao("cliente")?.token) router.replace("/cliente");
  }, [router]);
  return null;
}
