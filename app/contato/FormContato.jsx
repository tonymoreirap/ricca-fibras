"use client";

import { useState } from "react";
import { rpc } from "../../lib/supabase";

export default function FormContato() {
  const [f, setF] = useState({ nome: "", email: "", whatsapp: "", salao: "", porte: "", mensagem: "", site: "" });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const muda = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("enviar_contato", { p: f });
      if (!r?.ok) throw new Error(r?.erro || "Não foi possível enviar.");
      setOk(true);
    } catch (e2) {
      setErro(e2.message || "Não foi possível enviar. Tente pelo WhatsApp.");
    }
    setEnviando(false);
  }

  if (ok) {
    return (
      <div className="st-ok-msg" role="status">
        <strong>Mensagem enviada</strong>
        <p>Obrigado, {f.nome.split(" ")[0]}! Respondemos pelo {f.whatsapp ? "WhatsApp" : "e-mail"} em até 1 dia útil.</p>
      </div>
    );
  }

  return (
    <form className="st-form" onSubmit={enviar}>
      <label>Seu nome<input value={f.nome} onChange={muda("nome")} autoComplete="name" required maxLength={80} /></label>
      <div className="st-duas">
        <label>E-mail<input type="email" value={f.email} onChange={muda("email")} autoComplete="email" /></label>
        <label>WhatsApp<input inputMode="tel" value={f.whatsapp} onChange={muda("whatsapp")} autoComplete="tel" placeholder="(85) 99999-9999" /></label>
      </div>
      <div className="st-duas">
        <label>Nome do salão<input value={f.salao} onChange={muda("salao")} maxLength={80} /></label>
        <label>
          Seu salão
          <select value={f.porte} onChange={muda("porte")}>
            <option value="">Escolha</option>
            <option value="sozinha">Atendo sozinha</option>
            <option value="estudio">Estúdio com até 3 profissionais</option>
            <option value="salao">Salão com equipe</option>
            <option value="abrindo">Estou abrindo meu salão</option>
          </select>
        </label>
      </div>
      <label>Mensagem<textarea value={f.mensagem} onChange={muda("mensagem")} required maxLength={2000} /></label>
      <label className="st-isca" aria-hidden="true">Site<input tabIndex={-1} autoComplete="off" value={f.site} onChange={muda("site")} /></label>
      {erro && <p className="st-erro" role="alert">{erro}</p>}
      <button className="st-botao st-botao-g" disabled={enviando}>{enviando ? "Enviando…" : "Enviar mensagem"}</button>
    </form>
  );
}
