"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { hora, hojeISO, somaDias, real, FUSO } from "../lib/formato";
import { horarioDoDia, primeiroNome, STATUS } from "../lib/agenda";

// Linha do tempo de um dia: horários marcados em blocos do tamanho do atendimento,
// buracos livres, linha do "agora" e, com equipe, uma coluna por profissional.

const PX = 1.5; // pixels por minuto (1 hora = 90px)
const CORES = ["#e2c07f", "#e4afab", "#a9cdb0", "#c3b1e1", "#9fc3df", "#e7a77f"];
const ATIVOS = ["aguardando_sinal", "aguardando_confirmacao", "confirmado", "concluido"];

const diaDe = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(d));
const minutoDe = (d) => {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(d))
    .split(":")
    .map(Number);
  return h * 60 + m;
};
const rotuloHora = (min) => `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`;
const duracao = (min) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h && m ? `${h}h${String(m).padStart(2, "0")}` : h ? `${h}h` : `${m} min`;
};
const semana = (iso) => new Date(`${iso}T12:00:00-03:00`).toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "short" }).replace(".", "");
const numDia = (iso) => Number(iso.slice(8, 10));
const tituloDia = (iso) => {
  const hoje = hojeISO();
  const base = new Date(`${iso}T12:00:00-03:00`).toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long" });
  const pre = iso === hoje ? "Hoje, " : iso === somaDias(hoje, 1) ? "Amanhã, " : iso === somaDias(hoje, -1) ? "Ontem, " : "";
  return pre + (pre ? base : base.charAt(0).toUpperCase() + base.slice(1));
};

// distribui horários que se sobrepõem em faixas lado a lado
function emFaixas(lista) {
  const fim = [];
  const saida = lista.map((a) => {
    let f = fim.findIndex((x) => x <= a.mi);
    if (f === -1) { f = fim.length; fim.push(a.mf); } else fim[f] = a.mf;
    return { ...a, faixa: f };
  });
  return saida.map((a) => ({ ...a, faixas: Math.max(1, ...saida.filter((b) => b.mi < a.mf && b.mf > a.mi).map((b) => b.faixa + 1)) }));
}

