"use client";

import { useState } from "react";
import Link from "next/link";
import { rpc } from "../lib/supabase";
import { lerSessao } from "../lib/sessao";
import { aContato, linkWhats } from "../lib/empresa";
import { hora, dataLonga } from "../lib/formato";
import { primeiroNome, MOTIVOS_CANCELAMENTO } from "../lib/agenda";
import { IconeConversa } from "./Icones";

// Cliente nova, salão sem sinal: manda o código ao salão pelo WhatsApp para confirmar o horário.
export function ConfirmarComCodigo({ salao, a, codigo, pedidaEm, aoPedir }) {
  const [pedida, setPedida] = useState(Boolean(pedidaEm));
  const texto = [
    `Oi, ${salao.contato}! Sou ${a.cliente_nome}.`,
    `Meu código de confirmação é ${codigo}.`,
    `Horário: ${a.servico_nome}, ${dataLonga(a.inicio)} às ${hora(a.inicio)} (agendamento ${a.codigo}).`,
  ].join("\n");
  const href = linkWhats(salao, texto);
  const avisar = () => {
    setPedida(true);
    rpc("reserva_pedir_confirmacao", { p_codigo: a.codigo }).catch(() => {});
    aoPedir?.();
  };
  return (
    <section className="confirmar-numero vidro entra nao-imprimir" aria-labelledby="cc-titulo">
      <h2 id="cc-titulo">Confirme seu horário</h2>
      <p>
        Seu horário está guardado. Para confirmar, envie este código para {aContato(salao)} pelo WhatsApp, do mesmo número que você
        usou para agendar.
      </p>
      <p className="cn-codigo" aria-label={`Código ${codigo}`}>{codigo}</p>
      {pedida ? (
        <>
          <p className="cn-enviado">Código enviado. Assim que {aContato(salao)} conferir, seu horário aparece como confirmado.</p>
          {href && <a className="link-botao cn-de-novo" href={href} target="_blank" rel="noopener" onClick={avisar}>Enviar de novo</a>}
        </>
      ) : href ? (
        <a className="botao-ouro" href={href} target="_blank" rel="noopener" onClick={avisar}>
          <IconeConversa stroke="currentColor" /> Enviar código pelo WhatsApp
        </a>
      ) : (
        <p className="cn-nota">Mostre este código para {aContato(salao)} para confirmar.</p>
      )}
      <p className="cn-nota">Sem o código, a reserva é cancelada sozinha em 12 horas. O pagamento é feito no dia, no salão.</p>
    </section>
  );
}

