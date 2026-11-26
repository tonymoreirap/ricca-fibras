"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rpc } from "../../../lib/supabase";
import { lerSessao, limparSessao, sessaoExpirada } from "../../../lib/sessao";
import { precoServico } from "../../../lib/servicos";
import { hojeISO, somaDias } from "../../../lib/formato";
import { prepararImagem } from "../../../lib/imagem";
import MenuApp from "../../../components/MenuApp";
import Interruptor from "../../../components/admin/Interruptor";
import { IconeMais } from "../../../components/Icones";

const SITUACAO = {
  no_ar: { texto: "No ar", classe: "chip-ok" },
  agendada: { texto: "Agendada", classe: "chip-ouro" },
  encerrada: { texto: "Encerrada", classe: "chip-apagado" },
  oculta: { texto: "Oculta", classe: "chip-apagado" },
};
const dataBr = (iso) => {
  const [a, m, d] = String(iso).split("-");
  return `${d}/${m}/${a.slice(2)}`;
};

function Editor({ token, inicial, servicos, aoFechar, aoSalvo }) {
  const novo = !inicial.id;
  const [p, setP] = useState({
    titulo: "", texto: "", imagem: "", servico: "", preco_promo: "", visivel: true,
    inicio: hojeISO(), fim: somaDias(hojeISO(), 7),
    ...inicial,
    preco_promo: inicial.preco_promo ?? "",
    servico: inicial.servico ?? "",
    imagem: inicial.imagem ?? "",
    texto: inicial.texto ?? "",
  });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [foto, setFoto] = useState("");
  const [apagar, setApagar] = useState(false);
  const entrada = useRef(null);
  const muda = (k) => (v) => setP((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));
  const serv = servicos.find((s) => s.codigo === p.servico);

  async function enviarFoto(e) {
    const arq = e.target.files?.[0];
    e.target.value = "";
    if (!arq) return;
    setFoto("Enviando…");
    try {
      const img = await prepararImagem(arq, "promo");
      const r = await rpc("admin_arquivo_salvar", { p_token: token, p_tipo: "promo", p_mime: img.mime, p_base64: img.base64 });
      if (!r.ok) throw new Error(r.erro);
      setP((x) => ({ ...x, imagem: r.url }));
      setFoto("");
    } catch (err) {
      setFoto(err.message || "Não foi possível enviar.");
    }
  }

  async function salvar() {
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("admin_promocao_salvar", { p_token: token, p: { ...p, preco_promo: String(p.preco_promo) } });
      if (!r.ok) throw new Error(r.erro);
      aoSalvo(novo ? "Promoção criada." : "Promoção salva.");
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  async function excluir() {
    try {
      const r = await rpc("admin_promocao_excluir", { p_token: token, p_id: p.id });
      if (!r.ok) throw new Error(r.erro);
      aoSalvo("Promoção excluída.");
    } catch (err) {
      setErro(err.message);
      setApagar(false);
    }
  }

  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha folha-alta sv-editor" role="dialog" aria-modal="true" aria-labelledby="pr-titulo" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        <h2 id="pr-titulo" className="folha-titulo">{novo ? "Nova promoção" : "Editar promoção"}</h2>

        <button type="button" className="pr-foto" onClick={() => entrada.current?.click()} aria-label={p.imagem ? "Trocar imagem" : "Enviar imagem"}>
          {p.imagem ? <img src={p.imagem} alt="" /> : <span>Imagem da promoção (opcional)<br />Toque para enviar</span>}
        </button>
        {p.imagem && (
          <button type="button" className="acao acao-sutil pr-tirar" onClick={() => muda("imagem")("")}>Tirar imagem</button>
        )}
        {foto && <small className={foto === "Enviando…" ? "ms-dica" : "dica-erro"}>{foto}</small>}
        <input ref={entrada} type="file" accept="image/*" hidden onChange={enviarFoto} />

        <div className="form form-compacto">
          <label htmlFor="pr-tit">Título</label>
          <input id="pr-tit" maxLength={60} value={p.titulo} onChange={muda("titulo")} placeholder="Ex.: Semana da manutenção" />
          <label htmlFor="pr-txt">Texto</label>
          <textarea id="pr-txt" rows={2} maxLength={240} value={p.texto} onChange={muda("texto")} placeholder="Ex.: Manutenção com 15% de desconto de segunda a quarta." />

          <label htmlFor="pr-serv">Serviço com desconto (opcional)</label>
          <select id="pr-serv" value={p.servico} onChange={muda("servico")}>
            <option value="">Nenhum: só divulgar</option>
            {servicos.map((s) => (
              <option key={s.codigo} value={s.codigo}>{s.nome}{s.valor != null ? ` (${precoServico(s.valor)})` : ""}</option>
            ))}
          </select>
          {p.servico && (
            <>
              <label htmlFor="pr-preco">Preço na promoção (R$)</label>
              <input id="pr-preco" inputMode="decimal" value={p.preco_promo} onChange={(e) => muda("preco_promo")(e.target.value.replace(/[^\d,.]/g, ""))} placeholder={serv?.valor != null ? `Normal: ${precoServico(serv.valor)}` : "Ex.: 120"} />
              <small className="ms-dica">Enquanto a promoção estiver no ar, o agendamento pelo app já cobra este preço e o sinal sai dele.</small>
            </>
          )}

          <div className="duas">
            <div>
              <label htmlFor="pr-ini">Começa em</label>
              <input id="pr-ini" type="date" value={p.inicio} onChange={muda("inicio")} />
            </div>
            <div>
              <label htmlFor="pr-fim">Termina em</label>
              <input id="pr-fim" type="date" value={p.fim} min={p.inicio} onChange={muda("fim")} />
            </div>
          </div>
          <small className="ms-dica">Entra e sai do ar sozinha nessas datas.</small>
        </div>

        <div className="sv-chaves">
          <Interruptor ligado={p.visivel} aoMudar={muda("visivel")} rotulo="Mostrar no app" texto={p.visivel ? "Aparece nas datas escolhidas." : "Oculta: não aparece mesmo dentro das datas."} />
        </div>

        {erro && <p className="erro">{erro}</p>}
        <button type="button" className="botao-ouro" disabled={enviando || p.titulo.trim().length < 2} onClick={salvar}>
          {enviando ? "Salvando…" : novo ? "Criar promoção" : "Salvar alterações"}
        </button>
        {!novo && (
          <button type="button" className={`acao acao-perigo sv-excluir ${apagar ? "armada" : ""}`} onClick={() => (apagar ? excluir() : setApagar(true))}>
            {apagar ? "Toque de novo para excluir" : "Excluir promoção"}
          </button>
        )}
        <button type="button" className="folha-fechar" onClick={aoFechar}>Fechar</button>
      </div>
    </div>
  );
}