export default function LinhaDoTempo({ agendamentos, salao, equipe = [], verValores = true, aoAbrir, aoLivre, diaInicial }) {
  const hoje = hojeISO();
  const [dia, setDia] = useState(diaInicial || hoje);
  const [agora, setAgora] = useState(() => Date.now());
  const faixaDias = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // quantos horários em cada dia (para os pontinhos da faixa de dias)
  const porDia = useMemo(() => {
    const m = new Map();
    agendamentos.forEach((a) => {
      if (!ATIVOS.includes(a.status)) return;
      const k = diaDe(a.inicio);
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }, [agendamentos]);

  const dias = useMemo(() => {
    const l = [];
    for (let i = -7; i <= 30; i++) l.push(somaDias(hoje, i));
    if (!l.includes(dia)) l.push(dia);
    return l.sort();
  }, [hoje, dia]);

  // centraliza o dia escolhido na faixa, sem mexer na rolagem da página
  useEffect(() => {
    const caixa = faixaDias.current;
    const el = caixa?.querySelector(`[data-dia="${dia}"]`);
    if (caixa && el) caixa.scrollTo({ left: el.offsetLeft - caixa.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [dia]);

  const v = useMemo(() => {
    const doDia = agendamentos
      .filter((a) => diaDe(a.inicio) === dia)
      .map((a) => ({ ...a, mi: minutoDe(a.inicio), mf: Math.max(minutoDe(a.fim), minutoDe(a.inicio) + 15) }))
      .sort((x, y) => x.mi - y.mi);
    const ativos = doDia.filter((a) => ATIVOS.includes(a.status));
    const cancelados = doDia.length - ativos.length;
    const h = horarioDoDia(salao, dia);
    const abre = h ? Math.round(h.abre * 60) : null;
    const fecha = h ? Math.round(h.fecha * 60) : null;
    if (!h && !ativos.length) return { fechado: true, cancelados };

    let ini = abre ?? Math.min(...ativos.map((a) => a.mi));
    let fim = fecha ?? Math.max(...ativos.map((a) => a.mf));
    ativos.forEach((a) => { ini = Math.min(ini, a.mi); fim = Math.max(fim, a.mf); });
    ini = Math.floor(ini / 60) * 60;
    fim = Math.ceil(fim / 60) * 60;

    // colunas: uma por profissional quando há equipe
    const ids = new Set(equipe.map((q) => q.id));
    let colunas;
    if (equipe.length > 1) {
      colunas = equipe.map((q, i) => ({ id: q.id, nome: primeiroNome(q.nome), cor: CORES[i % CORES.length], itens: ativos.filter((a) => a.profissional_id === q.id) }));
      const outros = ativos.filter((a) => !ids.has(a.profissional_id));
      if (outros.length) colunas.push({ id: "outros", nome: "Outras", cor: "#bfb3a6", itens: outros });
    } else {
      colunas = [{ id: equipe[0]?.id || null, nome: null, cor: CORES[0], itens: ativos }];
    }

    // buracos livres dentro do horário de funcionamento (só hoje em diante)
    const agoraMin = dia === hoje ? minutoDe(agora) : null;
    const podeLivre = h && dia >= hoje;
    colunas = colunas.map((c) => {
      const livres = [];
      if (podeLivre && c.id !== "outros") {
        let cursor = abre;
        if (agoraMin != null) cursor = Math.max(cursor, Math.ceil(agoraMin / 15) * 15);
        [...c.itens, { mi: fecha, mf: fecha }].forEach((a) => {
          const fimLivre = Math.min(a.mi, fecha);
          if (fimLivre - cursor >= 30) livres.push({ ini: cursor, fim: fimLivre });
          cursor = Math.max(cursor, a.mf);
        });
      }
      return { ...c, itens: emFaixas(c.itens), livres };
    });

    const ocupado = colunas.reduce((s, c) => s + c.itens.reduce((t, a) => t + (a.mf - a.mi), 0), 0);
    const livre = colunas.reduce((s, c) => s + c.livres.reduce((t, l) => t + (l.fim - l.ini), 0), 0);
    const previsto = ativos.reduce((s, a) => s + Number(a.valor || 0), 0);
    return {
      fechado: false,
      foraDoHorario: !h,
      ini, fim, abre, fecha, colunas, cancelados,
      total: ativos.length,
      concluidos: ativos.filter((a) => a.status === "concluido").length,
      pendentes: ativos.filter((a) => a.status === "aguardando_sinal" || a.status === "aguardando_confirmacao").length,
      primeiro: ativos[0], ultimo: ativos.reduce((x, a) => (a.mf > x.mf ? a : x), ativos[0]),
      ocupado, livre, previsto, agoraMin,
    };
  }, [agendamentos, dia, salao, equipe, hoje, agora]);

  const altura = v.fechado ? 0 : (v.fim - v.ini) * PX;
  const topo = (min) => (min - v.ini) * PX;
  const horas = [];
  if (!v.fechado) for (let m = v.ini; m <= v.fim; m += 60) horas.push(m);
  const multi = !v.fechado && v.colunas.length > 1;

  return (
    <div className="lt">
      <div className="lt-dias" ref={faixaDias} role="radiogroup" aria-label="Escolher o dia">
        {dias.map((d) => {
          const n = porDia.get(d) || 0;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={d === dia}
              data-dia={d}
              className={`${d === hoje ? "lt-hoje" : ""} ${d < hoje ? "lt-passado" : ""}`}
              onClick={() => setDia(d)}
              aria-label={`${tituloDia(d)}: ${n} ${n === 1 ? "horário" : "horários"}`}
            >
              <small>{d === hoje ? "hoje" : semana(d)}</small>
              <strong>{numDia(d)}</strong>
              <i aria-hidden="true">{n > 0 ? n : ""}</i>
            </button>
          );
        })}
      </div>

      <div className="lt-cabeca">
        <h2>{tituloDia(dia)}</h2>
        <div className="lt-cabeca-acoes">
          {dia !== hoje && <button type="button" className="link-botao" onClick={() => setDia(hoje)}>Voltar para hoje</button>}
          <label className="lt-calendario">
            <span className="sr">Escolher outra data</span>
            <input type="date" value={dia} min={somaDias(hoje, -70)} max={somaDias(hoje, 120)} onChange={(e) => e.target.value && setDia(e.target.value)} />
          </label>
        </div>
      </div>

      {v.fechado ? (
        <p className="bloco-vazio">O salão não abre neste dia{v.cancelados ? ` · ${v.cancelados} cancelado${v.cancelados > 1 ? "s" : ""}` : ""}.</p>
      ) : (
        <>
          <p className="lt-resumo">
            {v.total === 0 ? (
              <>Nenhum horário marcado{v.abre != null ? ` · aberto das ${rotuloHora(v.abre)} às ${rotuloHora(v.fecha)}` : ""}</>
            ) : (
              <>
                <strong>{v.total} {v.total === 1 ? "atendimento" : "atendimentos"}</strong>
                {` · das ${hora(v.primeiro.inicio)} às ${hora(v.ultimo.fim)}`}
                {` · ${duracao(v.ocupado)} ocupadas`}
                {v.livre > 0 && ` · ${duracao(v.livre)} livres`}
                {verValores && v.previsto > 0 && <> · <span className="lt-valor">{real(v.previsto)}</span> no dia</>}
              </>
            )}
            {v.concluidos > 0 && ` · ${v.concluidos} concluído${v.concluidos > 1 ? "s" : ""}`}
            {v.pendentes > 0 && <span className="lt-pend"> · {v.pendentes} aguardando</span>}
            {v.cancelados > 0 && ` · ${v.cancelados} cancelado${v.cancelados > 1 ? "s" : ""}`}
            {v.foraDoHorario && " · o salão não abre neste dia, mas há horários marcados"}
          </p>

          <div className={`lt-quadro ${multi ? "lt-multi" : ""}`} style={{ "--colunas": v.colunas.length }}>
            {multi && (
              <div className="lt-nomes" aria-hidden="true">
                <span />
                {v.colunas.map((c) => (
                  <span key={c.id} style={{ "--cor": c.cor }}><i />{c.nome}<small>{c.itens.length}</small></span>
                ))}
              </div>
            )}
            <div className="lt-grade" style={{ height: altura }}>
              <div className="lt-eixo" aria-hidden="true">
                {horas.map((m) => (
                  <span key={m} style={{ top: topo(m) }}>{rotuloHora(m)}</span>
                ))}
              </div>
              <div className="lt-colunas">
                {horas.map((m) => <i key={m} className="lt-linha" style={{ top: topo(m) }} aria-hidden="true" />)}
                {horas.slice(0, -1).map((m) => <i key={`m${m}`} className="lt-linha lt-meia" style={{ top: topo(m + 30) }} aria-hidden="true" />)}
                {v.abre != null && v.abre > v.ini && <i className="lt-fora" style={{ top: 0, height: topo(v.abre) }} aria-hidden="true" />}
                {v.fecha != null && v.fecha < v.fim && <i className="lt-fora" style={{ top: topo(v.fecha), height: (v.fim - v.fecha) * PX }} aria-hidden="true" />}

                {v.colunas.map((c) => (
                  <ul key={c.id || "unica"} className="lt-coluna" style={{ "--cor": c.cor }} aria-label={c.nome ? `Agenda de ${c.nome}` : "Horários do dia"}>
                    {c.livres.map((l) => {
                      const alt = (l.fim - l.ini) * PX;
                      const texto = `Livre das ${rotuloHora(l.ini)} às ${rotuloHora(l.fim)}`;
                      return (
                        <li key={`l${l.ini}`} className="lt-livre" style={{ top: topo(l.ini) + 2, height: alt - 4 }}>
                          {aoLivre ? (
                            <button type="button" onClick={() => aoLivre({ dia, profissional: c.id && c.id !== "outros" ? c.id : null })} aria-label={`${texto}${c.nome ? ` com ${c.nome}` : ""}. Agendar neste dia`}>
                              {alt >= 40 && <span>Livre · {duracao(l.fim - l.ini)}</span>}
                              <b>+ Agendar</b>
                            </button>
                          ) : (
                            alt >= 40 && <span>Livre · {duracao(l.fim - l.ini)}</span>
                          )}
                        </li>
                      );
                    })}
                    {c.itens.map((a) => {
                      const alt = (a.mf - a.mi) * PX;
                      const st = STATUS[a.status] || STATUS.confirmado;
                      const compacto = alt < 56;
                      const comServico = alt >= 62;
                      const pendente = a.status === "aguardando_sinal" || a.status === "aguardando_confirmacao";
                      return (
                        <li
                          key={a.codigo}
                          className={`lt-bloco lt-${a.status} ${compacto ? "lt-compacto" : ""}`}
                          style={{ top: topo(a.mi) + 1, height: alt - 2, left: `calc(${(a.faixa / a.faixas) * 100}% + 3px)`, width: `calc(${100 / a.faixas}% - 6px)` }}
                        >
                          <button
                            type="button"
                            onClick={() => aoAbrir?.(a)}
                            aria-label={`${hora(a.inicio)} às ${hora(a.fim)}, ${a.cliente_nome}, ${a.servico_nome}${a.profissional_nome && multi ? `, com ${a.profissional_nome}` : ""}, ${st.texto}`}
                          >
                            <span className="lt-bloco-topo">
                              <span className="lt-bloco-hora">{hora(a.inicio)}{!compacto && <> – {hora(a.fim)}</>}</span>
                              {compacto && <strong>{primeiroNome(a.cliente_nome)}</strong>}
                              {a.status === "concluido" && <em className="lt-selo" title="Concluído">✓</em>}
                              {a.demo && <em className="lt-selo lt-exemplo">exemplo</em>}
                            </span>
                            {!compacto && <strong>{a.cliente_nome}</strong>}
                            {pendente && alt >= 88 && <em className="lt-selo lt-selo-linha">{st.texto}</em>}
                            {!compacto && comServico && <small>{a.servico_nome}{!multi && equipe.length > 1 && a.profissional_nome ? ` · ${primeiroNome(a.profissional_nome)}` : ""}</small>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ))}

                {v.agoraMin != null && v.agoraMin >= v.ini && v.agoraMin <= v.fim && (
                  <div className="lt-agora" style={{ top: topo(v.agoraMin) }} aria-label={`Agora, ${hora(agora)}`}>
                    <span>{hora(agora)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
