"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rpc } from "../../lib/supabase";
import { useSalao } from "../../components/Empresa";
import { Atalho, FolhaPlano } from "../../components/admin/Cadeado";
import CartaoPlano from "../../components/admin/CartaoPlano";
import { temRecurso } from "../../lib/planos";
import { real, hora, dataLonga, celularFormatado, hojeISO, somaDias, FUSO } from "../../lib/formato";
import { STATUS, nivelDe, pagamento, primeiroNome } from "../../lib/agenda";
import { lerSessao, limparSessao, sessaoExpirada } from "../../lib/sessao";
import NovoHorario from "../../components/admin/NovoHorario";
import FolhaCliente from "../../components/admin/FolhaCliente";
import { whatsCliente, msgBoasVindas } from "../../lib/mensagens";
import MenuApp from "../../components/MenuApp";
import { useTema } from "../../components/TemaSazonal";
import { useAlertas, useResumoDoDia, BotaoSino, FolhaAlertas, ModalResumo } from "../../components/admin/Alertas";
import { IconeConversa, IconeMais, IconeBusca, IconeRecibo, IconeCheck, IlustracaoServico } from "../../components/Icones";

const ICONE = { aplicacao: "fibra", manutencao: "manutencao" };
const diaDe = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(d));
const curta = (d) => new Date(d).toLocaleDateString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "short" }).replace(".", "");
const dataDia = (iso) => new Date(`${iso}T12:00:00-03:00`).toLocaleDateString("pt-BR", { timeZone: FUSO, day: "numeric", month: "long" });
const anoMes = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00-03:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "").replace(" de ", "/") : "—");
const ORDENS = { frequentes: "Mais frequentes", antigas: "Mais antigas", nome: "A–Z" };
const whats = (cel, texto) => `https://wa.me/55${String(cel).replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;

function rotuloDia(iso) {
  const hoje = hojeISO();
  if (iso === hoje) return "Hoje";
  if (iso === somaDias(hoje, 1)) return "Amanhã";
  if (iso === somaDias(hoje, -1)) return "Ontem";
  return dataLonga(`${iso}T12:00:00-03:00`);
}

// ações possíveis em cada status (o servidor confere de novo)
const ACOES = {
  aguardando_sinal: [
    { para: "confirmado", texto: "Sinal recebido", forte: true },
    { para: "cancelado", texto: "Cancelar", perigo: true },
  ],
  confirmado: [
    { para: "concluido", texto: "Concluir atendimento", forte: true },
    { para: "aguardando_sinal", texto: "Voltar para aguardando" },
    { para: "cancelado", texto: "Cancelar", perigo: true },
  ],
  concluido: [{ para: "confirmado", texto: "Reabrir" }],
  cancelado: [{ para: "aguardando_sinal", texto: "Reativar horário" }],
};

const ola = (salao, nome) => `Oi, ${primeiroNome(nome)}! Aqui é ${salao.contato !== salao.nome ? `a ${salao.contato}, da ` : "a equipe da "}${salao.nome}.`;

function msgSinal(salao, a, origem) {
  return [
    ola(salao, a.cliente_nome),
    `Seu horário de ${a.servico_nome} está reservado para ${dataLonga(a.inicio)}, às ${hora(a.inicio)}.`,
    `Para confirmar, falta o sinal de ${real(a.sinal)} via Pix. Chave: ${salao.pix.exibicao || salao.pix.chave}.`,
    `Seu recibo: ${origem}/recibo/${a.codigo}`,
  ].join("\n");
}

function msgManutencao(salao, c, origem) {
  const m = c.manutencao;
  const quando = m.dias_restantes < 0 ? `venceu em ${dataDia(m.proxima)}` : `vence em ${dataDia(m.proxima)}`;
  return [
    ola(salao, c.nome),
    `Sua manutenção${salao.slug === "rica" ? " da fibra" : ""} ${quando}. Vamos garantir seu horário?`,
    `Agende pelo app: ${origem}/agendar?servico=manutencao`,
  ].join("\n");
}

function Item({ a, aberto, alternar, mudar, ocupado, origem }) {
  const salao = useSalao();
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const st = STATUS[a.status];
  const pag = pagamento(a, real);
  return (
    <li className={`ag-item ${aberto ? "aberto" : ""} ag-${a.status}`} data-chave={a.codigo}>
      <button type="button" className="ag-linha" onClick={alternar} aria-expanded={aberto}>
        <span className="ag-hora">
          {hora(a.inicio)}
          <small>{hora(a.fim)}</small>
        </span>
        <span className="ag-texto">
          <strong>{a.cliente_nome}</strong>
          <small>{a.servico_nome}{a.demo && <em className="selo-exemplo">exemplo</em>}</small>
        </span>
        <span className={`chip ${st.classe}`}>{st.texto}</span>
      </button>
      {aberto && (
        <div className="ag-detalhe">
          <dl className="ag-dados">
            <div><dt>Celular</dt><dd>{celularFormatado(a.cliente_celular)}</dd></div>
            <div><dt>Valor</dt><dd>{real(a.valor)}</dd></div>
            <div><dt>Sinal</dt><dd>{real(a.sinal)}</dd></div>
            <div><dt>Recibo</dt><dd>{a.codigo}</dd></div>
            <div className="ag-pag"><dt>Pagamento</dt><dd className={pag.ok ? "pag-ok" : pag.ok === false ? "pag-pendente" : ""}>{pag.texto}</dd></div>
          </dl>
          <div className="ag-acoes">
            {ACOES[a.status].map((x) =>
              x.perigo ? (
                <button
                  key={x.para}
                  type="button"
                  className={`acao acao-perigo ${confirmarCancelar ? "armada" : ""}`}
                  disabled={ocupado}
                  onClick={() => (confirmarCancelar ? mudar(a.codigo, x.para) : setConfirmarCancelar(true))}
                >
                  {confirmarCancelar ? "Toque de novo para cancelar" : x.texto}
                </button>
              ) : (
                <button
                  key={x.para}
                  type="button"
                  className={`acao ${x.forte ? "acao-forte" : ""}`}
                  disabled={ocupado}
                  onClick={() => mudar(a.codigo, x.para)}
                >
                  {x.forte && <IconeCheck stroke="currentColor" width="18" height="18" />}
                  {x.texto}
                </button>
              )
            )}
          </div>
          <div className="ag-links">
            {a.demo ? <span className="ag-links-off">WhatsApp desligado nos exemplos</span> : <a href={whats(a.cliente_celular, a.status === "aguardando_sinal" ? msgSinal(salao, a, origem) : ola(salao, a.cliente_nome))} target="_blank" rel="noopener">
              <IconeConversa width="18" height="18" /> WhatsApp
            </a>}
            <a href={`/recibo/${a.codigo}/pdf`} target="_blank" rel="noopener">
              <IconeRecibo width="18" height="18" /> Recibo PDF
            </a>
          </div>
        </div>
      )}
    </li>
  );
}

function Cliente({ c, aberto, alternar, liberar, agendarPara, editar, gerarAcesso, origem }) {
  const salao = useSalao();
  const [confirmar, setConfirmar] = useState(false);
  const [convite, setConvite] = useState(null);
  const pedirAcesso = async (fn) => {
    const cod = await fn(c.celular);
    if (cod) setConvite(cod);
    setConfirmar(false);
  };
  const conta = !c.tem_conta ? "Sem conta no app" : c.verificado ? "Conta verificada" : "Conta criada";
  const nv = nivelDe(c.nivel, salao);
  return (
    <li className={`cl-item vidro ${aberto ? "aberto" : ""}`} data-chave={c.celular}>
      <button type="button" className="cl-linha" onClick={alternar} aria-expanded={aberto}>
        <span className="avatar avatar-p" aria-hidden="true"><span>{c.nome[0]}</span></span>
        <span className="cl-texto">
          <strong>{c.nome}{c.demo && <em className="selo-exemplo">exemplo</em>}</strong>
          <small>{c.atendimentos} {c.atendimentos === 1 ? "atendimento" : "atendimentos"} · desde {anoMes(c.cliente_desde)}</small>
        </span>
        {c.nivel !== "nova" && <span className={`chip ${nv.classe}`}>{c.nivel === "ouro" ? "Ouro" : "Prata"}</span>}
      </button>
      {aberto && (
        <div className="cl-detalhe">
          <dl className="ag-dados">
            <div><dt>Último</dt><dd>{c.ultimo ? curta(c.ultimo) : "—"}</dd></div>
            <div><dt>Próximo</dt><dd>{c.proximo ? `${curta(c.proximo)} · ${hora(c.proximo)}` : "—"}</dd></div>
            <div><dt>Manutenção</dt><dd>{c.manutencao ? dataDia(c.manutencao.proxima) : "—"}</dd></div>
            <div><dt>Celular</dt><dd>{celularFormatado(c.celular)}</dd></div>
            <div><dt>Total pago</dt><dd className="pag-ok">{real(c.pago)}</dd></div>
            <div><dt>Nível</dt><dd>{nv.texto}</dd></div>
            <div><dt>App</dt><dd>{conta}</dd></div>
            {c.aniversario && <div><dt>Aniversário</dt><dd>{dataDia(String(c.aniversario).slice(0, 10)).replace(/ de \d{4}$/, "")}</dd></div>}
            {c.observacoes && <div className="ag-pag"><dt>Observações</dt><dd>{c.observacoes}</dd></div>}
          </dl>
          <div className="ag-acoes">
            <button type="button" className="acao acao-forte" onClick={() => agendarPara(c)}>
              <IconeMais stroke="currentColor" width="18" height="18" /> Agendar para ela
            </button>
            <button type="button" className="acao" onClick={() => editar(c)}>Editar cadastro</button>
            {convite && !c.demo ? (
              <a className="acao acao-forte" href={whatsCliente(c.celular, msgBoasVindas(salao, c, convite, origem))} target="_blank" rel="noopener">
                <IconeConversa stroke="currentColor" width="18" height="18" /> Enviar link de acesso
              </a>
            ) : c.tem_conta ? (
              <button
                type="button"
                className={`acao ${confirmar ? "armada" : ""}`}
                onClick={() => (confirmar ? pedirAcesso(liberar) : setConfirmar(true))}
              >
                {confirmar ? "Toque de novo para liberar" : "Liberar nova senha"}
              </button>
            ) : !c.demo && (
              <button type="button" className="acao" onClick={() => pedirAcesso(gerarAcesso)}>
                {c.convite_pendente ? "Reenviar acesso ao app" : "Enviar acesso ao app"}
              </button>
            )}
          </div>
          <div className="ag-links">
            {c.demo ? <span className="ag-links-off">WhatsApp desligado nos exemplos</span> : <>
            <a href={whats(c.celular, ola(salao, c.nome))} target="_blank" rel="noopener">
              <IconeConversa width="18" height="18" /> WhatsApp
            </a>
            {c.manutencao && (
              <a href={whats(c.celular, msgManutencao(salao, c, origem))} target="_blank" rel="noopener">
                Lembrar manutenção
              </a>
            )}
            </>}
          </div>
        </div>
      )}
    </li>
  );
}

function ConfirmacaoConta({ c, decidir }) {
  const [recusar, setRecusar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const agir = async (aprovar) => { setOcupado(true); await decidir(c.celular, aprovar); setOcupado(false); };
  const outroNome = c.nome_no_salao && c.nome_no_salao.trim().toLowerCase() !== c.nome.trim().toLowerCase();
  return (
    <li className="conf vidro" data-chave={`conf-${c.celular}`}>
      <div className="conf-topo">
        <span>
          <strong>{c.nome}</strong>
          <small>{celularFormatado(c.celular)} · conta criada {curta(c.criado_em)}</small>
        </span>
        <span className="conf-codigo">{c.codigo}</span>
      </div>
      <p className="conf-info">
        {c.pedida_em ? `Disse que enviou o código em ${curta(c.pedida_em)} às ${hora(c.pedida_em)}.` : "Ainda não enviou o código."}
        {outroNome && <> No salão esse número está como <strong>{c.nome_no_salao}</strong>.</>}
        {c.atendimentos > 0 && <> {c.atendimentos} {c.atendimentos === 1 ? "atendimento" : "atendimentos"} no histórico.</>}
      </p>
      <a className="botao-linha conf-conferir" href={`https://wa.me/55${c.celular}`} target="_blank" rel="noopener">
        <IconeConversa width="20" height="20" /> Conferir a conversa no WhatsApp
      </a>
      <p className="conf-dica">Se a mensagem com o código {c.codigo} veio desta conversa, o número é dela.</p>
      <div className="mt-acoes">
        <button type="button" className="acao acao-forte" disabled={ocupado} onClick={() => agir(true)}>
          <IconeCheck stroke="currentColor" width="18" height="18" /> Confirmar
        </button>
        <button type="button" className={`acao acao-perigo ${recusar ? "armada" : ""}`} disabled={ocupado} onClick={() => (recusar ? agir(false) : setRecusar(true))}>
          {recusar ? "Toque de novo: tirar acesso" : "Recusar"}
        </button>
      </div>
    </li>
  );
}

