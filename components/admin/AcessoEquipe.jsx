"use client";

import { useEffect, useState } from "react";
import { rpc } from "../../lib/supabase";
import { mascaraCelular, celularFormatado } from "../../lib/formato";
import { primeiroNome } from "../../lib/agenda";
import { whatsCliente } from "../../lib/mensagens";
import { useSalao } from "../Empresa";
import Interruptor from "./Interruptor";
import { IconeConversa } from "../Icones";

// A dona libera o app para a profissional ver a própria agenda
export default function AcessoEquipe({ token, q, aoMudar }) {
  const salao = useSalao();
  const acesso = q.acesso || null;
  const [celular, setCelular] = useState(acesso?.celular ? mascaraCelular(acesso.celular) : "");
  const [verValores, setVerValores] = useState(Boolean(acesso?.ver_valores));
  const [convite, setConvite] = useState(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [tirar, setTirar] = useState(false);
  const [origem, setOrigem] = useState("");
  useEffect(() => setOrigem(window.location.origin), []);

  const digitos = celular.replace(/\D/g, "");
  const nome = primeiroNome(q.nome);

  async function enviar(p) {
    setOcupado(true);
    setErro("");
    try {
      const r = await rpc("admin_equipe_acesso", { p_token: token, p_equipe: q.id, p });
      if (!r.ok) throw new Error(r.erro);
      if (r.convite) setConvite({ codigo: r.convite, celular: r.celular });
      if (p.acao === "remover") {
        setConvite(null);
        setCelular("");
        setVerValores(false);
      }
      aoMudar?.(p.acao === "remover" ? `${nome} não acessa mais o app.` : r.convite ? "Acesso liberado. Envie o link para ela." : "Acesso atualizado.");
    } catch (e) {
      setErro(e.message);
    }
    setOcupado(false);
    setTirar(false);
  }

  const link = convite ? `${origem}/equipe/entrar?c=${convite.celular}&convite=${convite.codigo}` : "";
  const msg = convite
    ? `Oi, ${nome}! Liberei seu acesso à agenda da ${salao.nome} no app.\n\nCrie sua senha por este link: ${link}\n\nDepois é só entrar em ${origem}/equipe com seu celular e a senha.`
    : "";

  return (
    <section className="eq-acesso" aria-labelledby={`eq-acesso-${q.id}`}>
      <h3 id={`eq-acesso-${q.id}`}>Acesso de {nome} ao app</h3>
      <p className="ms-dica">
        Ela entra pelo celular e vê só a agenda dela, as clientes que atendeu e (se você deixar) os valores. Agenda, preços e
        configurações continuam só com você.
      </p>
      {acesso && (
        <p className="eq-acesso-status">
          <span className={`chip ${acesso.ativo ? "chip-ok" : "chip-alerta"}`}>{acesso.ativo ? "Usando o app" : "Ainda não criou a senha"}</span>
          <small>{celularFormatado(acesso.celular)}</small>
        </p>
      )}
      <div className="form form-compacto">
        <label htmlFor={`eq-cel-${q.id}`}>Celular dela (WhatsApp)</label>
        <input id={`eq-cel-${q.id}`} inputMode="tel" value={celular} onChange={(e) => setCelular(mascaraCelular(e.target.value))} placeholder="(85) 99999-9999" />
      </div>
      <Interruptor
        ligado={verValores}
        aoMudar={(v) => {
          setVerValores(v);
          if (acesso && digitos === acesso.celular) enviar({ celular: digitos, ver_valores: v });
        }}
        rotulo="Pode ver valores"
        texto={verValores ? "Vê o preço de cada atendimento e o total do mês dela." : "Vê horários e clientes, sem valores."}
      />
      {erro && <p className="erro">{erro}</p>}
      {(!acesso || digitos !== acesso.celular) && (
        <button type="button" className="botao-linha" disabled={ocupado || digitos.length < 10} onClick={() => enviar({ celular: digitos, ver_valores: verValores })}>
          {ocupado ? "Liberando…" : acesso ? "Trocar o celular e gerar link novo" : "Liberar acesso"}
        </button>
      )}
      {convite && (
        <div className="eq-convite">
          <a className="botao-ouro" href={whatsCliente(convite.celular, msg)} target="_blank" rel="noopener">
            <IconeConversa stroke="currentColor" /> Enviar link para {nome}
          </a>
          <small>O link vale por 30 dias e só funciona uma vez.</small>
        </div>
      )}
      {acesso && !convite && (
        <div className="eq-acesso-acoes">
          <button type="button" className="link-botao" disabled={ocupado} onClick={() => enviar({ acao: "novo_link" })}>
            {acesso.ativo ? "Ela esqueceu a senha: gerar link novo" : "Gerar link de novo"}
          </button>
          <button type="button" className={`acao acao-perigo ${tirar ? "armada" : ""}`} disabled={ocupado} onClick={() => (tirar ? enviar({ acao: "remover" }) : setTirar(true))}>
            {tirar ? "Toque de novo para tirar o acesso" : "Tirar acesso"}
          </button>
        </div>
      )}
    </section>
  );
}
