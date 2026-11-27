"use client";

import { useEffect, useState } from "react";
import { rpc } from "../../lib/supabase";
import { precoPlano } from "../../lib/planos";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const real = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBr = (iso) => (iso ? String(iso).split("-").reverse().slice(0, 2).join("/") : "");
const zap = (w, t) => `https://wa.me/${String(w || "").replace(/\D/g, "")}?text=${encodeURIComponent(t)}`;

// Visão geral do negócio: receita, assinaturas, testes e quem vence
export default function MasterGeral({ token, versao, aoAcao }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    if (token) rpc("master_painel", { p_token: token }).then(setD).catch(() => {});
  }, [token, versao]);
  if (!d) return null;
  const max = Math.max(1, ...(d.serie || []).map((m) => Number(m.receita)));
  return (
    <section className="mg" aria-labelledby="mg-titulo">
      <h2 id="mg-titulo" className="mg-titulo">Visão geral</h2>
      <div className="mg-kpis">
        <div className="vidro destaque"><span>Receita recorrente</span><strong>{real(d.mrr)}</strong><small>por mês · {d.pagantes} {d.pagantes === 1 ? "salão pagante" : "salões pagantes"}</small></div>
        <div className="vidro"><span>Recebido no mês</span><strong>{real(d.receita_mes)}</strong><small>{d.novos_mes} {d.novos_mes === 1 ? "salão novo" : "salões novos"}</small></div>
        <div className="vidro"><span>Em teste</span><strong>{d.em_teste}</strong><small>{d.teste_acaba_3d ? `${d.teste_acaba_3d} acabam em até 3 dias` : "nenhum acabando"}</small></div>
        <div className="vidro"><span>Testes que assinaram</span><strong>{d.conversao_teste == null ? "—" : `${d.conversao_teste}%`}</strong><small>últimos 90 dias</small></div>
        <div className="vidro"><span>Mensais · anuais</span><strong>{d.mensais} · {d.anuais}</strong><small>{d.cortesia} em cortesia</small></div>
        <div className={`vidro ${d.atrasadas + d.suspensas ? "alerta" : ""}`}><span>Atrasadas · fora do ar</span><strong>{d.atrasadas} · {d.suspensas}</strong><small>{d.nunca_pagaram} nunca pagaram</small></div>
      </div>

      <div className="mg-grafico vidro" role="img" aria-label={`Recebido por mês: ${(d.serie || []).map((m) => `${MESES[Number(m.mes.slice(5, 7)) - 1]} ${real(m.receita)}`).join(", ")}`}>
        {(d.serie || []).map((m) => (
          <span key={m.mes}>
            <em>{Number(m.receita) ? real(m.receita).replace(",00", "") : ""}</em>
            <i style={{ height: `${Math.max(2, (Number(m.receita) / max) * 100)}%` }} />
            <small>{MESES[Number(m.mes.slice(5, 7)) - 1]}{m.novos ? ` · +${m.novos}` : ""}</small>
          </span>
        ))}
      </div>

      {d.testes.length > 0 && (
        <div className="mg-lista vidro">
          <h3>Testes em andamento</h3>
          <ul>
            {d.testes.map((t) => (
              <li key={t.id}>
                <span>
                  <strong>{t.nome}</strong>
                  <small>{t.dias <= 0 ? "acaba hoje" : `faltam ${t.dias} ${t.dias === 1 ? "dia" : "dias"}`} · {t.servicos} serviços · {t.agendamentos} agendamentos</small>
                </span>
                <span className="mg-acoes">
                  {t.whatsapp && <a className="acao" href={zap(t.whatsapp, `Oi! Aqui é da Tons Dellas. Vi que você está testando o app do ${t.nome}. Posso te ajudar a configurar ou tirar alguma dúvida?`)} target="_blank" rel="noopener">WhatsApp</a>}
                  <button type="button" className="acao" onClick={() => aoAcao(t.id, { acao: "estender_teste", dias: 7 }, "Teste estendido em 7 dias.")}>+7 dias</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.vencendo.length > 0 && (
        <div className="mg-lista vidro">
          <h3>Vencem nos próximos 7 dias</h3>
          <ul>
            {d.vencendo.map((v) => (
              <li key={v.id}>
                <span>
                  <strong>{v.nome}</strong>
                  <small>{v.situacao === "atrasada" ? "venceu" : "vence"} em {dataBr(v.vence_em)} · {v.ciclo === "anual" ? "anual" : "mensal"}{v.valor ? ` · ${precoPlano(v.valor)}/mês` : ""}</small>
                </span>
                {v.whatsapp && <a className="acao" href={zap(v.whatsapp, `Oi! Aqui é da Tons Dellas. O plano do ${v.nome} vence em ${dataBr(v.vence_em)}. Para renovar, é só entrar no painel em Meu plano. Qualquer dúvida, estou aqui!`)} target="_blank" rel="noopener">Lembrar</a>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// Ações rápidas num salão
export function AcoesSalao({ e, aoAcao }) {
  const [aberto, setAberto] = useState(false);
  const [nota, setNota] = useState(e.nota || "");
  const [confirmar, setConfirmar] = useState(null);
  const faz = (p, msg) => {
    if (["suspender", "pago_anual"].includes(p.acao) && confirmar !== p.acao) return setConfirmar(p.acao);
    setConfirmar(null);
    aoAcao(e.id, p, msg);
  };
  return (
    <div className="emp-rapidas">
      <button type="button" className="acao acao-sutil" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
        {aberto ? "Fechar ações" : "Ações rápidas"}
      </button>
      {aberto && (
        <div className="emp-rapidas-caixa">
          <div className="emp-rapidas-botoes">
            <button type="button" className="acao" onClick={() => faz({ acao: "estender_teste", dias: 7 }, "Teste estendido em 7 dias.")}>+7 dias de teste</button>
            <button type="button" className="acao" onClick={() => faz({ acao: "dar_dias", dias: 30 }, "30 dias liberados.")}>Dar 30 dias</button>
            <button type="button" className="acao" onClick={() => faz({ acao: "pago_mensal" }, "Pagamento mensal registrado.")}>Recebi 1 mês</button>
            <button type="button" className={`acao ${confirmar === "pago_anual" ? "armada" : ""}`} onClick={() => faz({ acao: "pago_anual" }, "Pagamento anual registrado.")}>
              {confirmar === "pago_anual" ? "Confirmar: recebi o ano" : "Recebi o ano"}
            </button>
            {e.situacao === "suspensa" ? (
              <button type="button" className="acao acao-forte" onClick={() => faz({ acao: "reativar", dias: 7 }, "Salão de volta ao ar.")}>Reativar</button>
            ) : (
              <button type="button" className={`acao acao-perigo ${confirmar === "suspender" ? "armada" : ""}`} onClick={() => faz({ acao: "suspender" }, "Salão tirado do ar.")}>
                {confirmar === "suspender" ? "Toque de novo para tirar do ar" : "Tirar do ar"}
              </button>
            )}
          </div>
          <label className="emp-nota">
            <span>Anotação (só você vê)</span>
            <textarea rows={2} maxLength={500} value={nota} onChange={(x) => setNota(x.target.value)} placeholder="Ex.: pagou em dinheiro, pediu desconto, indicação da Luana…" />
          </label>
          {nota !== (e.nota || "") && <button type="button" className="acao" onClick={() => aoAcao(e.id, { acao: "nota", nota }, "Anotação salva.")}>Salvar anotação</button>}
          <small className="ms-dica">“Recebi 1 mês / o ano” é para pagamentos feitos fora do app (Pix direto, dinheiro). Pelo Mercado Pago, tudo é automático.</small>
        </div>
      )}
    </div>
  );
}