export default function Painel() {
  const salao = useSalao();
  const router = useRouter();
  const [sessao, setSessao] = useState(null);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("agenda");
  const [aberto, setAberto] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [anteriores, setAnteriores] = useState(false);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState("frequentes");
  const [limpar, setLimpar] = useState(false);
  const [verAlertas, setVerAlertas] = useState(false);
  const [travado, setTravado] = useState(null);
  const tema = useTema();
  const alertas = useAlertas(dados);
  const resumoDia = useResumoDoDia(alertas.lista, Boolean(dados));

  function irPara({ aba: destino, chave, href }) {
    setVerAlertas(false);
    if (href) {
      resumoDia.fechar();
      return router.push(href);
    }
    resumoDia.fechar();
    setAba(destino);
    setAberto(chave);
    setTimeout(() => document.querySelector(`[data-chave="${chave}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }
  const abrirAlertas = () => {
    resumoDia.fechar();
    setVerAlertas(true);
    alertas.marcarVistos();
  };
  const [novo, setNovo] = useState(null);
  const [fichaCliente, setFichaCliente] = useState(null);
  const [aviso, setAviso] = useState("");
  const [origem, setOrigem] = useState("");

  const sairPorSessao = useCallback(() => {
    limparSessao("admin");
    router.replace("/admin/entrar");
  }, [router]);

  const carregar = useCallback(
    (token) =>
      Promise.all([
        rpc("admin_painel", { p_token: token }),
        rpc("admin_curso_novas", { p_token: token }).catch(() => 0),
        rpc("admin_confirmacoes", { p_token: token }).catch(() => []),
      ])
        .then(([d, novas, conf]) => { setDados({ ...d, curso_novas: novas || 0, confirmacoes: conf || [] }); setErro(""); })
        .catch((e) => (sessaoExpirada(e) ? sairPorSessao() : setErro("Não foi possível carregar o painel. Verifique a internet."))),
    [sairPorSessao]
  );

  useEffect(() => {
    setOrigem(window.location.origin);
    const s = lerSessao("admin");
    if (!s?.token) {
      router.replace("/admin/entrar");
      return;
    }
    setSessao(s);
    carregar(s.token);
    if (new URLSearchParams(window.location.search).get("novo") === "1") {
      setNovo({});
      window.history.replaceState(null, "", "/admin");
    }
    const atualizar = () => document.visibilityState === "visible" && carregar(s.token);
    document.addEventListener("visibilitychange", atualizar);
    return () => document.removeEventListener("visibilitychange", atualizar);
  }, [router, carregar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 3200);
    return () => clearTimeout(t);
  }, [aviso]);

  async function mudar(codigo, status) {
    setOcupado(true);
    try {
      const r = await rpc("admin_status", { p_token: sessao.token, p_codigo: codigo, p_status: status });
      if (!r.ok) setAviso(r.erro);
      else {
        setAviso({ confirmado: "Sinal confirmado", concluido: "Atendimento concluído", cancelado: "Horário cancelado", aguardando_sinal: "Horário aguardando sinal" }[status]);
        await carregar(sessao.token);
      }
    } catch (e) {
      sessaoExpirada(e) ? sairPorSessao() : setAviso("Sem conexão. Tente de novo.");
    }
    setOcupado(false);
  }

  async function decidirConta(celular, aprovar) {
    try {
      const r = await rpc("admin_conta_confirmar", { p_token: sessao.token, p_celular: celular, p_aprovar: aprovar });
      setAviso(r.ok ? (aprovar ? "Conta confirmada: ela já vê o histórico." : "Acesso retirado. Se for a dona do número, envie o link de acesso.") : r.erro);
      if (r.ok) carregar(sessao.token);
    } catch (e) {
      sessaoExpirada(e) ? sairPorSessao() : setAviso("Sem conexão. Tente de novo.");
    }
  }

  async function gerarAcesso(celular) {
    try {
      const r = await rpc("admin_cliente_convite", { p_token: sessao.token, p_celular: celular });
      if (!r.ok) { setAviso(r.erro); return null; }
      setAviso("Link pronto: toque em Enviar link de acesso.");
      return r.convite;
    } catch (e) {
      sessaoExpirada(e) ? sairPorSessao() : setAviso("Sem conexão. Tente de novo.");
      return null;
    }
  }

  async function liberar(celular) {
    try {
      const r = await rpc("admin_liberar_senha", { p_token: sessao.token, p_celular: celular });
      setAviso(r.ok ? "Senha liberada: envie o link de acesso para ela criar outra." : r.erro);
      if (r.ok) { carregar(sessao.token); return r.convite; }
      return null;
    } catch (e) {
      sessaoExpirada(e) ? sairPorSessao() : setAviso("Sem conexão. Tente de novo.");
    }
  }

  async function limparExemplos() {
    try {
      const r = await rpc("admin_limpar_exemplos", { p_token: sessao.token });
      setAviso(`${r.removidos} agendamentos de exemplo removidos`);
      setLimpar(false);
      carregar(sessao.token);
    } catch (e) {
      setAviso(sessaoExpirada(e) ? "Só o acesso Master pode remover os exemplos." : "Sem conexão. Tente de novo.");
    }
  }

  const vis = useMemo(() => {
    if (!dados) return null;
    const agora = Date.now();
    const hoje = hojeISO();
    const lista = dados.agendamentos;
    const futuros = lista.filter((a) => diaDe(a.inicio) >= hoje && a.status !== "cancelado");
    const passados = lista.filter((a) => diaDe(a.inicio) < hoje).reverse();
    const agrupar = (l) => {
      const g = new Map();
      l.forEach((a) => { const k = diaDe(a.inicio); if (!g.has(k)) g.set(k, []); g.get(k).push(a); });
      return [...g.entries()];
    };
    const sinais = lista.filter((a) => a.status === "aguardando_sinal" && new Date(a.fim).getTime() > agora);
    const manut = dados.clientes
      .filter((c) => c.manutencao)
      .sort((x, y) => x.manutencao.dias_restantes - y.manutencao.dias_restantes);
    const termo = busca.trim().toLowerCase();
    const filtradas = termo
      ? dados.clientes.filter((c) => c.nome.toLowerCase().includes(termo) || c.celular.includes(termo.replace(/\D/g, "") || "§"))
      : dados.clientes;
    const clientes = [...filtradas].sort((x, y) =>
      ordem === "frequentes" ? y.atendimentos - x.atendimentos || Number(y.pago) - Number(x.pago)
      : ordem === "antigas" ? String(x.cliente_desde).localeCompare(String(y.cliente_desde))
      : x.nome.localeCompare(y.nome, "pt-BR"));
    return {
      dias: agrupar(futuros),
      passados: agrupar(passados),
      sinais,
      manut,
      vencendo: manut.filter((c) => c.manutencao.dias_restantes <= 5 && !c.proximo).length,
      clientes,
    };
  }, [dados, busca, ordem]);

  if (!dados || !vis) {
    return (
      <div className="app app-admin">
        <main className="tela carregando-tela">
          {erro ? <p className="erro">{erro}</p> : <span className="pulso" aria-label="Carregando" />}
        </main>
      </div>
    );
  }

  const { eu, resumo } = dados;
  const alternar = (k) => setAberto((v) => (v === k ? null : k));

  return (
    <div className="app app-admin">
      <header className="adm-topo">
        <div>
          <p className="c-saudacao">{tema === "natal" ? `Boas festas · Painel ${salao.nome}` : `Painel ${salao.nome}`}</p>
          <h1>
            Olá, {primeiroNome(eu.nome)}
            {eu.papel === "master" && <span className="selo selo-master">Master</span>}
          </h1>
        </div>
        <BotaoSino novos={alertas.novos} aoAbrir={abrirAlertas} />
      </header>

      <main className="tela">
        {resumo.exemplos > 0 && (
          <div className="aviso-demo">
            <p>
              <strong>Simulação ativa.</strong> {resumo.exemplos} agendamentos de exemplo, marcados com “exemplo”. Eles não
              ocupam vagas reais e os botões de WhatsApp ficam desligados neles.
            </p>
            {eu.papel === "master" && (
              <button type="button" className={`acao acao-perigo ${limpar ? "armada" : ""}`} onClick={() => (limpar ? limparExemplos() : setLimpar(true))}>
                {limpar ? "Toque de novo para remover tudo" : "Remover dados de exemplo"}
              </button>
            )}
          </div>
        )}

        <section className="kpis" aria-label="Resumo">
          <div className="kpi vidro">
            <span>Hoje</span>
            <strong>{resumo.hoje}</strong>
            <small>{resumo.hoje === 1 ? "atendimento" : "atendimentos"}</small>
          </div>
          <button type="button" className={`kpi vidro ${resumo.pendentes ? "kpi-alerta" : ""}`} onClick={() => setAba("sinais")}>
            <span>Sinais pendentes</span>
            <strong>{resumo.pendentes}</strong>
            <small>aguardando Pix</small>
          </button>
          <div className="kpi vidro">
            <span>Recebido no mês</span>
            <strong className="kpi-valor">{real(resumo.recebido_mes)}</strong>
            <small>sinais e concluídos</small>
          </div>
          <div className="kpi vidro">
            <span>Previsto no mês</span>
            <strong className="kpi-valor">{real(resumo.previsto_mes)}</strong>
            <small>todos os horários</small>
          </div>
        </section>

        <CartaoPlano token={sessao.token} />

        <Link href="/admin/salao" className="atalho-curso vidro">
          <span className="atalho-curso-arte" aria-hidden="true"><IlustracaoServico tipo="flor" tamanho={32} /></span>
          <span className="atalho-curso-texto">
            <strong>Meu salão</strong>
            <small>Fotos, cores, WhatsApp, Instagram, Pix e horários</small>
          </span>
        </Link>

        <Atalho
          href="/admin/promocoes"
          liberado={temRecurso(salao, "promocoes")}
          recurso="promocoes"
          arte={<IlustracaoServico tipo="batom" tamanho={32} />}
          titulo="Promoções"
          texto="Ofertas com data para entrar e sair do ar"
          aoTravado={setTravado}
        />

        {eu.papel === "master" && (
          <Link href="/master" className="atalho-curso vidro">
            <span className="atalho-curso-arte" aria-hidden="true"><IlustracaoServico tipo="brilho" tamanho={32} /></span>
            <span className="atalho-curso-texto">
              <strong>Empresas</strong>
              <small>Salões, módulos e acessos das donas</small>
            </span>
          </Link>
        )}

        <Atalho
          href="/admin/curso"
          liberado={temRecurso(salao, "curso") || temRecurso(salao, "rede")}
          recurso="curso"
          arte={<IlustracaoServico tipo="curso" tamanho={34} />}
          titulo="Curso e Rede"
          texto={dados.curso_novas ? `${dados.curso_novas} ${dados.curso_novas === 1 ? "inscrição nova" : "inscrições novas"}` : "Turmas, inscrições e certificadas"}
          extra={dados.curso_novas > 0 && <i className="atalho-curso-n">{dados.curso_novas}</i>}
          aoTravado={setTravado}
        />

        <Link href="/admin/servicos" className="atalho-curso vidro">
          <span className="atalho-curso-arte" aria-hidden="true"><IlustracaoServico tipo="brilho" tamanho={32} /></span>
          <span className="atalho-curso-texto">
            <strong>Serviços e valores</strong>
            <small>Editar preços, ocultar e criar serviços</small>
          </span>
        </Link>

        <nav className="segmento" aria-label="Seções">
          {[
            ["agenda", "Agenda", 0],
            ["sinais", "Sinais", vis.sinais.length],
            ["clientes", "Clientes", dados.confirmacoes?.length || 0],
            ["manut", "Manutenção", vis.vencendo],
          ].map(([k, t, n]) => (
            <button key={k} type="button" aria-pressed={aba === k} onClick={() => { setAba(k); setAberto(null); }}>
              {t}
              {n > 0 && <i>{n}</i>}
            </button>
          ))}
        </nav>

        {aba === "agenda" && (
          <section className="adm-secao">
            {vis.dias.length === 0 && <p className="bloco-vazio">Nenhum horário marcado daqui pra frente.</p>}
            {vis.dias.map(([dia, itens]) => (
              <div key={dia} className="ag-dia">
                <h2 className="ag-dia-titulo"><span>{rotuloDia(dia)}</span><small>{itens.length}</small></h2>
                <ul className="ag-lista vidro">
                  {itens.map((a) => (
                    <Item key={a.codigo} a={a} aberto={aberto === a.codigo} alternar={() => alternar(a.codigo)} mudar={mudar} ocupado={ocupado} origem={origem} />
                  ))}
                </ul>
              </div>
            ))}
            {vis.passados.length > 0 && (
              <button type="button" className="botao-linha" onClick={() => setAnteriores((v) => !v)}>
                {anteriores ? "Esconder anteriores" : "Ver horários anteriores"}
              </button>
            )}
            {anteriores &&
              vis.passados.map(([dia, itens]) => (
                <div key={dia} className="ag-dia ag-dia-passado">
                  <h2 className="ag-dia-titulo"><span>{rotuloDia(dia)}</span><small>{itens.length}</small></h2>
                  <ul className="ag-lista vidro">
                    {itens.map((a) => (
                      <Item key={a.codigo} a={a} aberto={aberto === a.codigo} alternar={() => alternar(a.codigo)} mudar={mudar} ocupado={ocupado} origem={origem} />
                    ))}
                  </ul>
                </div>
              ))}
          </section>
        )}

        {aba === "sinais" && (
          <section className="adm-secao">
            {vis.sinais.length === 0 ? (
              <p className="bloco-vazio">Nenhum sinal pendente. Tudo confirmado.</p>
            ) : (
              <ul className="sinais">
                {vis.sinais.map((a) => (
                  <li key={a.codigo} className={`sinal vidro ${aberto === a.codigo ? "sinal-foco" : ""}`} data-chave={a.codigo}>
                    <div className="sinal-topo">
                      <IlustracaoServico tipo={ICONE[a.servico] || "fibra"} tamanho={40} />
                      <span>
                        <strong>{a.cliente_nome}</strong>
                        <small>{a.servico_nome}</small>
                      </span>
                      <span className="sinal-valor">{real(a.sinal)}</span>
                    </div>
                    <p className="sinal-quando">{dataLonga(a.inicio)} · {hora(a.inicio)} às {hora(a.fim)}</p>
                    {a.pix_informado_em && <p className="sinal-informado">A cliente avisou que enviou o Pix. Confira no banco e confirme.</p>}
                    <div className="sinal-acoes">
                      <button type="button" className="botao-ouro" disabled={ocupado} onClick={() => mudar(a.codigo, "confirmado")}>
                        <IconeCheck stroke="currentColor" width="20" height="20" /> Sinal recebido
                      </button>
                      {a.demo ? (
                        <p className="ag-links-off">Exemplo: WhatsApp desligado</p>
                      ) : (
                        <a className="botao-linha" href={whats(a.cliente_celular, msgSinal(a, origem))} target="_blank" rel="noopener">
                          <IconeConversa width="20" height="20" /> Cobrar pelo WhatsApp
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {aba === "clientes" && (
          <section className="adm-secao">
            {dados.confirmacoes?.length > 0 && (
              <div className="conf-bloco">
                <h2 className="ag-dia-titulo"><span>Aguardando confirmação</span><small>{dados.confirmacoes.length}</small></h2>
                <ul className="conf-lista">
                  {dados.confirmacoes.map((c) => <ConfirmacaoConta key={c.celular} c={c} decidir={decidirConta} />)}
                </ul>
              </div>
            )}
            <button type="button" className="botao-linha nova-cliente" onClick={() => setFichaCliente({})}>
              <IconeMais width="20" height="20" /> Nova cliente
            </button>
            <label className="busca">
              <IconeBusca width="20" height="20" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou celular" aria-label="Buscar cliente" />
            </label>
            <div className="ordenar" role="group" aria-label="Ordenar clientes">
              {Object.entries(ORDENS).map(([k, t]) => (
                <button key={k} type="button" aria-pressed={ordem === k} onClick={() => setOrdem(k)}>{t}</button>
              ))}
            </div>
            {!busca && vis.clientes.length > 0 && (
              <p className="cl-resumo">
                {vis.clientes.length} clientes · {vis.clientes.filter((c) => c.nivel === "ouro").length} Ouro ·{" "}
                {vis.clientes.filter((c) => c.nivel === "prata").length} Prata
              </p>
            )}
            {vis.clientes.length === 0 ? (
              <p className="bloco-vazio">{busca ? "Nenhuma cliente encontrada." : "As clientes aparecem aqui depois do primeiro agendamento."}</p>
            ) : (
              <ul className="cl-lista">
                {vis.clientes.map((c) => (
                  <Cliente
                    key={c.celular}
                    c={c}
                    aberto={aberto === c.celular}
                    alternar={() => alternar(c.celular)}
                    liberar={liberar}
                    gerarAcesso={gerarAcesso}
                    editar={(x) => setFichaCliente(x)}
                    agendarPara={(x) => setNovo({ nome: x.nome, celular: x.celular })}
                    origem={origem}
                  />
                ))}
              </ul>
            )}
          </section>
        )}

        {aba === "manut" && (
          <section className="adm-secao">
            {vis.manut.length === 0 ? (
              <p className="bloco-vazio">Quando você concluir um atendimento de fibra, a próxima manutenção aparece aqui.</p>
            ) : (
              <ul className="mt-lista">
                {vis.manut.map((c) => {
                  const m = c.manutencao;
                  const p = Math.max(0, Math.min(1, (m.ciclo_dias - m.dias_restantes) / m.ciclo_dias));
                  const estado = m.dias_restantes < 0 ? "atrasada" : m.dias_restantes <= 5 ? "quase" : "ok";
                  return (
                    <li key={c.celular} className={`mt-item vidro mt-${estado} ${aberto === c.celular ? "mt-foco" : ""}`} data-chave={c.celular}>
                      <div className="mt-topo">
                        <span>
                          <strong>{c.nome}{c.demo && <em className="selo-exemplo">exemplo</em>}</strong>
                          <small>Até {dataDia(m.proxima)}</small>
                        </span>
                        <span className="mt-dias">
                          {m.dias_restantes < 0 ? `+${-m.dias_restantes}` : m.dias_restantes}
                          <small>{m.dias_restantes < 0 ? "atrasada" : Math.abs(m.dias_restantes) === 1 ? "dia" : "dias"}</small>
                        </span>
                      </div>
                      <span className="mt-barra" aria-hidden="true"><span style={{ width: `${p * 100}%` }} /></span>
                      {c.proximo ? (
                        <p className="mt-agendada">Já agendada para {curta(c.proximo)} às {hora(c.proximo)}</p>
                      ) : (
                        <div className="mt-acoes">
                          {c.demo ? (
                            <span className="acao acao-off">Lembrar (exemplo)</span>
                          ) : (
                            <a className="acao acao-forte" href={whats(c.celular, msgManutencao(salao, c, origem))} target="_blank" rel="noopener">
                              <IconeConversa stroke="currentColor" width="18" height="18" /> Lembrar
                            </a>
                          )}
                          <button type="button" className="acao" onClick={() => setNovo({ nome: c.nome, celular: c.celular, servico: "manutencao" })}>
                            Agendar
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

      </main>

      <MenuApp quem={{ tipo: "admin" }} aoNovoHorario={() => setNovo({})} />

      {novo && (
        <NovoHorario
          token={sessao.token}
          inicial={novo}
          clientes={dados.clientes}
          aoFechar={() => setNovo(null)}
          aoSalvar={() => carregar(sessao.token)}
        />
      )}

      {fichaCliente && (
        <FolhaCliente
          token={sessao.token}
          inicial={fichaCliente}
          aoFechar={() => setFichaCliente(null)}
          aoSalvo={() => carregar(sessao.token)}
          aoAgendar={(c) => { setFichaCliente(null); setNovo(c); }}
        />
      )}

      {verAlertas && (
        <FolhaAlertas
          lista={alertas.lista}
          token={sessao.token}
          push={temRecurso(salao, "push")}
          aoTravado={(r) => { setVerAlertas(false); setTravado(r); }}
          aoFechar={() => setVerAlertas(false)}
          aoIr={irPara}
        />
      )}
      {travado && <FolhaPlano recurso={travado} aoFechar={() => setTravado(null)} />}
      {resumoDia.aberto && !verAlertas && temRecurso(salao, "resumo") && (
        <ModalResumo lista={alertas.lista} nome={primeiroNome(eu.nome)} aoFechar={resumoDia.fechar} aoVerTudo={abrirAlertas} />
      )}

      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  );
}
