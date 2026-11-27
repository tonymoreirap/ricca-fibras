"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rpc } from "../../../lib/supabase";
import { lerSessao, limparSessao, sessaoExpirada } from "../../../lib/sessao";
import { real, hojeISO, celularFormatado } from "../../../lib/formato";
import { primeiroNome } from "../../../lib/agenda";
import { whatsCliente } from "../../../lib/mensagens";
import {
  TIPOS_DESPESA, DIAS_SEMANA, nomeMes, mesCurto, mudarMes, pct, montarAlertasResultado,
} from "../../../lib/resultados";
import { useSalao } from "../../../components/Empresa";
import MenuApp from "../../../components/MenuApp";
import Interruptor from "../../../components/admin/Interruptor";
import { IconeMais, IconeConversa } from "../../../components/Icones";

const n = (v) => Number(v || 0);
// R$ curtinho para o gráfico: 2,8 mil · 950 · -150
const curto = (v) => {
  const x = Number(v || 0);
  const a = Math.abs(x);
  const t = a >= 1000 ? `${(a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(".", ",").replace(",0", "")} mil` : String(Math.round(a));
  return `${x < 0 ? "−" : ""}${t}`;
};
const dataBR = (iso) => {
  const [a, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

// barras horizontais simples (maior valor = barra cheia)
function Barras({ itens, vazio }) {
  if (!itens.length) return <p className="res-vazio">{vazio}</p>;
  const max = Math.max(...itens.map((i) => n(i.valor)), 1);
  return (
    <ul className="res-barras">
      {itens.map((i) => (
        <li key={i.rotulo}>
          <span className="res-barras-rotulo">
            <strong>{i.rotulo}</strong>
            {i.extra && <small>{i.extra}</small>}
          </span>
          <span className="res-barras-trilho" aria-hidden="true">
            <i style={{ width: `${Math.max(2, (n(i.valor) / max) * 100)}%` }} className={i.tom ? `tom-${i.tom}` : ""} />
          </span>
          <span className="res-barras-valor">{real(i.valor)}</span>
        </li>
      ))}
    </ul>
  );
}

// 6 meses: entrou x saiu, com o lucro em cima
function Grafico({ serie, mesAtual }) {
  const max = Math.max(1, ...serie.map((m) => Math.max(n(m.faturado), n(m.despesas) + n(m.comissoes))));
  const descricao = serie.map((m) => `${nomeMes(m.mes)}: entrou ${real(m.faturado)}, saiu ${real(n(m.despesas) + n(m.comissoes))}, lucro ${real(m.lucro)}`).join("; ");
  return (
    <figure className="res-grafico" aria-label={`Últimos 6 meses. ${descricao}`}>
      <div className="res-grafico-colunas">
        {serie.map((m) => {
          const saiu = n(m.despesas) + n(m.comissoes);
          return (
            <div key={m.mes} className={`res-col ${m.mes === mesAtual ? "atual" : ""}`}>
              <span className={`res-col-lucro ${n(m.lucro) < 0 ? "neg" : ""}`}>{n(m.faturado) || saiu ? curto(m.lucro) : "—"}</span>
              <div className="res-col-barras">
                <i className="entrou" style={{ height: `${(n(m.faturado) / max) * 100}%` }} />
                <i className="saiu" style={{ height: `${(saiu / max) * 100}%` }} />
              </div>
              <span className="res-col-mes">{mesCurto(m.mes)}</span>
            </div>
          );
        })}
      </div>
      <figcaption className="res-legenda">
        <span><i className="entrou" /> Entrou</span>
        <span><i className="saiu" /> Despesas e comissões</span>
        <span>Número em cima: lucro (R$)</span>
      </figcaption>
    </figure>
  );
}

function FolhaDespesa({ token, inicial, mes, aoFechar, aoSalvo }) {
  const novo = !inicial.id;
  const [d, setD] = useState({
    categoria: inicial.categoria || "",
    descricao: inicial.descricao || "",
    valor: inicial.valor != null ? String(inicial.valor).replace(".", ",") : "",
    data: inicial.data || (mes === hojeISO().slice(0, 7) + "-01" ? hojeISO() : mes),
    recorrente: Boolean(inicial.recorrente),
  });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const muda = (k) => (v) => setD((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));
  const valido = d.categoria && /\d/.test(d.valor) && d.data;

  async function salvar() {
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("admin_despesa_salvar", { p_token: token, p: { ...d, id: inicial.id || null } });
      if (!r.ok) throw new Error(r.erro);
      aoSalvo(novo ? "Despesa lançada." : "Despesa atualizada.");
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha folha-alta" role="dialog" aria-modal="true" aria-labelledby="dp-titulo" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        <h2 id="dp-titulo" className="folha-titulo">{novo ? "Lançar despesa" : "Editar despesa"}</h2>
        <p className="nh-rotulo">Tipo</p>
        <div className="res-tipos" role="radiogroup" aria-label="Tipo de despesa">
          {Object.entries(TIPOS_DESPESA).map(([k, t]) => (
            <button key={k} type="button" role="radio" aria-checked={d.categoria === k} onClick={() => muda("categoria")(k)}>{t}</button>
          ))}
        </div>
        <div className="form form-compacto">
          <label htmlFor="dp-valor">Valor (R$)</label>
          <input id="dp-valor" inputMode="decimal" value={d.valor} onChange={(e) => muda("valor")(e.target.value.replace(/[^\d,.]/g, ""))} placeholder="0,00" />
          <label htmlFor="dp-desc">Descrição (opcional)</label>
          <input id="dp-desc" maxLength={80} value={d.descricao} onChange={muda("descricao")} placeholder="Ex.: Fibra, gel e lixas" />
          <label htmlFor="dp-data">{d.recorrente ? "Começa em" : "Data"}</label>
          <input id="dp-data" type="date" value={d.data} onChange={muda("data")} />
        </div>
        <Interruptor
          ligado={d.recorrente}
          aoMudar={muda("recorrente")}
          rotulo="Repete todo mês"
          texto={d.recorrente ? "Entra em todos os meses a partir da data, até você excluir." : "Conta só neste mês."}
        />
        {erro && <p className="erro">{erro}</p>}
        <button type="button" className="botao-ouro" disabled={!valido || enviando} onClick={salvar}>
          {enviando ? "Salvando…" : novo ? "Lançar despesa" : "Salvar"}
        </button>
        <button type="button" className="folha-fechar" onClick={aoFechar}>Fechar</button>
      </div>
    </div>
  );
}

export default function Resultados() {
  const salao = useSalao();
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [mes, setMes] = useState(() => `${hojeISO().slice(0, 7)}-01`);
  const [r, setR] = useState(null);
  const [despesas, setDespesas] = useState([]);
  const [erro, setErro] = useState("");
  const [folha, setFolha] = useState(null);
  const [aviso, setAviso] = useState("");
  const [excluir, setExcluir] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const sair = useCallback(() => {
    limparSessao("admin");
    router.replace("/admin/entrar");
  }, [router]);

  const carregar = useCallback(
    (t, m) =>
      Promise.all([rpc("admin_resultados", { p_token: t, p_mes: m }), rpc("admin_despesas", { p_token: t, p_mes: m })])
        .then(([res, desp]) => {
          setR(res);
          setDespesas(desp?.lista || []);
          setErro("");
        })
        .catch((e) => (sessaoExpirada(e) ? sair() : setErro("Não foi possível carregar. Verifique a internet."))),
    [sair]
  );

  useEffect(() => {
    const s = lerSessao("admin");
    if (!s?.token) return router.replace("/admin/entrar");
    setToken(s.token);
  }, [router]);

  useEffect(() => {
    if (token) {
      setR(null);
      carregar(token, mes);
    }
  }, [token, mes, carregar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 3200);
    return () => clearTimeout(t);
  }, [aviso]);

  const alertas = useMemo(() => (r ? montarAlertasResultado(r) : []), [r]);
  const mesHoje = `${hojeISO().slice(0, 7)}-01`;

  async function concluirPassados() {
    setOcupado(true);
    try {
      const x = await rpc("admin_concluir_passados", { p_token: token });
      setAviso(`${x.concluidos} ${x.concluidos === 1 ? "atendimento concluído" : "atendimentos concluídos"}.`);
      await carregar(token, mes);
    } catch {
      setAviso("Sem conexão. Tente de novo.");
    }
    setOcupado(false);
  }

  async function apagarDespesa(dsp) {
    setOcupado(true);
    try {
      const x = await rpc("admin_despesa_excluir", { p_token: token, p_id: dsp.id, p_mes: mes });
      setAviso(x.ok ? (dsp.recorrente ? "A despesa para de contar a partir deste mês." : "Despesa excluída.") : x.erro);
      await carregar(token, mes);
    } catch {
      setAviso("Sem conexão. Tente de novo.");
    }
    setExcluir(null);
    setOcupado(false);
  }

  const acaoDoAlerta = (a) => {
    if (a.acao === "concluir") return <button type="button" className="acao acao-forte" disabled={ocupado} onClick={concluirPassados}>Marcar como concluídos</button>;
    if (a.acao === "despesa") return <button type="button" className="acao acao-forte" onClick={() => setFolha({})}>Lançar despesa</button>;
    if (a.acao === "sumidas") return <a className="acao" href="#sumidas">Ver quem são</a>;
    if (a.href) return <Link className="acao" href={a.href}>Abrir</Link>;
    return null;
  };

  const anterior = r?.serie?.[r.serie.length - 2];
  const entrou = n(r?.receita_total);
  const saiu = n(r?.despesas) + n(r?.comissoes);
  const margem = entrou > 0 ? pct(n(r?.lucro), entrou) : null;

  return (
    <div className="app app-admin app-resultados">
      <header className="adm-topo">
        <div>
          <p className="c-saudacao">Painel</p>
          <h1>Resultados</h1>
        </div>
        <Link href="/admin" className="barra-link">Agenda</Link>
      </header>

      <main className="tela">
        <div className="res-mes" role="group" aria-label="Mês">
          <button type="button" onClick={() => setMes(mudarMes(mes, -1))} aria-label="Mês anterior">‹</button>
          <strong>{nomeMes(mes)}</strong>
          <button type="button" onClick={() => setMes(mudarMes(mes, 1))} disabled={mes >= mesHoje} aria-label="Próximo mês">›</button>
        </div>

        {erro && <p className="erro">{erro}</p>}
        {!r && !erro && <span className="pulso" aria-label="Carregando" />}

        {r && (
          <>
            <section className={`res-lucro vidro ${n(r.lucro) < 0 ? "neg" : ""}`} aria-labelledby="res-lucro-t">
              <p id="res-lucro-t" className="res-rotulo">{r.mes_atual ? "Lucro até agora" : "Lucro do mês"}</p>
              <strong className="res-lucro-valor">{real(r.lucro)}</strong>
              {margem != null && n(r.despesas) > 0 && <p className="res-margem">Sobram {margem}% de cada real que entra</p>}
              <dl className="res-conta">
                <div><dt>Entrou</dt><dd>{real(entrou)}</dd></div>
                <div><dt>Despesas</dt><dd>− {real(r.despesas)}</dd></div>
                <div><dt>Comissões</dt><dd>− {real(r.comissoes)}</dd></div>
              </dl>
              {r.mes_atual && n(r.a_receber) > 0 && (
                <p className="res-nota">+ {real(r.a_receber)} em horários marcados até o fim do mês</p>
              )}
              {anterior && (n(anterior.faturado) > 0 || n(anterior.despesas) > 0) && (
                <p className="res-nota">Mês anterior: lucro de {real(anterior.lucro)} com {anterior.atendimentos} {anterior.atendimentos === 1 ? "atendimento" : "atendimentos"}</p>
              )}
            </section>

            <section className="kpis res-kpis" aria-label="Números do mês">
              <div className="kpi vidro"><span>Atendimentos</span><strong>{r.atendimentos}</strong><small>concluídos</small></div>
              <div className="kpi vidro"><span>Ticket médio</span><strong className="kpi-valor">{real(r.ticket_medio)}</strong><small>por atendimento</small></div>
              <div className="kpi vidro"><span>Agenda ocupada</span><strong>{r.ocupacao.pct != null ? `${r.ocupacao.pct}%` : "—"}</strong><small>{r.ocupacao.ocupadas_horas} de {r.ocupacao.capacidade_horas} horas</small></div>
              <div className="kpi vidro"><span>Clientes</span><strong>{r.clientes.atendidas}</strong><small>{r.clientes.novas} {r.clientes.novas === 1 ? "nova" : "novas"}</small></div>
            </section>

            {alertas.length > 0 && (
              <section className="res-bloco" aria-labelledby="res-alertas">
                <h2 id="res-alertas" className="res-titulo">O que olhar agora</h2>
                <ul className="res-alertas">
                  {alertas.map((a) => (
                    <li key={a.id} className={`vidro res-alerta-${a.nivel}`}>
                      <strong>{a.titulo}</strong>
                      <p>{a.texto}</p>
                      {acaoDoAlerta(a)}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="res-bloco vidro" aria-labelledby="res-6m">
              <h2 id="res-6m" className="res-titulo">Últimos 6 meses</h2>
              <Grafico serie={r.serie || []} mesAtual={mes} />
            </section>

            <section className="res-bloco vidro" aria-labelledby="res-area">
              <h2 id="res-area" className="res-titulo">Quanto entrou por área</h2>
              <Barras
                itens={[
                  ...r.por_area.map((x) => ({ rotulo: x.area, valor: x.valor, extra: `${x.qtd} ${x.qtd === 1 ? "atendimento" : "atendimentos"}` })),
                  ...(n(r.cursos.receita) > 0 ? [{ rotulo: "Cursos", valor: r.cursos.receita, extra: `${r.cursos.matriculadas} ${r.cursos.matriculadas === 1 ? "matrícula" : "matrículas"}` }] : []),
                ]}
                vazio="Nenhum atendimento concluído neste mês ainda."
              />
              {r.por_area.length === 1 && r.por_area[0].area === "Sem tipo" && (
                <p className="res-dica">Dica: em <Link href="/admin/servicos">Serviços</Link>, preencha o “Tipo de serviço” (Unhas, Cílios...) para ver cada área separada.</p>
              )}
            </section>

            <section className="res-bloco vidro" aria-labelledby="res-serv">
              <h2 id="res-serv" className="res-titulo">Por serviço</h2>
              <Barras
                itens={r.por_servico.filter((x) => n(x.valor) > 0 || n(x.cancelados) > 0).map((x) => ({
                  rotulo: x.servico, valor: x.valor || 0,
                  extra: `${x.qtd || 0} ${x.qtd === 1 ? "vez" : "vezes"}${n(x.cancelados) ? ` · ${x.cancelados} ${x.cancelados === 1 ? "cancelado" : "cancelados"}` : ""}`,
                }))}
                vazio="Nenhum serviço concluído neste mês ainda."
              />
            </section>

            {r.por_profissional.length > 0 && (r.por_profissional.length > 1 || n(r.comissoes) > 0) && (
              <section className="res-bloco vidro" aria-labelledby="res-prof">
                <h2 id="res-prof" className="res-titulo">Por profissional</h2>
                <ul className="res-prof">
                  {r.por_profissional.map((p) => (
                    <li key={p.nome}>
                      <span><strong>{p.nome}</strong><small>{p.qtd} {p.qtd === 1 ? "atendimento" : "atendimentos"}{n(p.cancelados) ? ` · ${p.cancelados} cancelados` : ""}</small></span>
                      <span className="res-prof-num"><strong>{real(p.valor)}</strong><small>{n(p.comissao_pct) > 0 ? `comissão ${n(p.comissao_pct)}%: ${real(p.comissao)}` : "sem comissão"}</small></span>
                    </li>
                  ))}
                </ul>
                <p className="res-dica">A porcentagem de cada uma você define em <Link href="/admin/equipe">Equipe</Link>.</p>
              </section>
            )}

            <section className="res-bloco vidro" aria-labelledby="res-perdas">
              <h2 id="res-perdas" className="res-titulo">Onde o dinheiro escapa</h2>
              <ul className="res-perdas">
                <li>
                  <span><strong>Cancelamentos</strong><small>
                    {n(r.perdas.cancelados) === 0 ? "Nenhum neste mês" : [
                      r.perdas.por_quem.cliente ? `${r.perdas.por_quem.cliente} pela cliente` : null,
                      r.perdas.por_quem.salao ? `${r.perdas.por_quem.salao} pelo salão` : null,
                      r.perdas.por_quem.sistema ? `${r.perdas.por_quem.sistema} sem confirmação` : null,
                    ].filter(Boolean).join(" · ")}
                  </small></span>
                  <em>{real(r.perdas.cancelados_valor)}</em>
                </li>
                <li>
                  <span><strong>Horas vazias na agenda</strong><small>{r.ocupacao.capacidade_horas - r.ocupacao.ocupadas_horas} horas sem cliente{r.mes_atual ? " até hoje" : ""}</small></span>
                  <em>{n(r.ocupacao.valor_hora) > 0 ? `até ${real((r.ocupacao.capacidade_horas - r.ocupacao.ocupadas_horas) * n(r.ocupacao.valor_hora))}` : "—"}</em>
                </li>
                <li>
                  <span><strong>Descontos de promoções</strong><small>diferença para o preço da tabela</small></span>
                  <em>{real(r.perdas.descontos)}</em>
                </li>
                {n(r.perdas.sinais_pendentes) > 0 && (
                  <li>
                    <span><strong>Sinais não pagos</strong><small>{r.perdas.sinais_pendentes} {r.perdas.sinais_pendentes === 1 ? "horário" : "horários"} esperando Pix</small></span>
                    <em>{real(r.perdas.sinais_pendentes_valor)}</em>
                  </li>
                )}
              </ul>
              {r.perdas.motivos.length > 0 && (
                <>
                  <h3 className="res-sub">Por que as clientes cancelaram</h3>
                  <ul className="res-motivos">
                    {r.perdas.motivos.map((m) => <li key={m.motivo}><span>{m.motivo}</span><strong>{m.qtd}</strong></li>)}
                  </ul>
                </>
              )}
              <p className="res-dica">O valor das horas vazias é uma estimativa: horas livres × quanto a agenda rende por hora ocupada.</p>
            </section>

            <section className="res-bloco vidro" aria-labelledby="res-desp">
              <div className="res-titulo-linha">
                <h2 id="res-desp" className="res-titulo">Despesas</h2>
                <button type="button" className="barra-link" onClick={() => setFolha({})}><IconeMais width="16" height="16" /> Lançar</button>
              </div>
              {r.despesas_por_tipo.length > 0 && (
                <Barras itens={r.despesas_por_tipo.map((x) => ({ rotulo: TIPOS_DESPESA[x.categoria] || x.categoria, valor: x.valor, tom: "rose" }))} vazio="" />
              )}
              {despesas.length === 0 ? (
                <p className="res-vazio">Nenhuma despesa lançada em {nomeMes(mes).toLowerCase()}. Comece pelas fixas: aluguel, luz, internet.</p>
              ) : (
                <ul className="res-desp-lista">
                  {despesas.map((dsp) => (
                    <li key={dsp.id}>
                      <button type="button" className="res-desp-item" onClick={() => setFolha(dsp)}>
                        <span>
                          <strong>{dsp.descricao || TIPOS_DESPESA[dsp.categoria]}</strong>
                          <small>{TIPOS_DESPESA[dsp.categoria]} · {dsp.recorrente ? "todo mês" : dataBR(dsp.data)}</small>
                        </span>
                        <em>{real(dsp.valor)}</em>
                      </button>
                      <button type="button" className={`res-desp-x ${excluir === dsp.id ? "armada" : ""}`} disabled={ocupado}
                        onClick={() => (excluir === dsp.id ? apagarDespesa(dsp) : setExcluir(dsp.id))}
                        aria-label={excluir === dsp.id ? "Toque de novo para excluir" : `Excluir ${dsp.descricao || TIPOS_DESPESA[dsp.categoria]}`}>
                        {excluir === dsp.id ? "Excluir?" : "×"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="res-bloco vidro" aria-labelledby="res-cli">
              <h2 id="res-cli" className="res-titulo">Clientes</h2>
              <dl className="res-grade">
                <div><dt>Atendidas</dt><dd>{r.clientes.atendidas}</dd></div>
                <div><dt>Novas</dt><dd>{r.clientes.novas}</dd></div>
                <div><dt>Reservas pelo app</dt><dd>{r.clientes.reservas_app}</dd></div>
                <div><dt>Marcadas por você</dt><dd>{r.clientes.reservas_painel}</dd></div>
                <div><dt>Visitas ao app</dt><dd>{r.visitas}</dd></div>
                <div><dt>Visitas que reservaram</dt><dd>{n(r.visitas) > 0 ? `${pct(n(r.clientes.reservas_app), n(r.visitas))}%` : "—"}</dd></div>
              </dl>
              {r.clientes.melhores.length > 0 && (
                <>
                  <h3 className="res-sub">Quem mais gastou (6 meses)</h3>
                  <ol className="res-pessoas">
                    {r.clientes.melhores.map((c) => (
                      <li key={c.celular}><span>{c.nome}<small>{c.vezes} {c.vezes === 1 ? "vez" : "vezes"}</small></span><strong>{real(c.total)}</strong></li>
                    ))}
                  </ol>
                </>
              )}
              {r.clientes.sumidas.length > 0 && (
                <>
                  <h3 className="res-sub" id="sumidas">Sumidas há mais de 2 meses</h3>
                  <ul className="res-pessoas">
                    {r.clientes.sumidas.map((c) => (
                      <li key={c.celular}>
                        <span>{c.nome}<small>última vez em {dataBR(c.ultimo)} · gastou {real(c.total)}</small></span>
                        <a className="res-whats" target="_blank" rel="noopener" aria-label={`Chamar ${c.nome} no WhatsApp (${celularFormatado(c.celular)})`}
                          href={whatsCliente(c.celular, `Oi, ${primeiroNome(c.nome)}! Aqui é ${salao.contato !== salao.nome ? `a ${salao.contato}, da ` : "a equipe da "}${salao.nome}. Estamos com saudade! Que tal marcar um horário? É só agendar por aqui: ${typeof window !== "undefined" ? window.location.origin : ""}/agendar`)}>
                          <IconeConversa width="18" height="18" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {r.por_dia_semana.length > 0 && (
              <section className="res-bloco vidro" aria-labelledby="res-dias">
                <h2 id="res-dias" className="res-titulo">Dias da semana</h2>
                <Barras
                  itens={r.por_dia_semana.map((x) => ({ rotulo: DIAS_SEMANA[x.dia], valor: x.valor, extra: `${x.qtd} ${x.qtd === 1 ? "atendimento" : "atendimentos"}` }))}
                  vazio=""
                />
              </section>
            )}

            {(n(r.cursos.inscricoes) > 0 || r.cursos.turmas.length > 0 || n(r.cursos.sem_resposta) > 0) && (
              <section className="res-bloco vidro" aria-labelledby="res-cursos">
                <h2 id="res-cursos" className="res-titulo">Cursos</h2>
                <dl className="res-grade">
                  <div><dt>Interessadas no mês</dt><dd>{r.cursos.inscricoes}</dd></div>
                  <div><dt>Matriculadas</dt><dd>{r.cursos.matriculadas}</dd></div>
                  <div><dt>Sem resposta</dt><dd>{r.cursos.sem_resposta}</dd></div>
                  <div><dt>Receita</dt><dd>{real(r.cursos.receita)}</dd></div>
                </dl>
                {r.cursos.turmas.length > 0 && (
                  <ul className="res-turmas">
                    {r.cursos.turmas.map((t) => (
                      <li key={`${t.nome}-${t.inicio}`}>
                        <span><strong>{t.nome}</strong><small>{dataBR(t.inicio)}{n(t.valor) ? ` · ${real(t.valor)}` : ""}</small></span>
                        <span className="res-turma-vagas">
                          {t.matriculadas}{t.vagas ? ` de ${t.vagas}` : ""} {t.matriculadas === 1 ? "aluna" : "alunas"}
                          {t.vagas ? <i style={{ width: `${Math.min(100, pct(n(t.matriculadas), n(t.vagas)))}%` }} /> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="res-dica">A receita conta as matrículas feitas no mês, pelo valor da turma. Gastos do curso entram em Despesas, tipo “Curso”.</p>
              </section>
            )}
          </>
        )}
      </main>

      <MenuApp quem={{ tipo: "admin" }} />
      {folha && (
        <FolhaDespesa
          token={token}
          inicial={folha}
          mes={mes}
          aoFechar={() => setFolha(null)}
          aoSalvo={(msg) => {
            setFolha(null);
            setAviso(msg);
            carregar(token, mes);
          }}
        />
      )}
      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  );
}
