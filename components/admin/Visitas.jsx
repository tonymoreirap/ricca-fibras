"use client";

import { useEffect, useState } from "react";
import { rpc } from "../../lib/supabase";

const NOMES = {
  direto: "Link direto ou digitado",
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  google: "Google",
  tiktok: "TikTok",
  busca: "Outras buscas",
  "outros sites": "Outros sites",
};

const diaCurto = (iso) => {
  const [, m, d] = String(iso).split("-");
  return `${d}/${m}`;
};

// Resumo de visitas: números, gráfico dos últimos 14 dias e de onde vieram.
export function ResumoVisitas({ r }) {
  if (!r) return null;
  const max = Math.max(1, ...(r.por_dia || []).map((x) => x.visitas));
  const total = (r.origens || []).reduce((s, o) => s + o.visitas, 0) || 1;
  return (
    <div className="vis">
      <dl className="vis-numeros">
        <div><dt>Hoje</dt><dd>{r.hoje}</dd></div>
        <div><dt>Ontem</dt><dd>{r.ontem}</dd></div>
        <div><dt>7 dias</dt><dd>{r.semana}</dd></div>
        <div><dt>30 dias</dt><dd>{r.mes}</dd></div>
      </dl>
      <div className="vis-grafico" role="img" aria-label={`Visitas por dia nos últimos 14 dias: ${(r.por_dia || []).map((x) => `${diaCurto(x.dia)}: ${x.visitas}`).join(", ")}`}>
        {(r.por_dia || []).map((x) => (
          <span key={x.dia} title={`${diaCurto(x.dia)}: ${x.visitas} ${x.visitas === 1 ? "pessoa" : "pessoas"}`}>
            <i style={{ height: `${Math.max(3, (x.visitas / max) * 100)}%` }} />
            <small>{diaCurto(x.dia).slice(0, 2)}</small>
          </span>
        ))}
      </div>
      {r.origens?.length > 0 && (
        <>
          <h3 className="vis-sub">De onde vieram (30 dias)</h3>
          <ul className="vis-origens">
            {r.origens.map((o) => (
              <li key={o.origem}>
                <span>{NOMES[o.origem] || o.origem}</span>
                <span className="vis-barra"><i style={{ width: `${(o.visitas / total) * 100}%` }} /></span>
                <strong>{o.visitas}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="vis-nota">
        {r.paginas_mes} páginas vistas em 30 dias · {r.celular_pct}% pelo celular. Cada pessoa conta uma vez por dia.
      </p>
    </div>
  );
}

// Cartão do painel da dona: quantas pessoas abriram o app do salão
export function VisitasDoSalao({ token }) {
  const [d, setD] = useState(null);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (token) rpc("admin_visitas", { p_token: token }).then((r) => r?.ok && setD(r.visitas)).catch(() => {});
  }, [token]);
  if (!d) return null;
  return (
    <section className="vis-cartao vidro">
      <button type="button" className="emp-precos-topo" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
        <span>
          <strong>Visitas ao seu app</strong>
          <small>{d.hoje} {d.hoje === 1 ? "pessoa" : "pessoas"} hoje · {d.semana} em 7 dias · {d.mes} em 30 dias</small>
        </span>
        <span aria-hidden="true">{aberto ? "−" : "+"}</span>
      </button>
      {aberto && <ResumoVisitas r={d} />}
    </section>
  );
}