// Botão de cancelar + folha com o motivo
export function CancelarHorario({ salao, a, aoCancelar }) {
  const [aberta, setAberta] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [outro, setOutro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [falarComSalao, setFalarComSalao] = useState(false);

  const ativo = ["aguardando_sinal", "aguardando_confirmacao", "confirmado"].includes(a.status);
  if (!ativo || new Date(a.inicio).getTime() <= Date.now()) return null;

  const pago = a.status === "confirmado";
  const horas = salao.cancelarHoras;
  const perto = pago && (horas === 0 || new Date(a.inicio).getTime() < Date.now() + horas * 3600000);
  const msgSalao = `Oi, ${salao.contato}! Sou ${a.cliente_nome} e preciso cancelar meu horário de ${a.servico_nome}, ${dataLonga(a.inicio)} às ${hora(a.inicio)} (agendamento ${a.codigo}).`;
  const whats = linkWhats(salao, msgSalao);

  if (perto) {
    return (
      <p className="cancelar-aviso nao-imprimir">
        {horas === 0 ? "Para cancelar" : `Faltam menos de ${horas} ${horas === 1 ? "hora" : "horas"}. Para cancelar`}, fale com {aContato(salao)}
        {whats ? <> pelo <a href={whats} target="_blank" rel="noopener">WhatsApp</a></> : null}.
      </p>
    );
  }

  const sessao = typeof window !== "undefined" ? lerSessao("cliente") : null;
  const texto = motivo === "Outro motivo" ? outro.trim() : motivo;

  async function cancelar() {
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("cliente_cancelar", { p_token: sessao.token, p_codigo: a.codigo, p_motivo: texto });
      if (!r.ok) {
        setErro(r.erro);
        setFalarComSalao(Boolean(r.falar_com_salao));
      } else {
        setAberta(false);
        aoCancelar?.(r.agendamento);
      }
    } catch (e) {
      setErro(/sess/i.test(e.message) ? "Entre na sua conta para cancelar." : e.message);
    }
    setEnviando(false);
  }

  return (
    <>
      <button type="button" className="link-botao cancelar-botao nao-imprimir" onClick={() => setAberta(true)}>
        Cancelar este horário
      </button>
      {aberta && (
        <div className="folha-fundo" onClick={() => setAberta(false)}>
          <div className="folha folha-alta" role="dialog" aria-modal="true" aria-labelledby="canc-titulo" onClick={(e) => e.stopPropagation()}>
            <span className="folha-alca" aria-hidden="true" />
            <h2 id="canc-titulo" className="folha-titulo">Cancelar horário</h2>
            <p className="canc-quando">
              {a.servico_nome} · {dataLonga(a.inicio)} às {hora(a.inicio)}
            </p>
            {!sessao?.token ? (
              <>
                <p className="canc-texto">Para cancelar, entre na sua conta com o celular e a senha que você usou para agendar.</p>
                <Link className="botao-ouro" href={`/entrar?volta=${encodeURIComponent(`/recibo/${a.codigo}`)}`}>Entrar</Link>
              </>
            ) : (
              <>
                <fieldset className="canc-motivos">
                  <legend>Por que você vai cancelar?</legend>
                  {MOTIVOS_CANCELAMENTO.map((m) => (
                    <label key={m} className={motivo === m ? "marcado" : ""}>
                      <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} />
                      <span>{m}</span>
                    </label>
                  ))}
                </fieldset>
                {motivo === "Outro motivo" && (
                  <textarea
                    className="canc-outro"
                    rows={2}
                    maxLength={200}
                    value={outro}
                    onChange={(e) => setOutro(e.target.value)}
                    placeholder="Conte rapidinho o motivo"
                    aria-label="Motivo do cancelamento"
                  />
                )}
                {pago && Number(a.sinal) > 0 && (
                  <p className="canc-texto">O sinal já pago segue a combinação com {aContato(salao)}.</p>
                )}
                {erro && <p className="erro">{erro}</p>}
                {falarComSalao && whats && (
                  <a className="botao-linha" href={whats} target="_blank" rel="noopener">Falar com {aContato(salao)}</a>
                )}
                <button type="button" className="botao-ouro" disabled={enviando || texto.length < 3} onClick={cancelar}>
                  {enviando ? "Cancelando…" : "Confirmar cancelamento"}
                </button>
              </>
            )}
            <button type="button" className="folha-fechar" onClick={() => setAberta(false)}>Manter meu horário</button>
          </div>
        </div>
      )}
    </>
  );
}

// Aviso de horário cancelado (com o motivo)
export function AvisoCancelado({ salao, a }) {
  if (a.status !== "cancelado") return null;
  const quem =
    a.cancelado_por === "cliente" ? "Você cancelou este horário" :
    a.cancelado_por === "sistema" ? "Este horário foi cancelado porque o código não foi confirmado a tempo" :
    `${primeiroNome(salao.contato)} cancelou este horário`;
  return (
    <div className="cancelado-aviso entra">
      <strong>{quem}.</strong>
      {a.motivo_cancelamento && a.cancelado_por === "cliente" && <p>Motivo: {a.motivo_cancelamento}</p>}
      <p>
        Quer outro horário? <Link href="/agendar">Agendar de novo</Link>
      </p>
    </div>
  );
}
