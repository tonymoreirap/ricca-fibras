"use client";

import { useEffect, useMemo, useState } from "react";
import { rpc } from "../../lib/supabase";
import { real, hora, hojeISO, somaDias, mascaraCelular, celularFormatado, dataLonga, instante, FUSO } from "../../lib/formato";
import { blocosDoDia, horarioDoDia, paraIntervalos, primeiroNome } from "../../lib/agenda";
import { whatsCliente, msgConfirmacao } from "../../lib/mensagens";
import { IconeBusca, IconeConversa } from "../Icones";

const DIAS = 21;
const rotuloVaga = (ms) =>
  new Date(ms).toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "");

// Agendar em poucos toques: cliente → (serviço sugerido) → próximo horário livre → salvar → avisar no WhatsApp
export default function NovoHorario({ token, inicial, clientes = [], aoFechar, aoSalvar }) {
  const [servicos, setServicos] = useState([]);
  const [servico, setServico] = useState(null);
  const [ocupados, setOcupados] = useState(null);
  const [inicio, setInicio] = useState(null);
  const [outroDia, setOutroDia] = useState(false);
  const [dia, setDia] = useState(hojeISO());
  const [cliente, setCliente] = useState(inicial?.celular ? { nome: inicial.nome, celular: inicial.celular } : null);
  const [busca, setBusca] = useState("");
  const [nova, setNova] = useState(false);
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [pago, setPago] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(null);

  const ficha = useMemo(() => (cliente ? clientes.find((c) => c.celular === cliente.celular) : null), [cliente, clientes]);

  useEffect(() => {
    rpc("servicos_agendaveis").then(setServicos).catch(() => setErro("Não foi possível carregar os serviços."));
    const hoje = hojeISO();
    rpc("horarios_ocupados", { p_de: hoje, p_ate: somaDias(hoje, DIAS) })
      .then((l) => setOcupados(paraIntervalos(l)))
      .catch(() => setOcupados([]));
  }, []);

  // serviço sugerido: quem já fez fibra vai para manutenção
  useEffect(() => {
    if (!servicos.length) return;
    const quer = inicial?.servico || (ficha?.ultimo_servico || ficha?.atendimentos ? "manutencao" : cliente ? "aplicacao" : "manutencao");
    setServico(servicos.find((s) => s.codigo === quer) || servicos[0]);
    setInicio(null);
  }, [servicos, ficha, cliente, inicial]);

  const proximas = useMemo(() => {
    if (!servico || !ocupados) return [];
    const lista = [];
    for (let i = 0; i <= DIAS && lista.length < 8; i++) {
      const iso = somaDias(hojeISO(), i);
      for (const b of blocosDoDia(iso, servico.duracao_min, ocupados, 0)) if (b.livre && lista.length < 8) lista.push(b);
    }
    return lista;
  }, [servico, ocupados]);

  const [ocupadosDia, setOcupadosDia] = useState([]);
  useEffect(() => {
    if (!outroDia || !dia) return;
    rpc("horarios_ocupados", { p_de: dia, p_ate: somaDias(dia, 1) }).then((l) => setOcupadosDia(paraIntervalos(l))).catch(() => setOcupadosDia([]));
  }, [outroDia, dia]);
  const blocosDia = servico && outroDia ? blocosDoDia(dia, servico.duracao_min, ocupadosDia, -180) : [];

  const sugestoes = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return [];
    const dig = t.replace(/\D/g, "");
    return clientes.filter((c) => c.nome.toLowerCase().includes(t) || (dig.length >= 3 && c.celular.includes(dig))).slice(0, 5);
  }, [busca, clientes]);

  const quem = cliente || (nova && nome.trim().length >= 2 && celular.replace(/\D/g, "").length >= 10 ? { nome: nome.trim(), celular: celular.replace(/\D/g, "") } : null);
  const valido = servico && inicio && quem;

  async function salvar() {
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("admin_agendar", {
        p_token: token,
        p_servico: servico.codigo,
        p_inicio: new Date(inicio).toISOString(),
        p_nome: quem.nome,
        p_celular: quem.celular,
        p_confirmado: pago,
      });
      if (!r.ok) throw new Error(r.erro);
      setFeito({ ...r.agendamento, convite: r.convite, demo: ficha?.demo });
      aoSalvar(r.agendamento);
    } catch (e) {
      setErro(e.message);
    }
    setEnviando(false);
  }

  if (feito) {
    return (
      <div className="folha-fundo" onClick={aoFechar}>
        <div className="folha folha-alta" role="dialog" aria-modal="true" aria-labelledby="nh-ok" onClick={(e) => e.stopPropagation()}>
          <span className="folha-alca" aria-hidden="true" />
          <div className="pronto entra">
            <span className="reservado-icone" aria-hidden="true">✓</span>
            <h2 id="nh-ok" className="folha-titulo">Horário marcado</h2>
            <p className="pronto-sub">{feito.cliente_nome}</p>
            <p className="pronto-quando">{dataLonga(feito.inicio)} · {hora(feito.inicio)} às {hora(feito.fim)}</p>
            <p className="pronto-nota">{feito.servico_nome} · {feito.status === "confirmado" ? "sinal recebido" : `sinal de ${real(feito.sinal)} pendente`}</p>
            {feito.demo ? (
              <p className="ag-links-off">Cliente de exemplo: WhatsApp desligado.</p>
            ) : (
              <a className="botao-ouro" href={whatsCliente(feito.cliente_celular, msgConfirmacao(feito, feito.convite, window.location.origin))} target="_blank" rel="noopener">
                <IconeConversa stroke="currentColor" /> Enviar confirmação para {primeiroNome(feito.cliente_nome)}
              </a>
            )}
            <p className="pronto-nota">
              A mensagem leva data, hora, valor{feito.status === "confirmado" ? "" : ", a chave Pix do sinal"} e o recibo{feito.convite ? ", e o link para ela criar a senha no app" : ""}.
            </p>
            <button type="button" className="folha-fechar" onClick={aoFechar}>Fechar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha folha-alta" role="dialog" aria-modal="true" aria-labelledby="novo-titulo" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        <h2 id="novo-titulo" className="folha-titulo">Novo horário</h2>

        <p className="nh-rotulo">Cliente</p>
        {cliente ? (
          <div className="nh-cliente">
            <span className="avatar avatar-p" aria-hidden="true"><span>{cliente.nome[0]}</span></span>
            <span className="nh-cliente-texto">
              <strong>{cliente.nome}</strong>
              <small>{celularFormatado(cliente.celular)}{ficha?.observacoes ? ` · ${ficha.observacoes}` : ""}</small>
            </span>
            <button type="button" className="logada-trocar" onClick={() => { setCliente(null); setBusca(""); }}>Trocar</button>
          </div>
        ) : nova ? (
          <div className="form form-compacto nh-nova">
            <input aria-label="Nome da cliente" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da cliente" />
            <input aria-label="Celular" inputMode="numeric" value={celular} onChange={(e) => setCelular(mascaraCelular(e.target.value))} placeholder="(85) 90000-0000" />
            <button type="button" className="link-botao" onClick={() => setNova(false)}>Buscar na lista</button>
          </div>
        ) : (
          <div className="nh-busca">
            <label className="busca">
              <IconeBusca width="20" height="20" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou celular" aria-label="Buscar cliente" autoFocus />
            </label>
            {sugestoes.length > 0 && (
              <ul className="nh-sugestoes">
                {sugestoes.map((c) => (
                  <li key={c.celular}>
                    <button type="button" onClick={() => setCliente({ nome: c.nome, celular: c.celular })}>
                      <strong>{c.nome}</strong>
                      <small>{celularFormatado(c.celular)} · {c.atendimentos} {c.atendimentos === 1 ? "atendimento" : "atendimentos"}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="link-botao nh-nova-btn" onClick={() => { setNova(true); setNome(busca.replace(/\d/g, "").trim()); }}>
              + Cliente que não está na lista
            </button>
          </div>
        )}

        <div className="pilulas pilulas-lado" role="radiogroup" aria-label="Serviço">
          {servicos.map((s) => (
            <button key={s.codigo} type="button" role="radio" aria-checked={servico?.codigo === s.codigo} onClick={() => { setServico(s); setInicio(null); }}>
              {s.codigo === "aplicacao" ? "Aplicação" : s.codigo === "manutencao" ? "Manutenção" : s.nome}
              <small>{real(s.valor)}</small>
            </button>
          ))}
        </div>

        <p className="nh-rotulo">{outroDia ? "Escolha o dia e o horário" : "Próximos horários livres"}</p>
        {!outroDia ? (
          ocupados === null ? (
            <p className="bloco-vazio">Procurando horários…</p>
          ) : proximas.length === 0 ? (
            <p className="bloco-vazio">Nenhum horário livre nos próximos {DIAS} dias.</p>
          ) : (
            <div className="nh-vagas">
              {proximas.map((b) => (
                <button key={b.ini} type="button" className={`vaga ${inicio === b.ini ? "ativa" : ""}`} onClick={() => setInicio(b.ini)}>
                  <small>{rotuloVaga(b.ini)}</small>
                  <strong>{hora(b.ini)}</strong>
                </button>
              ))}
            </div>
          )
        ) : (
          <>
            <div className="form form-compacto">
              <input type="date" aria-label="Dia" value={dia} min={somaDias(hojeISO(), -1)} onChange={(e) => { setDia(e.target.value); setInicio(null); }} />
            </div>
            {dia && <p className="folha-dia">{dataLonga(instante(dia, 12))}</p>}
            {!horarioDoDia(dia) ? (
              <p className="bloco-vazio">O salão não abre neste dia.</p>
            ) : blocosDia.length === 0 ? (
              <p className="bloco-vazio">Sem horários restantes neste dia.</p>
            ) : (
              <div className="vagas">
                {blocosDia.map((b) => (
                  <button key={b.ini} type="button" className={`vaga ${inicio === b.ini ? "ativa" : ""}`} disabled={!b.livre} onClick={() => setInicio(b.ini)}>
                    <strong>{hora(b.ini)}</strong>
                    <small>{b.livre ? `até ${hora(b.fim)}` : "ocupado"}</small>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <button type="button" className="link-botao nh-outro" onClick={() => { setOutroDia(!outroDia); setInicio(null); }}>
          {outroDia ? "Ver os próximos horários livres" : "Escolher outro dia"}
        </button>

        <label className="marcar">
          <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} />
          <span>
            Sinal já recebido
            <small>{pago ? "O horário entra confirmado." : "O horário fica aguardando o sinal."}</small>
          </span>
        </label>

        {erro && <p className="erro">{erro}</p>}
        <button type="button" className="botao-ouro" disabled={!valido || enviando} onClick={salvar}>
          {enviando ? "Salvando…" : inicio && quem ? `Marcar ${primeiroNome(quem.nome)} · ${rotuloVaga(inicio)} ${hora(inicio)}` : "Marcar horário"}
        </button>
        <button type="button" className="folha-fechar" onClick={aoFechar}>Fechar</button>
      </div>
    </div>
  );
}
