"use client";

import { useEffect, useState } from "react";
import { real, hora, hojeISO, somaDias, FUSO } from "../../lib/formato";
import { primeiroNome } from "../../lib/agenda";
import { estadoPush, ativarPush, desativarPush, testarPush } from "../../lib/push";
import { IconeSino, IconeCheck } from "../Icones";

const H = 3600e3;
const diaDe = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(d));
const curta = (d) => new Date(d).toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "");
const dataDia = (iso) => new Date(`${iso}T12:00:00-03:00`).toLocaleDateString("pt-BR", { timeZone: FUSO, day: "numeric", month: "long" });

// Monta a lista de alertas a partir dos dados do painel
export function montarAlertas(dados) {
  const agora = Date.now();
  const hoje = hojeISO();
  const amanha = somaDias(hoje, 1);
  const lista = [];
  const ativos = dados.agendamentos.filter((a) => ["aguardando_sinal", "confirmado"].includes(a.status) && new Date(a.fim).getTime() > agora);

  for (const a of ativos) {
    const nome = primeiroNome(a.cliente_nome);
    const pendente = a.status === "aguardando_sinal";
    if (pendente && a.pix_informado_em) {
      lista.push({ id: `pix-${a.codigo}`, grupo: "pagamentos", nivel: "urgente", demo: a.demo, ir: { aba: "sinais", chave: a.codigo },
        titulo: `${nome} disse que enviou o Pix`, texto: `Sinal de ${real(a.sinal)} · ${curta(a.inicio)} às ${hora(a.inicio)}. Confira e confirme.` });
    } else if (pendente) {
      const perto = new Date(a.inicio).getTime() - agora < 48 * H;
      lista.push({ id: `sinal-${a.codigo}`, grupo: "pagamentos", nivel: perto ? "urgente" : "atencao", demo: a.demo, ir: { aba: "sinais", chave: a.codigo },
        titulo: `Sinal pendente: ${nome}`, texto: `${real(a.sinal)} · ${curta(a.inicio)} às ${hora(a.inicio)}${perto ? " · falta pouco" : ""}` });
    }
    const dia = diaDe(a.inicio);
    if (dia === hoje || dia === amanha) {
      lista.push({ id: `agenda-${a.codigo}`, grupo: dia === hoje ? "hoje" : "amanha", nivel: "atencao", demo: a.demo, ir: { aba: "agenda", chave: a.codigo },
        titulo: `${hora(a.inicio)} · ${a.cliente_nome}`, texto: `${a.servico_nome} · ${pendente ? "sinal pendente" : "sinal pago"}` });
    }
  }

  for (const a of dados.agendamentos) {
    const nome = primeiroNome(a.cliente_nome);
    if (a.criado_por === "cliente" && agora - new Date(a.criado_em).getTime() < 24 * H && a.status !== "cancelado") {
      lista.push({ id: `nova-${a.codigo}`, grupo: "novidades", nivel: "info", demo: a.demo, ir: { aba: "agenda", chave: a.codigo },
        titulo: `Reserva nova: ${nome}`, texto: `${a.servico_nome} · ${curta(a.inicio)} às ${hora(a.inicio)}` });
    }
    if (a.status === "confirmado" && a.atualizado_em && agora - new Date(a.atualizado_em).getTime() < 48 * H) {
      lista.push({ id: `pago-${a.codigo}`, grupo: "novidades", nivel: "ok", demo: a.demo, ir: { aba: "agenda", chave: a.codigo },
        titulo: `Sinal recebido: ${nome}`, texto: `${real(a.sinal)} confirmado · falta ${real(a.valor - a.sinal)} no dia` });
    }
  }

  for (const c of dados.clientes) {
    const m = c.manutencao;
    if (!m || c.proximo) continue;
    if (m.dias_restantes < 0) {
      lista.push({ id: `atraso-${c.celular}-${m.proxima}`, grupo: "manutencao", nivel: "atencao", demo: c.demo, ir: { aba: "manut", chave: c.celular },
        titulo: `Manutenção atrasada: ${primeiroNome(c.nome)}`, texto: `Venceu em ${dataDia(m.proxima)} e ainda não marcou` });
    } else if (m.dias_restantes <= 5) {
      lista.push({ id: `vence-${c.celular}-${m.proxima}`, grupo: "manutencao", nivel: "info", demo: c.demo, ir: { aba: "manut", chave: c.celular },
        titulo: `Manutenção vence em ${m.dias_restantes} ${m.dias_restantes === 1 ? "dia" : "dias"}: ${primeiroNome(c.nome)}`, texto: `Até ${dataDia(m.proxima)} · sem horário marcado` });
    }
  }
  const peso = (x) => (x.id.startsWith("pix-") ? 0 : { urgente: 1, atencao: 2, info: 3, ok: 4 }[x.nivel]);
  return lista.sort((x, y) => peso(x) - peso(y));
}

