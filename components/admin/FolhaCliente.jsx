"use client";

import { useState } from "react";
import { rpc } from "../../lib/supabase";
import { mascaraCelular, celularFormatado } from "../../lib/formato";
import { primeiroNome } from "../../lib/agenda";
import { whatsCliente, msgBoasVindas } from "../../lib/mensagens";
import { IconeConversa, IconeCalendario } from "../Icones";

// Cadastrar ou editar cliente. Ao salvar, oferece enviar as boas-vindas e agendar.
export default function FolhaCliente({ token, inicial, aoFechar, aoSalvo, aoAgendar }) {
  const editando = Boolean(inicial?.celular);
  const [c, setC] = useState({
    nome: inicial?.nome || "",
    celular: inicial?.celular ? mascaraCelular(inicial.celular) : "",
    aniversario: inicial?.aniversario || "",
    observacoes: inicial?.observacoes || "",
  });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(null);
  const muda = (k) => (e) => setC({ ...c, [k]: k === "celular" ? mascaraCelular(e.target.value) : e.target.value });
  const valido = c.nome.trim().length >= 2 && c.celular.replace(/\D/g, "").length >= 10;

  async function salvar() {
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("admin_cliente_salvar", { p_token: token, p: { ...c, celular: c.celular.replace(/\D/g, "") } });
      if (!r.ok) throw new Error(r.erro);
      setPronto({ ...r.cliente, convite: r.convite });
      aoSalvo?.();
    } catch (e) {
      setErro(e.message);
    }
    setEnviando(false);
  }

  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha folha-alta" role="dialog" aria-modal="true" aria-labelledby="fc-titulo" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        {pronto ? (
          <div className="pronto entra">
            <span className="reservado-icone" aria-hidden="true">✓</span>
            <h2 id="fc-titulo" className="folha-titulo">{editando ? "Cadastro atualizado" : "Cliente cadastrada"}</h2>
            <p className="pronto-sub">{pronto.nome} · {celularFormatado(pronto.celular)}</p>
            {!inicial?.demo && (
              <a className="botao-ouro" href={whatsCliente(pronto.celular, msgBoasVindas(pronto, pronto.convite, window.location.origin))} target="_blank" rel="noopener">
                <IconeConversa stroke="currentColor" /> Enviar boas-vindas no WhatsApp
              </a>
            )}
            <p className="pronto-nota">
              {pronto.tem_conta ? "Ela já tem senha no app." : "A mensagem leva o link para ela criar a senha e acompanhar tudo pelo app."}
            </p>
            <button type="button" className="botao-linha" onClick={() => aoAgendar({ nome: pronto.nome, celular: pronto.celular })}>
              <IconeCalendario width="20" height="20" /> Agendar para {primeiroNome(pronto.nome)}
            </button>
            <button type="button" className="folha-fechar" onClick={aoFechar}>Fechar</button>
          </div>
        ) : (
          <>
            <h2 id="fc-titulo" className="folha-titulo">{editando ? "Editar cliente" : "Nova cliente"}</h2>
            <div className="form form-compacto">
              <label htmlFor="fc-nome">Nome</label>
              <input id="fc-nome" autoComplete="off" value={c.nome} onChange={muda("nome")} placeholder="Nome e sobrenome" />
              <label htmlFor="fc-cel">Celular com WhatsApp</label>
              <input id="fc-cel" inputMode="numeric" value={c.celular} onChange={muda("celular")} placeholder="(85) 90000-0000" disabled={editando} />
              <label htmlFor="fc-aniv">Aniversário (opcional)</label>
              <input id="fc-aniv" type="date" value={c.aniversario || ""} onChange={muda("aniversario")} />
              <label htmlFor="fc-obs">Observações (opcional)</label>
              <textarea id="fc-obs" rows={3} maxLength={500} value={c.observacoes} onChange={muda("observacoes")} placeholder="Formato, cor preferida, alergias…" />
            </div>
            {erro && <p className="erro">{erro}</p>}
            <button type="button" className="botao-ouro" disabled={!valido || enviando} onClick={salvar}>
              {enviando ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar cliente"}
            </button>
            <button type="button" className="folha-fechar" onClick={aoFechar}>Fechar</button>
          </>
        )}
      </div>
    </div>
  );
}
