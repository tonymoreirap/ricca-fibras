"use client";

import { useSalao } from "./Empresa";
import { temRecurso, SITE_PLATAFORMA } from "../lib/planos";

// "Feito com Tons Dellas": discreto, some no plano Salão
export default function Assinatura() {
  const salao = useSalao();
  if (temRecurso(salao, "sem_assinatura")) return null;
  return (
    <a className="assinatura-tons" href={`${SITE_PLATAFORMA}/planos`} target="_blank" rel="noopener">
      <img src="/site/td.webp" alt="" width="120" height="63" />
      Feito com <strong>Tons Dellas</strong> · tenha o app do seu salão
    </a>
  );
}