const GRUPOS = [
  ["pagamentos", "Pagamentos"],
  ["hoje", "Hoje"],
  ["amanha", "Amanhã"],
  ["novidades", "Novidades"],
  ["manutencao", "Manutenções"],
];

const CHAVE_VISTOS = "rica:alertas-vistos";
const lerVistos = () => {
  try { return new Set(JSON.parse(localStorage.getItem(CHAVE_VISTOS) || "[]")); } catch { return new Set(); }
};

export function useAlertas(dados) {
  const [vistos, setVistos] = useState(() => new Set());
  useEffect(() => setVistos(lerVistos()), []);
  const lista = dados ? montarAlertas(dados) : [];
  const novos = lista.filter((a) => !vistos.has(a.id) && a.nivel !== "ok").length;
  const marcarVistos = () => {
    const ids = lista.map((a) => a.id);
    try { localStorage.setItem(CHAVE_VISTOS, JSON.stringify(ids.slice(-300))); } catch {}
    setVistos(new Set(ids));
  };
  return { lista, novos, marcarVistos };
}

export function BotaoSino({ novos, aoAbrir }) {
  return (
    <button type="button" className={`sino ${novos ? "sino-ativo" : ""}`} onClick={aoAbrir} aria-label={novos ? `${novos} alertas novos` : "Alertas"}>
      <IconeSino />
      {novos > 0 && <i>{novos > 9 ? "9+" : novos}</i>}
    </button>
  );
}

function AvisosCelular({ token }) {
  const [estado, setEstado] = useState("carregando");
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { estadoPush().then(setEstado).catch(() => setEstado("indisponivel")); }, []);

  const agir = async (fn, ok) => {
    setOcupado(true);
    setMsg("");
    try {
      await fn();
      setEstado(await estadoPush());
      if (ok) setMsg(ok);
    } catch (e) {
      setMsg(e.message);
    }
    setOcupado(false);
  };

  return (
    <div className={`avisos-cel avisos-${estado}`}>
      {estado === "ativo" ? (
        <>
          <p><strong>Avisos ligados neste celular.</strong> Reservas novas, Pix informado, agenda às 7h, a de amanhã às 19h e 1 hora antes de cada cliente.</p>
          <div className="avisos-botoes">
            <button type="button" className="acao acao-forte" disabled={ocupado} onClick={() => agir(async () => { const r = await testarPush(token); if (!r.ok) throw new Error(r.erro); }, "Enviado. Deve chegar em alguns segundos.")}>Enviar um teste</button>
            <button type="button" className="acao" disabled={ocupado} onClick={() => agir(() => desativarPush(token))}>Desligar</button>
          </div>
        </>
      ) : estado === "inativo" ? (
        <>
          <p><strong>Receba os avisos no celular</strong>, mesmo com o app fechado: reservas novas, Pix informado e lembretes da agenda.</p>
          <button type="button" className="botao-ouro" disabled={ocupado} onClick={() => agir(() => ativarPush(token), "Pronto! Os avisos estão ligados.")}>
            <IconeSino stroke="currentColor" /> Ligar avisos no celular
          </button>
        </>
      ) : estado === "instalar-ios" ? (
        <p><strong>No iPhone, instale o app primeiro:</strong> no Safari toque em Compartilhar → “Adicionar à Tela de Início”, abra o app pelo ícone e volte aqui para ligar os avisos.</p>
      ) : estado === "negado" ? (
        <p><strong>As notificações estão bloqueadas.</strong> Libere nas configurações do navegador (cadeado ao lado do endereço → Notificações → Permitir) e volte aqui.</p>
      ) : estado === "indisponivel" ? (
        <p>Este navegador não recebe notificações. Use o Chrome no Android ou o app instalado no iPhone.</p>
      ) : null}
      {msg && <p className="avisos-msg">{msg}</p>}
    </div>
  );
}