export default function Promocoes() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [lista, setLista] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [editar, setEditar] = useState(null);
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const sair = useCallback(() => {
    limparSessao("admin");
    router.replace("/admin/entrar");
  }, [router]);

  const carregar = useCallback(
    (t) => rpc("admin_promocoes", { p_token: t }).then(setLista).catch((e) => (sessaoExpirada(e) ? sair() : setAviso("Sem conexão. Tente de novo."))),
    [sair]
  );

  useEffect(() => {
    const s = lerSessao("admin");
    if (!s?.token) return router.replace("/admin/entrar");
    setToken(s.token);
    carregar(s.token);
    rpc("admin_servicos", { p_token: s.token }).then((l) => setServicos((l || []).filter((x) => x.visivel))).catch(() => {});
  }, [router, carregar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 3200);
    return () => clearTimeout(t);
  }, [aviso]);

  async function alternar(p) {
    setOcupado(true);
    try {
      await rpc("admin_promocao_visivel", { p_token: token, p_id: p.id, p_visivel: !p.visivel });
      setAviso(p.visivel ? "Promoção ocultada." : "Promoção voltou para o app.");
      await carregar(token);
    } catch (e) {
      sessaoExpirada(e) ? sair() : setAviso("Sem conexão. Tente de novo.");
    }
    setOcupado(false);
  }

  return (
    <div className="app app-admin">
      <header className="adm-topo">
        <div>
          <p className="c-saudacao">Meu salão</p>
          <h1>Promoções</h1>
        </div>
        <Link href="/visitante#promocoes" className="barra-link">Ver no app</Link>
      </header>

      <main className="tela">
        <p className="sv-intro">
          Cada promoção tem data para entrar e sair do ar. Ligada a um serviço, o preço com desconto já vale no agendamento pelo app.
        </p>
        <button type="button" className="botao-linha nova-cliente" onClick={() => setEditar({})}>
          <IconeMais width="20" height="20" /> Nova promoção
        </button>

        {lista === null ? (
          <p className="bloco-vazio">Carregando promoções…</p>
        ) : lista.length === 0 ? (
          <p className="bloco-vazio">Nenhuma promoção ainda. Crie a primeira e ela aparece no topo da página do salão.</p>
        ) : (
          <ul className="sv-lista">
            {lista.map((p) => {
              const st = SITUACAO[p.situacao] || SITUACAO.oculta;
              return (
                <li key={p.id} className={`sv-item vidro ${p.situacao === "encerrada" || !p.visivel ? "sv-oculto" : ""}`}>
                  <button type="button" className="sv-linha" onClick={() => setEditar(p)} aria-label={`Editar ${p.titulo}`}>
                    {p.imagem ? <img className="pr-mini" src={p.imagem} alt="" /> : <span className="pr-mini pr-mini-vazia" aria-hidden="true">%</span>}
                    <span className="sv-texto">
                      <strong>{p.titulo}</strong>
                      <small>
                        {dataBr(p.inicio)} a {dataBr(p.fim)}
                        {p.preco_promo ? ` · ${p.servico_nome}: ${precoServico(p.preco_promo)}` : ""}
                      </small>
                      <span className="sv-chips"><span className={`chip ${st.classe}`}>{st.texto}</span></span>
                    </span>
                  </button>
                  {p.situacao !== "encerrada" && (
                    <div className="sv-acoes">
                      <button type="button" className={`acao ${p.visivel ? "acao-sutil" : "acao-forte"}`} disabled={ocupado} onClick={() => alternar(p)}>
                        {p.visivel ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <MenuApp quem={{ tipo: "admin" }} />

      {editar && (
        <Editor
          token={token}
          inicial={editar}
          servicos={servicos}
          aoFechar={() => setEditar(null)}
          aoSalvo={(msg) => {
            setEditar(null);
            setAviso(msg);
            carregar(token);
          }}
        />
      )}
      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  );
}
