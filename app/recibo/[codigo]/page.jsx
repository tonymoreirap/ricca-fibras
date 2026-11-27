"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { rpc } from "../../../lib/supabase";
import { pixCopiaECola } from "../../../lib/pix";
import { useSalao, LogoDe } from "../../../components/Empresa";
import { aContato, linkWhats } from "../../../lib/empresa";
import { real, hora, dataLonga, dataCurta } from "../../../lib/formato";
import { mensagemRecibo, guardarCodigo } from "../../../components/Agendamento";
import { IconeConversa, IconeVoltar, IlustracaoServico } from "../../../components/Icones";
import { lerSessao } from "../../../lib/sessao";
import { ConfirmarComCodigo, CancelarHorario, AvisoCancelado } from "../../../components/HorarioCliente";

const STATUS = {
  aguardando_sinal: { texto: "Aguardando o sinal", classe: "chip-alerta" },
  aguardando_confirmacao: { texto: "Aguardando confirmação", classe: "chip-alerta" },
  confirmado: { texto: "Confirmado", classe: "chip-ok" },
  cancelado: { texto: "Cancelado", classe: "" },
  concluido: { texto: "Atendimento concluído", classe: "chip-ok" },
};

export default function Recibo() {
  const salao = useSalao();
  const { codigo } = useParams();
  const busca = useSearchParams();
  const novo = busca.get("novo") === "1";

  const [a, setA] = useState(null);
  const [erro, setErro] = useState("");
  const [qr, setQr] = useState("");
  const [pix, setPix] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [origem, setOrigem] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [logada, setLogada] = useState(false);
  const [informado, setInformado] = useState(false);
  const [informando, setInformando] = useState(false);

  useEffect(() => {
    setOrigem(window.location.origin);
    setLogada(Boolean(lerSessao("cliente")?.token));
    rpc("consultar_reserva", { p_codigo: String(codigo) })
      .catch(() => rpc("consultar_agendamento", { p_codigo: String(codigo) }))
      .then(async (l) => {
        if (!l.length) {
          setErro("Recibo não encontrado. Confira o código.");
          return;
        }
        let cel = "";
        try {
          cel = JSON.parse(localStorage.getItem("rica:cliente") || "null")?.celular || "";
        } catch {}
        const x = await rpc("reserva_extra", { p_codigo: String(codigo) }).catch(() => null);
        const reg = {
          ...l[0],
          cliente_celular: cel,
          codigo_confirmacao: x?.codigo_confirmacao || null,
          confirmacao_pedida_em: x?.confirmacao_pedida_em || null,
          cancelado_por: x?.cancelado_por || null,
          motivo_cancelamento: x?.motivo || null,
        };
        setA(reg);
        setInformado(Boolean(reg.pix_informado_em));
        guardarCodigo(reg.codigo);
        const p = salao.pix.chave ? pixCopiaECola({ ...salao.pix, valor: reg.sinal, identificador: reg.codigo }) : "";
        setPix(p);
        // prepara o PDF para o compartilhamento nativo (celular)
        fetch(`/recibo/${reg.codigo}/pdf`)
          .then((r) => (r.ok ? r.blob() : null))
          .then((b) => {
            if (!b) return;
            const f = new File([b], `Recibo-${reg.codigo}-${salao.nome.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`, { type: "application/pdf" });
            if (navigator.canShare?.({ files: [f] })) setArquivo(f);
          })
          .catch(() => {});
        if (p) setQr(
          await QRCode.toString(p, {
            type: "svg",
            margin: 1,
            errorCorrectionLevel: "M",
            color: { dark: "#1a100cff", light: "#00000000" },
          })
        );
      })
      .catch((e) => setErro(e.message));
  }, [codigo]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(pix);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {}
  }

  async function enviarPdf() {
    if (!arquivo) {
      window.open(whatsSalao, "_blank", "noopener");
      return;
    }
    setEnviando(true);
    try {
      await navigator.share({
        files: [arquivo],
        title: `Recibo ${a.codigo} — ${salao.nome}`,
        text: `Recibo de agendamento ${a.codigo} — ${salao.nome}`,
      });
    } catch (e) {
      if (e?.name !== "AbortError") window.open(whatsSalao, "_blank", "noopener");
    } finally {
      setEnviando(false);
    }
  }

  const whatsSalao = a
    ? linkWhats(salao, mensagemRecibo(salao, a, origem)) || `https://instagram.com/${salao.instagram}`
    : "#";
  const pendente = a?.status === "aguardando_sinal";
  const aConfirmar = a?.status === "aguardando_confirmacao";
  const temSinal = Number(a?.sinal) > 0;
  const st = a ? STATUS[a.status] || STATUS.confirmado : null;

  return (
    <div className="app app-recibo">
      <header className="barra-topo nao-imprimir">
        <Link href={logada ? "/cliente" : "/agendar"} className="barra-voltar" aria-label="Voltar">
          <IconeVoltar />
        </Link>
        <span className="barra-marca">Recibo</span>
        <span className="barra-direita" />
      </header>

      <main className="tela">
        {erro && <p className="erro">{erro}</p>}
        {!a && !erro && <div className="carregando">Carregando recibo…</div>}

        {a && (
          <>
            {novo && pendente && (
              <div className="reservado entra nao-imprimir">
                <span className="reservado-icone" aria-hidden="true">✓</span>
                <div>
                  <strong>Horário reservado!</strong>
                  <p>Pague o sinal pelo Pix e envie o comprovante para {aContato(salao)} confirmar.</p>
                </div>
              </div>
            )}

            {novo && aConfirmar && (
              <div className="reservado entra nao-imprimir">
                <span className="reservado-icone" aria-hidden="true">✓</span>
                <div>
                  <strong>Horário guardado!</strong>
                  <p>Falta só um passo: envie o código abaixo para {aContato(salao)} confirmar.</p>
                </div>
              </div>
            )}

            {novo && a.status === "confirmado" && (
              <div className="reservado entra nao-imprimir">
                <span className="reservado-icone" aria-hidden="true">✓</span>
                <div>
                  <strong>Horário confirmado!</strong>
                  <p>{temSinal ? "Tudo certo." : "O pagamento é feito no dia, no salão."} Te esperamos.</p>
                </div>
              </div>
            )}

            {aConfirmar && a.codigo_confirmacao && (
              <ConfirmarComCodigo salao={salao} a={a} codigo={a.codigo_confirmacao} pedidaEm={a.confirmacao_pedida_em} />
            )}

            <AvisoCancelado salao={salao} a={a} />

            {pendente && (
              <section className="pix vidro entra nao-imprimir" aria-labelledby="pix-titulo">
                <div className="pix-cabeca">
                  <span className="passo-num">1</span>
                  <h2 id="pix-titulo">Pague o sinal pelo Pix</h2>
                </div>
                <p className="pix-valor">{real(a.sinal)}</p>
                {pix ? (
                  <>
                    <div className="pix-qr" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR Code do Pix" role="img" />
                    <button type="button" className="botao-linha" onClick={copiar}>
                      {copiado ? "Código copiado!" : "Copiar Pix copia e cola"}
                    </button>
                    <p className="pix-chave">
                      Chave Pix: <strong>{salao.pix.exibicao || salao.pix.chave}</strong>
                      <br />
                      Favorecida: {salao.contato !== salao.nome ? `${salao.contato} · ` : ""}{salao.pix.nome || salao.nome}
                    </p>
                  </>
                ) : (
                  <p className="pix-chave">Combine o pagamento do sinal com {aContato(salao)} pelo WhatsApp.</p>
                )}

                <div className="pix-cabeca pix-cabeca-2">
                  <span className="passo-num">2</span>
                  <h2>Envie o comprovante</h2>
                </div>
                {arquivo ? (
                  <>
                    <button type="button" className="botao-ouro" onClick={enviarPdf} disabled={enviando}>
                      <IconeConversa stroke="currentColor" />
                      {enviando ? "Abrindo…" : "Enviar recibo em PDF"}
                    </button>
                    <p className="pix-nota">
                      Escolha o WhatsApp e a conversa com {aContato(salao)}. Depois envie também o comprovante do Pix.
                    </p>
                    <a className="botao-linha" href={whatsSalao} target="_blank" rel="noopener">
                      Enviar como mensagem
                    </a>
                  </>
                ) : (
                  <>
                    <a className="botao-ouro" href={whatsSalao} target="_blank" rel="noopener">
                      <IconeConversa stroke="currentColor" />
                      Enviar recibo para {aContato(salao)}
                    </a>
                    <p className="pix-nota">
                      O WhatsApp abre com o recibo e o link do PDF. É só anexar o comprovante do Pix e enviar.
                    </p>
                  </>
                )}

                <div className="pix-cabeca pix-cabeca-2">
                  <span className="passo-num">3</span>
                  <h2>Avise que pagou</h2>
                </div>
                {informado ? (
                  <p className="pix-informado">Avisamos {aContato(salao)} do seu Pix. Assim que conferir, o horário aparece como confirmado.</p>
                ) : (
                  <button
                    type="button"
                    className="botao-linha"
                    disabled={informando}
                    onClick={async () => {
                      setInformando(true);
                      try {
                        const r = await rpc("informar_pix", { p_codigo: a.codigo });
                        if (r.ok) setInformado(true);
                      } catch {}
                      setInformando(false);
                    }}
                  >
                    {informando ? "Avisando…" : "Já enviei o Pix"}
                  </button>
                )}
              </section>
            )}

            <article className="recibo entra" aria-label="Recibo de agendamento">
              <div className="recibo-topo">
                <LogoDe salao={salao} tamanho={56} />
                <div>
                  <p className="recibo-marca">{salao.nome}</p>
                  <p className="recibo-tipo">Recibo de agendamento</p>
                </div>
              </div>
              <div className="recibo-codigo">
                <span>Código</span>
                <strong>{a.codigo}</strong>
              </div>
              <span className={`chip ${st.classe}`}>{st.texto}</span>

              <div className="recibo-servico">
                <IlustracaoServico tipo={/manuten/i.test(a.servico_nome) ? "manutencao" : "fibra"} tamanho={44} />
                <div>
                  <strong>{a.servico_nome}</strong>
                  <span>
                    {dataLonga(a.inicio)} · {hora(a.inicio)} às {hora(a.fim)}
                  </span>
                </div>
              </div>

              <dl className="recibo-linhas">
                <div><dt>Cliente</dt><dd>{a.cliente_nome}</dd></div>
                {a.profissional_nome && <div><dt>Profissional</dt><dd>{a.profissional_nome}</dd></div>}
                <div><dt>Valor do serviço</dt><dd>{real(a.valor)}</dd></div>
                {temSinal ? (
                  <>
                    <div><dt>Sinal ({Math.round((Number(a.sinal) / Number(a.valor)) * 100)}%) via Pix</dt><dd>{real(a.sinal)}</dd></div>
                    <div className="recibo-total"><dt>Restante no dia</dt><dd>{real(Number(a.valor) - Number(a.sinal))}</dd></div>
                  </>
                ) : (
                  <div className="recibo-total"><dt>A pagar no dia</dt><dd>{real(a.valor)}</dd></div>
                )}
              </dl>

              <p className="recibo-rodape">
                Emitido em {dataCurta(a.criado_em)} às {hora(a.criado_em)} {temSinal && salao.pix.chave ? ` · Chave Pix ${salao.pix.exibicao || salao.pix.chave}` : ""}
                <br />
                Comprovante de agendamento, sem valor fiscal.
              </p>
              <span className="recibo-picote" aria-hidden="true" />
            </article>

            <div className="recibo-acoes nao-imprimir">
              {!pendente && (
                <a className="botao-ouro" href={whatsSalao} target="_blank" rel="noopener">
                  <IconeConversa stroke="currentColor" />
                  Falar com {aContato(salao)}
                </a>
              )}
              <a className="botao-linha" href={`/recibo/${a.codigo}/pdf`} target="_blank" rel="noopener">
                Abrir recibo em PDF
              </a>
              <CancelarHorario
                salao={salao}
                a={a}
                aoCancelar={(n) => setA((x) => ({ ...x, status: "cancelado", cancelado_por: "cliente", motivo_cancelamento: n?.motivo_cancelamento }))}
              />
              <Link href={logada ? "/cliente" : "/visitante"} className="link-claro">
                {logada ? "Ir para minha área" : "Voltar ao início"}
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