function ItemAlerta({ a, aoIr }) {
  return (
    <li>
      <button type="button" className={`alerta alerta-${a.nivel}`} onClick={() => aoIr(a.ir)}>
        <span className="alerta-ponto" aria-hidden="true">{a.nivel === "ok" ? <IconeCheck stroke="currentColor" width="14" height="14" /> : null}</span>
        <span className="alerta-texto">
          <strong>{a.titulo}{a.demo && <em className="selo-exemplo">exemplo</em>}</strong>
          <small>{a.texto}</small>
        </span>
      </button>
    </li>
  );
}

export function FolhaAlertas({ lista, token, aoFechar, aoIr }) {
  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha folha-alta folha-alertas" role="dialog" aria-modal="true" aria-labelledby="alertas-titulo" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        <h2 id="alertas-titulo" className="folha-titulo">Alertas</h2>
        <AvisosCelular token={token} />
        {lista.length === 0 && <p className="bloco-vazio">Tudo em dia. Nenhum alerta agora.</p>}
        {GRUPOS.map(([g, t]) => {
          const itens = lista.filter((a) => a.grupo === g);
          if (!itens.length) return null;
          return (
            <section key={g} className="alertas-grupo">
              <h3>{t}<small>{itens.length}</small></h3>
              <ul>{itens.map((a) => <ItemAlerta key={a.id} a={a} aoIr={aoIr} />)}</ul>
            </section>
          );
        })}
        <button type="button" className="folha-fechar" onClick={aoFechar}>Fechar</button>
      </div>
    </div>
  );
}

// Resumo que aparece uma vez por dia ao abrir o painel
const CHAVE_RESUMO = "rica:resumo-visto";
export function useResumoDoDia(lista, pronto) {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (!pronto) return;
    const hoje = hojeISO();
    let visto = "";
    try { visto = localStorage.getItem(CHAVE_RESUMO) || ""; } catch {}
    const importante = lista.some((a) => a.grupo === "hoje" || a.grupo === "amanha" || a.nivel === "urgente");
    if (visto !== hoje && importante) setAberto(true);
  }, [pronto]); // eslint-disable-line react-hooks/exhaustive-deps
  const fechar = () => {
    try { localStorage.setItem(CHAVE_RESUMO, hojeISO()); } catch {}
    setAberto(false);
  };
  return { aberto, fechar };
}

export function ModalResumo({ lista, nome, aoFechar, aoVerTudo }) {
  const hoje = lista.filter((a) => a.grupo === "hoje");
  const amanha = lista.filter((a) => a.grupo === "amanha");
  const urgentes = lista.filter((a) => a.nivel === "urgente");
  const linha = (a) => <li key={a.id}><strong>{a.titulo}</strong><small>{a.texto}{a.demo ? " · exemplo" : ""}</small></li>;
  return (
    <div className="modal-fundo" onClick={aoFechar}>
      <div className="modal-resumo vidro" role="dialog" aria-modal="true" aria-labelledby="resumo-titulo" onClick={(e) => e.stopPropagation()}>
        <span className="modal-sino" aria-hidden="true"><IconeSino width="28" height="28" /></span>
        <h2 id="resumo-titulo">{nome ? `${nome}, não esqueça` : "Não esqueça"}</h2>
        {hoje.length > 0 && (<><h3>Hoje</h3><ul>{hoje.map(linha)}</ul></>)}
        {amanha.length > 0 && (<><h3>Amanhã</h3><ul>{amanha.map(linha)}</ul></>)}
        {urgentes.length > 0 && (
          <p className="modal-urgente">
            {urgentes.length} {urgentes.length === 1 ? "pagamento precisa" : "pagamentos precisam"} da sua atenção.
          </p>
        )}
        <button type="button" className="botao-ouro" onClick={aoVerTudo}>Ver todos os alertas</button>
        <button type="button" className="folha-fechar" onClick={aoFechar}>Entendi</button>
      </div>
    </div>
  );
}
