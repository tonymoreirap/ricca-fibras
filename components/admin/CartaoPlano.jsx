"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { rpc } from "../../lib/supabase";
import { NOME_PLANO } from "../../lib/planos";

export const dataCurta = (iso) => {
  if (!iso) return "";
  const [, m, d] = String(iso).split("-");
  return `${d}/${m}`;
};

const dias = (iso) => Math.round((new Date(`${iso}T12:00:00-03:00`) - Date.now()) / 864e5);

// Linha que resume a situação do plano
export function situacaoTexto(p) {
  if (!p) return "";
  if (p.situacao === "teste") {
    const d = p.teste_ate ? dias(p.teste_ate) : null;
    return d == null ? "Período de teste" : d <= 0 ? "Teste termina hoje" : `Teste grátis: faltam ${d} ${d === 1 ? "dia" : "dias"}`;
  }
  if (p.situacao === "atrasada") return "Pagamento pendente. Regularize para não sair do ar.";
  if (p.situacao === "suspensa" && !p.vence_em) return "Falta só o pagamento para o app ir ao ar.";
  if (p.situacao === "suspensa") return "App fora do ar para as clientes. Regularize o pagamento.";
  return p.vence_em ? `Ativo · renova em ${dataCurta(p.vence_em)}` : "Ativo";
}

// Cartão "Meu plano" no painel da dona
// soAlerta: aparece só quando pede atenção (teste, atraso ou perto de vencer)
export default function CartaoPlano({ token, soAlerta = false }) {
  const [p, setP] = useState(null);
  useEffect(() => {
    if (token) rpc("admin_meu_plano", { p_token: token }).then(setP).catch(() => {});
  }, [token]);
  if (!p?.plano) return null;
  const alerta = p.situacao === "atrasada" || p.situacao === "suspensa";
  const perto = p.situacao === "ativa" && p.vence_em && dias(p.vence_em) <= 7;
  if (soAlerta && !alerta && !perto && p.situacao !== "teste") return null;
  return (
    <Link href="/admin/plano" className={`cartao-plano vidro ${alerta ? "cartao-plano-alerta" : ""}`}>
      <span>
        <small>Meu plano</small>
        <strong>{NOME_PLANO[p.plano.codigo] || p.plano.nome}</strong>
      </span>
      <span className="cartao-plano-sit">{situacaoTexto(p)}</span>
    </Link>
  );
}
