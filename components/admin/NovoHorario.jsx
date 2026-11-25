"use client";

import { useEffect, useState } from "react";
import { rpc } from "../../lib/supabase";
import { real, hora, hojeISO, somaDias, mascaraCelular, dataLonga, instante } from "../../lib/formato";
import { blocosDoDia, horarioDoDia, paraIntervalos } from "../../lib/agenda";

export default function NovoHorario({ token, inicial, aoFechar, aoSalvar }) {
  const [servicos, setServicos] = useState([]);
  const [servico, setServico] = useState(null);
  const [dia, setDia] = useState(hojeISO());
  const [ocupados, setOcupados] = useState([]);
  const [inicio, setInicio] = useState(null);
  const [nome, setNome] = useState(inicial?.nome || "");
  const [celular, setCelular] = useState(inicial?.celular ? mascaraCelular(inicial.celular) : "");
  const [pago, setPago] = useState(true);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    rpc("servicos_agendaveis")
      .then((l) => {
        setServicos(l);
        setServico(l.find((s) => s.codigo === (inicial?.servico || "manutencao")) || l[0]);
      })
      .catch(() => setErro("Não foi possível carregar os serviços."));
  }, [inicial]);

  useEffect(() => {
    if (!dia) return;
    setInicio(null);
    rpc("horarios_ocupados", { p_de: dia, p_ate: somaDias(dia, 1) })
      .then((l) => setOcupados(paraIntervalos(l)))
      .catch(() => setOcupados([]));
  }, [dia]);

  const blocos = servico && dia ? blocosDoDia(dia, servico.duracao_min, ocupados, -180) : [];
  const fechado = dia && !horarioDoDia(dia);
  const valido = servico && inicio && nome.trim().length >= 2 && celular.replace(/\D/g, "").length >= 10;

  async function salvar() {
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("admin_agendar", {
        p_token: token,
        p_servico: servico.codigo,
        p_inicio: new Date(inicio).toISOString(),
        p_nome: nome.trim(),
        p_celular: celular.replace(/\D/g, ""),
        p_confirmado: pago,
      });
      if (!r.ok) throw new Error(r.erro);
      aoSalvar(r.agendamento);
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha folha-alta" role="dialog" aria-modal="true" aria-labelledby="novo-titulo" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        <h2 id="novo-titulo" className="folha-titulo">Novo horário</h2>

        <div className="pilulas" role="radiogroup" aria-label="Serviço">
          {servicos.map((s) => (
            <button
              key={s.codigo}
              type="button"
              role="radio"
              aria-checked={servico?.codigo === s.codigo}
              onClick={() => { setServico(s); setInicio(null); }}
            >
              {s.nome}
              <small>{real(s.valor)}</small>
            </button>
          ))}
        </div>

        <div className="form form-compacto">
          <label htmlFor="n-dia">Dia</label>
          <input id="n-dia" type="date" value={dia} min={somaDias(hojeISO(), -1)} onChange={(e) => setDia(e.target.value)} />
        </div>
        {dia && <p className="folha-dia">{dataLonga(instante(dia, 12))}</p>}
        {fechado ? (
          <p className="bloco-vazio">O salão não abre neste dia.</p>
        ) : blocos.length === 0 ? (
          <p className="bloco-vazio">Sem horários restantes neste dia.</p>
        ) : (
          <div className="vagas">
            {blocos.map((b) => (
              <button
                key={b.ini}
                type="button"
                className={`vaga ${inicio === b.ini ? "ativa" : ""}`}
                disabled={!b.livre}
                onClick={() => setInicio(b.ini)}
              >
                <strong>{hora(b.ini)}</strong>
                <small>{b.livre ? `até ${hora(b.fim)}` : "ocupado"}</small>
              </button>
            ))}
          </div>
        )}

        <div className="form form-compacto">
          <label htmlFor="n-nome">Nome da cliente</label>
          <input id="n-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" />
          <label htmlFor="n-cel">Celular</label>
          <input id="n-cel" inputMode="numeric" value={celular} onChange={(e) => setCelular(mascaraCelular(e.target.value))} placeholder="(85) 90000-0000" />
        </div>

        <label className="marcar">
          <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} />
          <span>
            Sinal já recebido
            <small>{pago ? "O horário entra confirmado." : "O horário fica aguardando o sinal."}</small>
          </span>
        </label>

        {erro && <p className="erro">{erro}</p>}
        <button type="button" className="botao-ouro" disabled={!valido || enviando} onClick={salvar}>
          {enviando ? "Salvando…" : "Salvar horário"}
        </button>
        <button type="button" className="folha-fechar" onClick={aoFechar}>
          Fechar
        </button>
      </div>
    </div>
  );
}
