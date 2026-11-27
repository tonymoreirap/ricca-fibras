"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { rpc } from "../../lib/supabase";
import { lerSessao, limparSessao, sessaoExpirada } from "../../lib/sessao";
import { real, hora, dataLonga, hojeISO, somaDias, celularFormatado } from "../../lib/formato";
import { STATUS, primeiroNome } from "../../lib/agenda";
import { whatsCliente } from "../../lib/mensagens";
import { useSalao, LogoDe } from "../../components/Empresa";
import { IconeConversa, IconeCheck } from "../../components/Icones";

const FUSO = "America/Fortaleza";
const diaDe = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: FUSO });

function rotuloDia(iso) {
  const hoje = hojeISO();
  if (iso === hoje) return "Hoje";
  if (iso === somaDias(hoje, 1)) return "Amanhã";
  if (iso === somaDias(hoje, -1)) return "Ontem";
  return dataLonga(`${iso}T12:00:00-03:00`);
}

function Horario({ a, verValores, salao, mudar, ocupado }) {
  const st = STATUS[a.status] || STATUS.confirmado;
  const comecou = new Date(a.inicio).getTime() <= Date.now() + 30 * 60000;
  const msg = `Oi, ${primeiroNome(a.cliente_nome)}! Aqui é ${primeiroNome(salao.__eu || "")}${salao.__eu ? ", " : ""}da ${salao.nome}. Sobre seu horário de ${a.servico_nome}, ${dataLonga(a.inicio)} às ${hora(a.inicio)}.`;
  return (
    <li className={`ag-item aberto ag-${a.status}`}>
      <div className="ag-linha">
        <span className="ag-hora">
          {hora(a.inicio)}
          <small>{hora(a.fim)}</small>
        </span>
        <span className="ag-texto">
          <strong>{a.cliente_nome}</strong>
          <small>
            {a.servico_nome}
            {verValores && a.valor != null && <> · {real(a.valor)}</>}
          </small>
        </span>
        <span className={`chip ${st.classe}`}>{st.texto}</span>
      </div>
      {a.status === "cancelado" && a.cancelado_por === "cliente" && a.motivo_cancelamento && (
        <p className="eqp-motivo">Cancelou: “{a.motivo_cancelamento}”</p>
      )}
      {a.status !== "cancelado" && (
        <div className="ag-links eqp-acoes">
          <a href={whatsCliente(a.cliente_celular, msg)} target="_blank" rel="noopener">
            <IconeConversa width="18" height="18" /> {celularFormatado(a.cliente_celular)}
          </a>
          {a.status === "confirmado" && comecou && (
            <button type="button" className="acao acao-forte" disabled={ocupado} onClick={() => mudar(a.codigo, "concluido")}>
              <IconeCheck stroke="currentColor" width="16" height="16" /> Concluir
            </button>
          )}
          {a.status === "concluido" && (
            <button type="button" className="link-botao" disabled={ocupado} onClick={() => mudar(a.codigo, "confirmado")}>Desfazer</button>
          )}
        </div>
      )}
    </li>
  );
}

