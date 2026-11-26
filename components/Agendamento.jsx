"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { rpc } from "../lib/supabase";
import { useSalao } from "./Empresa";
import { aContato, AContato, linkWhats, iniciais } from "../lib/empresa";
import {
  real, mascaraCelular, celularFormatado, hojeISO, somaDias, diaSemana, instante,
  hora, dataLonga,
} from "../lib/formato";
import { blocosEquipe, ocupadosDaEquipe, primeiroNome } from "../lib/agenda";
import { lerSessao, salvarSessao, limparSessao } from "../lib/sessao";
import CampoSenha from "./CampoSenha";
import { IlustracaoServico, IconeSeta, IconeVoltar, IconeRelogio, IconeCadeado } from "./Icones";

const ICONE = { aplicacao: "fibra", manutencao: "manutencao" };
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const JANELA_DIAS = 60;

export function mensagemRecibo(salao, a, origem) {
  const restante = Number(a.valor) - Number(a.sinal);
  return [
    `Olá, ${salao.contato}! Acabei de agendar pelo app da ${salao.nome}.`,
    "",
    `*Recibo de agendamento ${a.codigo}*`,
    `Cliente: ${a.cliente_nome}`,
    a.cliente_celular ? `Celular: ${celularFormatado(a.cliente_celular)}` : null,
    `Serviço: ${a.servico_nome}`,
    `Data: ${dataLonga(a.inicio)}`,
    `Horário: ${hora(a.inicio)} às ${hora(a.fim)}`,
    `Valor do serviço: ${real(a.valor)}`,
    `Sinal (${Math.round((Number(a.sinal) / Number(a.valor)) * 100)}%) pago via Pix: ${real(a.sinal)}`,
    `Restante no dia: ${real(restante)}`,
    "",
    "Segue o comprovante do Pix para confirmar meu horário.",
    `Recibo em PDF: ${origem}/recibo/${a.codigo}/pdf`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function guardarCodigo(codigo) {
  try {
    const lista = JSON.parse(localStorage.getItem("rica:agendamentos") || "[]");
    if (!lista.includes(codigo)) lista.unshift(codigo);
    localStorage.setItem("rica:agendamentos", JSON.stringify(lista.slice(0, 10)));
  } catch {}
}

export default function Agendamento() {
  const salao = useSalao();
  const router = useRouter();
  const params = useSearchParams();

  const [servicos, setServicos] = useState(null);
  const [erroServicos, setErroServicos] = useState("");
  const [servico, setServico] = useState(null);
  const [etapa, setEtapa] = useState("servico");

  const hoje = useMemo(() => hojeISO(), []);
  const [mesBase, setMesBase] = useState(() => hojeISO().slice(0, 7));
  const [ocupados, setOcupados] = useState([]);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [dia, setDia] = useState(null);
  const [inicio, setInicio] = useState(null);
  const [equipe, setEquipe] = useState([]);
  const [prof, setProf] = useState(null); // null = qualquer uma

  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [senha, setSenha] = useState("");
  const [sessao, setSessao] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [meus, setMeus] = useState([]);

  // serviços com preço vindo do servidor
  useEffect(() => {
    // ícones vêm do catálogo (o mesmo que a dona edita em Serviços e valores)
    Promise.all([rpc("servicos_agendaveis"), rpc("servicos_catalogo").catch(() => [])])
      .then(([base, catalogo]) => {
        const icones = Object.fromEntries((catalogo || []).map((c) => [c.codigo, c.icone]));
        const lista = base.map((x) => ({ ...x, icone: x.icone || icones[x.codigo] }));
        setServicos(lista);
        const pedido = lista.find((s) => s.codigo === params.get("servico"));
        if (pedido) {
          setServico(pedido);
          setEtapa("data");
        }
      })
      .catch((e) => setErroServicos(e.message));
    setSessao(lerSessao("cliente"));
    try {
      setMeus(JSON.parse(localStorage.getItem("rica:agendamentos") || "[]"));
      const salvo = JSON.parse(localStorage.getItem("rica:cliente") || "null");
      if (salvo) {
        setNome(salvo.nome || "");
        setCelular(salvo.celular ? mascaraCelular(salvo.celular) : "");
      }
    } catch {}
  }, [params]);

  // horários ocupados do mês visível
  useEffect(() => {
    if (etapa !== "data") return;
    const de = `${mesBase}-01`;
    const ate = somaDias(`${mesBase}-01`, 41);
    setCarregandoAgenda(true);
    ocupadosDaEquipe(rpc, de, ate)
      .then(setOcupados)
      .catch(() => setOcupados([]))
      .finally(() => setCarregandoAgenda(false));
  }, [mesBase, etapa]);

  // quem faz o serviço escolhido
  useEffect(() => {
    if (!servico) return;
    let vivo = true;
    rpc("equipe_publica", { p_servico: servico.codigo })
      .then((l) => {
        if (!vivo) return;
        const lista = Array.isArray(l) ? l : [];
        setEquipe(lista);
        setProf((p) => (lista.some((x) => x.id === p) ? p : null));
      })
      .catch(() => vivo && setEquipe([]));
    return () => {
      vivo = false;
    };
  }, [servico]);

  const ids = prof ? [prof] : equipe.map((x) => x.id);
  const escolhida = equipe.find((x) => x.id === prof);

  const limite = somaDias(hoje, JANELA_DIAS);

  function vagasDoDia(iso) {
    if (!servico || iso < hoje || iso > limite) return [];
    return blocosEquipe(salao, iso, servico.duracao_min, ocupados, ids, 60);
  }

  // grade do mês
  const [ano, mes] = mesBase.split("-").map(Number);
  const primeiro = `${mesBase}-01`;
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const vazios = diaSemana(primeiro);
  const podeVoltar = mesBase > hoje.slice(0, 7);
  const podeAvancar = `${mesBase}-31` < limite;
  const trocarMes = (n) => {
    const d = new Date(Date.UTC(ano, mes - 1 + n, 1));
    setMesBase(d.toISOString().slice(0, 7));
    setDia(null);
    setInicio(null);
  };

  const vagas = dia ? vagasDoDia(dia) : [];
  const digitos = celular.replace(/\D/g, "");
  const valido = sessao?.token ? true : nome.trim().length >= 2 && digitos.length >= 10 && senha.length >= 6;

  function trocarConta() {
    limparSessao("cliente");
    setSessao(null);
    setSenha("");
  }

  async function reservar() {
    setEnviando(true);
    setErro("");
    try {
      const logada = Boolean(sessao?.token);
      const r = await rpc(equipe.length ? "agendar_com" : "agendar", {
        p_servico: servico.codigo,
        p_inicio: new Date(inicio).toISOString(),
        p_nome: logada ? sessao.nome : nome.trim(),
        p_celular: logada ? sessao.celular : digitos,
        p_senha: logada ? null : senha,
        p_token: sessao?.token || null,
        ...(equipe.length ? { p_profissional: prof } : {}),
      });
      if (!r.ok) {
        if (logada) {
          // a sessão venceu: pede os dados de novo
          setNome(sessao.nome || "");
          setCelular(mascaraCelular(sessao.celular || ""));
          trocarConta();
          setErro("Sua sessão expirou. Confirme sua senha para reservar.");
        } else {
          setErro(r.erro);
        }
        setEnviando(false);
        return;
      }
      if (r.token) salvarSessao("cliente", { token: r.token, nome: r.nome, celular: digitos });
      const a = r.agendamento;
      guardarCodigo(a.codigo);
      router.push(`/recibo/${a.codigo}?novo=1`);
    } catch (e) {
      setErro(e.message);
      if (/reservado/i.test(e.message)) {
        setInicio(null);
        setEtapa("data");
        ocupadosDaEquipe(rpc, `${mesBase}-01`, somaDias(`${mesBase}-01`, 41))
          .then(setOcupados)
          .catch(() => {});
      }
      setEnviando(false);
    }
  }

  const passo = { servico: 1, data: 2, dados: 3 }[etapa];
  const voltar = () => {
    setErro("");
    if (etapa === "dados") setEtapa("data");
    else if (etapa === "data") setEtapa("servico");
    else router.push("/visitante");
  };

  return (
    <div className="app app-agendar">
      <header className="barra-topo">
        <button type="button" className="barra-voltar" aria-label="Voltar" onClick={voltar}>
          <IconeVoltar />
        </button>
        <span className="barra-marca">Agendar</span>
        <span className="barra-direita passo-contador">{passo} de 3</span>
      </header>
      <div className="progresso" aria-hidden="true">
        <span style={{ width: `${(passo / 3) * 100}%` }} />
      </div>

      <main className="tela">
        {etapa === "servico" && (
          <section className="etapa entra">
            <h1 className="etapa-titulo">Qual serviço você quer agendar?</h1>
            <p className="tela-sub">Sinal de 30% via Pix para reservar o horário. O restante você paga no dia.</p>
            {erroServicos && <p className="erro">{erroServicos}</p>}
            {!servicos && !erroServicos && <div className="carregando">Carregando serviços…</div>}
            <div className="escolhas">
              {servicos?.map((s) => (
                <button
                  key={s.codigo}
                  type="button"
                  className="escolha vidro"
                  onClick={() => {
                    setServico(s);
                    setDia(null);
                    setInicio(null);
                    setEtapa("data");
                  }}
                >
                  <span className="escolha-arte" aria-hidden="true">
                    <IlustracaoServico tipo={s.icone || ICONE[s.codigo] || "brilho"} tamanho={54} />
                  </span>
                  <span className="escolha-texto">
                    <span className="escolha-nome">{s.nome}</span>
                    <span className="escolha-linha">
                      <span className="escolha-info">
                        <IconeRelogio width="15" height="15" /> {Math.round(s.duracao_min / 60)} horas
                      </span>
                      <span className="escolha-preco">
                        {s.valor_cheio && <s className="preco-cheio">{real(s.valor_cheio)}</s>}
                        {real(s.valor)}
                      </span>
                    </span>
                    {s.promocao && <span className="chip chip-promo escolha-promo">{s.promocao}</span>}
                    <span className="escolha-sinal">Sinal de {real(s.sinal)} para reservar</span>
                  </span>
                  <IconeSeta />
                </button>
              ))}
            </div>
            <p className="nota-outros">
              Outros serviços?{" "}
              <a href={linkWhats(salao) || `https://instagram.com/${salao.instagram}`} target="_blank" rel="noopener">
                Fale com {aContato(salao)}
              </a>
            </p>
            {sessao?.token ? (
              <Link href="/cliente" className="meus-atalho">
                Ver meus horários e recibos <IconeSeta />
              </Link>
            ) : meus.length > 0 && (
              <div className="meus">
                <h2>Seus agendamentos neste celular</h2>
                {meus.map((c) => (
                  <Link key={c} href={`/recibo/${c}`} className="meus-item">
                    Recibo {c} <IconeSeta />
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {etapa === "data" && servico && (
          <section className="etapa entra">
            <div className="resumo-mini">
              <IlustracaoServico tipo={servico.icone || ICONE[servico.codigo] || "brilho"} tamanho={34} />
              <span>
                <strong>{servico.nome}</strong>
                <small>{Math.round(servico.duracao_min / 60)} horas · {real(servico.valor)}</small>
              </span>
            </div>

            {equipe.length > 1 && (
              <div className="com-quem">
                <h2 className="etapa-titulo">Com quem?</h2>
                <div className="com-quem-lista" role="radiogroup" aria-label="Profissional">
                  {[{ id: null, nome: "Qualquer uma" }, ...equipe].map((p) => (
                    <button
                      key={p.id || "qualquer"}
                      type="button"
                      role="radio"
                      aria-checked={prof === p.id}
                      className={`com-quem-item ${prof === p.id ? "ativo" : ""}`}
                      onClick={() => {
                        setProf(p.id);
                        setInicio(null);
                      }}
                    >
                      <span className="com-quem-avatar" aria-hidden="true">
                        {p.id ? iniciais(p.nome) : "✦"}
                      </span>
                      <span className="com-quem-nome">{p.id ? primeiroNome(p.nome) : p.nome}</span>
                    </button>
                  ))}
                </div>
                <p className="com-quem-nota">
                  {escolhida
                    ? `Mostrando só os horários de ${primeiroNome(escolhida.nome)}.`
                    : "Mostramos todos os horários livres. O salão escolhe quem estiver disponível."}
                </p>
              </div>
            )}

            <h1 className="etapa-titulo">Escolha o dia</h1>
            <div className="calendario vidro">
              <div className="cal-topo">
                <button type="button" onClick={() => trocarMes(-1)} disabled={!podeVoltar} aria-label="Mês anterior">
                  <IconeVoltar />
                </button>
                <span>
                  {MESES[mes - 1]} {ano}
                </span>
                <button type="button" onClick={() => trocarMes(1)} disabled={!podeAvancar} aria-label="Próximo mês">
                  <IconeSeta />
                </button>
              </div>
              <div className="cal-grade" role="grid">
                {SEMANA.map((s, i) => (
                  <span key={i} className="cal-sem">{s}</span>
                ))}
                {Array.from({ length: vazios }, (_, i) => (
                  <span key={`v${i}`} />
                ))}
                {Array.from({ length: diasNoMes }, (_, i) => {
                  const iso = `${mesBase}-${String(i + 1).padStart(2, "0")}`;
                  const v = vagasDoDia(iso);
                  const livres = v.filter((x) => x.livre).length;
                  const aberto = v.length > 0;
                  const estado = !aberto ? "fechado" : livres === 0 ? "lotado" : "livre";
                  return (
                    <button
                      key={iso}
                      type="button"
                      className={`cal-dia ${estado} ${dia === iso ? "ativo" : ""} ${iso === hoje ? "hoje" : ""}`}
                      disabled={estado !== "livre"}
                      onClick={() => {
                        setDia(iso);
                        setInicio(null);
                      }}
                      aria-label={`${i + 1}${estado === "lotado" ? ", lotado" : ""}`}
                    >
                      {i + 1}
                      {estado === "livre" && <i aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              {carregandoAgenda && <p className="cal-carregando">Atualizando horários…</p>}
            </div>

            {dia && (
              <div className="horarios-dia entra">
                <h2 className="etapa-sub">{dataLonga(instante(dia, 12))}</h2>
                <div className="vagas">
                  {vagas.map((v) => (
                    <button
                      key={v.ini}
                      type="button"
                      className={`vaga ${inicio === v.ini ? "ativa" : ""}`}
                      disabled={!v.livre}
                      onClick={() => setInicio(v.ini)}
                    >
                      <strong>{hora(v.ini)}</strong>
                      <small>{v.livre ? `até ${hora(v.fim)}` : "ocupado"}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {erro && <p className="erro">{erro}</p>}
          </section>
        )}

        {etapa === "dados" && servico && inicio && (
          <section className="etapa entra">
            {sessao?.token ? (
              <>
                <h1 className="etapa-titulo">Confirme a reserva</h1>
                <div className="logada vidro">
                  <span className="avatar avatar-p" aria-hidden="true">
                    <span>{(sessao.nome || "?")[0]}</span>
                  </span>
                  <span className="logada-texto">
                    <strong>{primeiroNome(sessao.nome)}</strong>
                    <small>{celularFormatado(sessao.celular)}</small>
                  </span>
                  <button type="button" className="logada-trocar" onClick={trocarConta}>
                    Não é você?
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="etapa-titulo">Seus dados</h1>
                <p className="tela-sub">{AContato(salao)} usa esses dados para confirmar o seu horário.</p>
                <div className="form">
                  <label htmlFor="nome">Nome</label>
                  <input id="nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
                  <label htmlFor="cel">Celular com WhatsApp</label>
                  <input
                    id="cel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={celular}
                    onChange={(e) => setCelular(mascaraCelular(e.target.value))}
                    placeholder="(85) 99793-5916"
                  />
                  <label htmlFor="senha">Senha da sua conta</label>
                  <CampoSenha id="senha" valor={senha} aoMudar={setSenha} nova placeholder="Pelo menos 6 caracteres" />
                  <p className="dica-senha">
                    <IconeCadeado width="16" height="16" />
                    <span>
                      Primeira vez? Crie uma senha agora. Já tem conta? Use a sua. Com ela você acompanha
                      horários, recibos e manutenções.
                    </span>
                  </p>
                </div>
              </>
            )}

            <div className="resumo vidro">
              <div className="resumo-linha">
                <span>Serviço</span>
                <strong>{servico.nome}</strong>
              </div>
              <div className="resumo-linha">
                <span>Data</span>
                <strong>{dataLonga(inicio)}</strong>
              </div>
              <div className="resumo-linha">
                <span>Horário</span>
                <strong>
                  {hora(inicio)} às {hora(inicio + servico.duracao_min * 60000)}
                </strong>
              </div>
              {equipe.length > 1 && (
                <div className="resumo-linha">
                  <span>Profissional</span>
                  <strong>{escolhida ? escolhida.nome : "Quem estiver livre"}</strong>
                </div>
              )}
              <div className="resumo-linha">
                <span>Valor do serviço{servico.valor_cheio ? " (promoção)" : ""}</span>
                <strong>
                  {servico.valor_cheio && <s className="preco-cheio">{real(servico.valor_cheio)}</s>}
                  {real(servico.valor)}
                </strong>
              </div>
              <div className="resumo-linha resumo-destaque">
                <span>Sinal agora ({Math.round(Number(servico.sinal_pct))}%)</span>
                <strong>{real(servico.sinal)}</strong>
              </div>
              <div className="resumo-linha">
                <span>Restante no dia</span>
                <strong>{real(servico.valor - servico.sinal)}</strong>
              </div>
            </div>
            {erro && <p className="erro">{erro}</p>}
          </section>
        )}
      </main>

      {etapa === "data" && (
        <div className="acao-rodape">
          <button type="button" className="botao-ouro" disabled={!inicio} onClick={() => setEtapa("dados")}>
            Continuar
          </button>
        </div>
      )}
      {etapa === "dados" && (
        <div className="acao-rodape">
          <button type="button" className="botao-ouro" disabled={!valido || enviando} onClick={reservar}>
            {enviando ? "Reservando…" : `Reservar e pagar sinal de ${real(servico.sinal)}`}
          </button>
        </div>
      )}
    </div>
  );
}