export default function PainelEquipe() {
  const salao = useSalao();
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [d, setD] = useState(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("agenda");
  const [anteriores, setAnteriores] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");

  const sair = useCallback(() => {
    limparSessao("profissional");
    router.replace("/equipe/entrar");
  }, [router]);

  const carregar = useCallback(
    (t) =>
      rpc("profissional_painel", { p_token: t })
        .then((r) => { setD(r); setErro(""); })
        .catch((e) => (sessaoExpirada(e) ? sair() : setErro("Não foi possível carregar. Verifique a internet."))),
    [sair]
  );

  useEffect(() => {
    const s = lerSessao("profissional");
    if (!s?.token) return router.replace("/equipe/entrar");
    setToken(s.token);
    carregar(s.token);
  }, [router, carregar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function mudar(codigo, status) {
    setOcupado(true);
    try {
      const r = await rpc("profissional_status", { p_token: token, p_codigo: codigo, p_status: status });
      setAviso(r.ok ? (status === "concluido" ? "Atendimento concluído" : "Desfeito") : r.erro);
      if (r.ok) await carregar(token);
    } catch (e) {
      sessaoExpirada(e) ? sair() : setAviso("Sem conexão. Tente de novo.");
    }
    setOcupado(false);
  }

  const vis = useMemo(() => {
    if (!d) return null;
    const hoje = hojeISO();
    const agrupar = (l) => {
      const g = new Map();
      l.forEach((a) => { const k = diaDe(a.inicio); if (!g.has(k)) g.set(k, []); g.get(k).push(a); });
      return [...g.entries()];
    };
    const futuros = d.agendamentos.filter((a) => diaDe(a.inicio) >= hoje);
    const passados = d.agendamentos.filter((a) => diaDe(a.inicio) < hoje).reverse();
    return { dias: agrupar(futuros), passados: agrupar(passados) };
  }, [d]);

  if (!d || !vis) {
    return (
      <div className="app app-admin">
        <main className="tela carregando-tela">
          {erro ? <p className="erro">{erro}</p> : <span className="pulso" aria-label="Carregando" />}
        </main>
      </div>
    );
  }

  const { eu, resumo } = d;
  const s = { ...salao, __eu: eu.nome };

  return (
    <div className="app app-admin app-equipe">
      <header className="adm-topo">
        <div className="eqp-marca">
          <LogoDe salao={salao} tamanho={40} />
          <div>
            <p className="c-saudacao">{salao.nome}</p>
            <h1>Olá, {primeiroNome(eu.nome)}</h1>
          </div>
        </div>
        <button type="button" className="barra-link" onClick={sair}>Sair</button>
      </header>

      <main className="tela">
        {!eu.ativo && <p className="aviso-demo">Você está fora da agenda no momento. Fale com a dona do salão.</p>}

        <section className="kpis" aria-label="Resumo">
          <div className="kpi vidro">
            <span>Hoje</span>
            <strong>{resumo.hoje}</strong>
            <small>{resumo.hoje === 1 ? "atendimento" : "atendimentos"}</small>
          </div>
          <div className="kpi vidro">
            <span>Próximos 7 dias</span>
            <strong>{resumo.semana}</strong>
            <small>horários marcados</small>
          </div>
          <div className="kpi vidro">
            <span>Concluídos no mês</span>
            <strong>{resumo.concluidos_mes}</strong>
            <small>atendimentos</small>
          </div>
          {eu.ver_valores && (
            <div className="kpi vidro">
              <span>Seu mês</span>
              <strong className="kpi-valor">{real(resumo.valor_mes)}</strong>
              <small>concluído · previsto {real(resumo.previsto_mes)}</small>
            </div>
          )}
        </section>

        <nav className="segmento" aria-label="Seções">
          {[["agenda", "Agenda"], ["clientes", "Clientes"]].map(([k, t]) => (
            <button key={k} type="button" aria-pressed={aba === k} onClick={() => setAba(k)}>{t}</button>
          ))}
        </nav>

        {aba === "agenda" && (
          <section className="adm-secao">
            {vis.dias.length === 0 && <p className="bloco-vazio">Nenhum horário marcado daqui pra frente.</p>}
            {vis.dias.map(([dia, itens]) => (
              <div key={dia} className="ag-dia">
                <h2 className="ag-dia-titulo"><span>{rotuloDia(dia)}</span><small>{itens.filter((a) => a.status !== "cancelado").length}</small></h2>
                <ul className="ag-lista vidro">
                  {itens.map((a) => <Horario key={a.codigo} a={a} verValores={eu.ver_valores} salao={s} mudar={mudar} ocupado={ocupado} />)}
                </ul>
              </div>
            ))}
            {vis.passados.length > 0 && (
              <button type="button" className="botao-linha" onClick={() => setAnteriores((v) => !v)}>
                {anteriores ? "Esconder anteriores" : "Ver atendimentos anteriores"}
              </button>
            )}
            {anteriores && vis.passados.map(([dia, itens]) => (
              <div key={dia} className="ag-dia ag-dia-passado">
                <h2 className="ag-dia-titulo"><span>{rotuloDia(dia)}</span><small>{itens.length}</small></h2>
                <ul className="ag-lista vidro">
                  {itens.map((a) => <Horario key={a.codigo} a={a} verValores={eu.ver_valores} salao={s} mudar={mudar} ocupado={ocupado} />)}
                </ul>
              </div>
            ))}
          </section>
        )}

        {aba === "clientes" && (
          <section className="adm-secao">
            {d.clientes.length === 0 ? (
              <p className="bloco-vazio">As clientes que você atender aparecem aqui.</p>
            ) : (
              <ul className="eqp-clientes">
                {d.clientes.map((c) => (
                  <li key={c.celular} className="vidro">
                    <span>
                      <strong>{c.nome}</strong>
                      <small>
                        {c.atendimentos} {c.atendimentos === 1 ? "atendimento" : "atendimentos"}
                        {c.proximo ? ` · próximo ${dataLonga(c.proximo)} às ${hora(c.proximo)}` : c.ultimo ? ` · último em ${new Date(c.ultimo).toLocaleDateString("pt-BR", { timeZone: FUSO })}` : ""}
                      </small>
                    </span>
                    <a href={whatsCliente(c.celular, `Oi, ${primeiroNome(c.nome)}! Aqui é ${primeiroNome(eu.nome)}, da ${salao.nome}.`)} target="_blank" rel="noopener" aria-label={`WhatsApp de ${c.nome}`}>
                      <IconeConversa width="20" height="20" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  );
}
