"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rpc } from "../../../lib/supabase";
import { lerSessao, limparSessao, sessaoExpirada } from "../../../lib/sessao";
import { precoServico, linhaServico } from "../../../lib/servicos";
import MenuApp from "../../../components/MenuApp";
import { IlustracaoServico, ICONES_SERVICO, IconeMais } from "../../../components/Icones";

const DURACOES = [30, 60, 90, 120, 150, 180, 240];
const duracaoTexto = (m) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`);

const vazio = {
  codigo: "", nome: "", descricao: "", resumo: "", icone: "brilho", valor: "", ciclo_dias: "",
  visivel: true, destaque: false, selo: "", agenda_online: false, duracao_min: 60, sinal_pct: 30,
};

function Interruptor({ ligado, aoMudar, rotulo, texto }) {
  return (
    <label className="interruptor">
      <span>
        <strong>{rotulo}</strong>
        {texto && <small>{texto}</small>}
      </span>
      <input type="checkbox" role="switch" checked={ligado} onChange={(e) => aoMudar(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

// Como o serviço aparece no site, enquanto a dona edita
function Previa({ s }) {
  const preco = precoServico(s.valor === "" ? null : String(s.valor).replace(",", "."));
  const linha = linhaServico({ resumo: s.resumo, ciclo_dias: s.ciclo_dias });
  return (
    <div className="sv-previa" aria-label="Prévia no site">
      <span className="sv-previa-rotulo">Como aparece no site</span>
      <div className="servico vidro">
        <span className="servico-icone"><IlustracaoServico tipo={s.icone} tamanho={38} /></span>
        <span className="servico-texto">
          <span className="servico-nome">{s.nome || "Nome do serviço"}</span>
          {linha && <span className="servico-sub">{linha}</span>}
        </span>
        <span className="servico-preco">{preco}</span>
      </div>
    </div>
  );
}

function Editor({ token, inicial, aoFechar, aoSalvo }) {
  const [s, setS] = useState({ ...vazio, ...inicial, valor: inicial?.valor ?? "", ciclo_dias: inicial?.ciclo_dias ?? "", resumo: inicial?.resumo ?? "", descricao: inicial?.descricao ?? "", selo: inicial?.selo ?? "" });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [apagar, setApagar] = useState(false);
  const muda = (k) => (v) => setS((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));
  const novo = !inicial?.codigo;
  const temValor = String(s.valor).trim() !== "";
  const sinal = temValor ? (Number(String(s.valor).replace(",", ".")) * Number(s.sinal_pct)) / 100 : 0;

  async function salvar() {
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("admin_servico_salvar", { p_token: token, p: { ...s, valor: String(s.valor) } });
      if (!r.ok) throw new Error(r.erro);
      aoSalvo(novo ? "Serviço criado. Já aparece no site." : "Alterações salvas. O site atualiza em instantes.");
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  async function excluir() {
    try {
      const r = await rpc("admin_servico_excluir", { p_token: token, p_codigo: s.codigo });
      if (!r.ok) throw new Error(r.erro || "Não foi possível excluir.");
      aoSalvo("Serviço excluído.");
    } catch (e) {
      setErro(e.message);
      setApagar(false);
    }
  }

  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha folha-alta sv-editor" role="dialog" aria-modal="true" aria-labelledby="sv-titulo" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        <h2 id="sv-titulo" className="folha-titulo">{novo ? "Novo serviço" : "Editar serviço"}</h2>

        <Previa s={s} />

        <div className="form form-compacto">
          <label htmlFor="sv-nome">Nome</label>
          <input id="sv-nome" maxLength={60} value={s.nome} onChange={muda("nome")} placeholder="Ex.: Esmaltação em gel" />

          <span className="cr-rotulo">Ícone</span>
          <div className="sv-icones" role="radiogroup" aria-label="Ícone">
            {ICONES_SERVICO.map(([k, nome]) => (
              <button key={k} type="button" role="radio" aria-checked={s.icone === k} aria-label={nome} title={nome} onClick={() => muda("icone")(k)}>
                <IlustracaoServico tipo={k} tamanho={34} />
              </button>
            ))}
          </div>

          <label htmlFor="sv-valor">Valor (R$)</label>
          <input id="sv-valor" inputMode="decimal" value={s.valor} onChange={(e) => muda("valor")(e.target.value.replace(/[^\d,.]/g, ""))} placeholder="Deixe vazio para mostrar “Consulte”" />

          <div className="duas">
            <div>
              <label htmlFor="sv-ciclo">Manutenção a cada</label>
              <input id="sv-ciclo" inputMode="numeric" value={s.ciclo_dias} onChange={(e) => muda("ciclo_dias")(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="dias (opcional)" />
            </div>
            <div>
              <label htmlFor="sv-resumo">Ou uma frase curta</label>
              <input id="sv-resumo" maxLength={40} value={s.resumo} onChange={muda("resumo")} placeholder="Ex.: Cuidado completo" />
            </div>
          </div>

          <label htmlFor="sv-desc">Descrição (aparece ao tocar no serviço)</label>
          <textarea id="sv-desc" rows={2} maxLength={200} value={s.descricao} onChange={muda("descricao")} placeholder="Ex.: Brilho e cor que duram semanas." />
        </div>

        <div className="sv-chaves">
          <Interruptor ligado={s.visivel} aoMudar={muda("visivel")} rotulo="Mostrar no site" texto={s.visivel ? "Clientes veem este serviço." : "Oculto: some do site e da agenda."} />
          <Interruptor ligado={s.destaque} aoMudar={muda("destaque")} rotulo="Serviço em destaque" texto="Cartão grande no topo da lista (só um por vez)." />
          {s.destaque && (
            <div className="form form-compacto">
              <input aria-label="Selo do destaque" maxLength={30} value={s.selo} onChange={muda("selo")} placeholder="Selo, ex.: Assinatura da casa" />
            </div>
          )}
          <Interruptor
            ligado={s.agenda_online}
            aoMudar={muda("agenda_online")}
            rotulo="Agendar pelo app"
            texto={s.agenda_online ? "A cliente escolhe o horário e paga o sinal por Pix." : "A cliente agenda pelo WhatsApp."}
          />
          {s.agenda_online && (
            <div className="sv-agenda">
              <span className="cr-rotulo">Duração</span>
              <div className="ordenar sv-duracoes" role="radiogroup" aria-label="Duração">
                {DURACOES.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={Number(s.duracao_min) === m} aria-pressed={Number(s.duracao_min) === m} onClick={() => muda("duracao_min")(m)}>
                    {duracaoTexto(m)}
                  </button>
                ))}
              </div>
              <span className="cr-rotulo">Sinal para reservar</span>
              <div className="ordenar" role="radiogroup" aria-label="Sinal">
                {[0, 20, 30, 50, 100].map((p) => (
                  <button key={p} type="button" role="radio" aria-checked={Number(s.sinal_pct) === p} aria-pressed={Number(s.sinal_pct) === p} onClick={() => muda("sinal_pct")(p)}>
                    {p === 0 ? "Sem sinal" : `${p}%`}
                  </button>
                ))}
              </div>
              <p className="sv-nota">
                {!temValor
                  ? "Informe o valor acima para liberar o agendamento pelo app."
                  : Number(s.sinal_pct) === 0
                    ? "A reserva entra sem cobrança antecipada."
                    : `Sinal de ${precoServico(sinal.toFixed(2))} por Pix na reserva.`}
                {" "}Os horários seguem blocos de {duracaoTexto(Number(s.duracao_min))} a partir da abertura.
              </p>
            </div>
          )}
        </div>

        {erro && <p className="erro">{erro}</p>}
        <button type="button" className="botao-ouro" disabled={enviando || s.nome.trim().length < 2} onClick={salvar}>
          {enviando ? "Salvando…" : novo ? "Criar serviço" : "Salvar alterações"}
        </button>
        {!novo && (
          <button type="button" className={`acao acao-perigo sv-excluir ${apagar ? "armada" : ""}`} onClick={() => (apagar ? excluir() : setApagar(true))}>
            {apagar ? "Toque de novo para excluir" : inicial.usos ? `Excluir (tem ${inicial.usos} no histórico: prefira ocultar)` : "Excluir serviço"}
          </button>
        )}
        <button type="button" className="folha-fechar" onClick={aoFechar}>Fechar</button>
      </div>
    </div>
  );
}

export default function Servicos() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [lista, setLista] = useState(null);
  const [editar, setEditar] = useState(null);
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const sair = useCallback(() => {
    limparSessao("admin");
    router.replace("/admin/entrar");
  }, [router]);

  const carregar = useCallback(
    (t) => rpc("admin_servicos", { p_token: t }).then(setLista).catch((e) => (sessaoExpirada(e) ? sair() : setAviso("Sem conexão. Tente de novo."))),
    [sair]
  );

  useEffect(() => {
    const s = lerSessao("admin");
    if (!s?.token) return router.replace("/admin/entrar");
    setToken(s.token);
    carregar(s.token);
  }, [router, carregar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 3200);
    return () => clearTimeout(t);
  }, [aviso]);

  async function acao(nome, args, msg) {
    setOcupado(true);
    try {
      const r = await rpc(nome, { p_token: token, ...args });
      if (r && r.ok === false) setAviso(r.erro || "Não foi possível.");
      else if (msg) setAviso(msg);
      await carregar(token);
    } catch (e) {
      sessaoExpirada(e) ? sair() : setAviso("Sem conexão. Tente de novo.");
    }
    setOcupado(false);
  }

  const visiveis = lista?.filter((s) => s.visivel).length || 0;

  return (
    <div className="app app-admin">
      <header className="adm-topo">
        <div>
          <p className="c-saudacao">Meu salão</p>
          <h1>Serviços e valores</h1>
        </div>
        <Link href="/visitante#servicos" className="barra-link">Ver no site</Link>
      </header>

      <main className="tela">
        <p className="sv-intro">
          Edite nomes, valores e textos, oculte o que o salão não faz e escolha o que a cliente pode agendar direto pelo app.
          {lista && ` ${visiveis} de ${lista.length} aparecem no site.`}
        </p>
        <button type="button" className="botao-linha nova-cliente" onClick={() => setEditar({})}>
          <IconeMais width="20" height="20" /> Novo serviço
        </button>

        {lista === null ? (
          <p className="bloco-vazio">Carregando serviços…</p>
        ) : (
          <ul className="sv-lista">
            {lista.map((s, i) => (
              <li key={s.codigo} className={`sv-item vidro ${s.visivel ? "" : "sv-oculto"}`}>
                <button type="button" className="sv-linha" onClick={() => setEditar(s)} aria-label={`Editar ${s.nome}`}>
                  <span className="servico-icone"><IlustracaoServico tipo={s.icone} tamanho={34} /></span>
                  <span className="sv-texto">
                    <strong>{s.nome}</strong>
                    <small>{[precoServico(s.valor), linhaServico(s)].filter(Boolean).join(" · ")}</small>
                    <span className="sv-chips">
                      {s.destaque && <span className="chip chip-ouro">Destaque</span>}
                      {s.agenda_online && s.valor != null && <span className="chip chip-ok">Agenda no app</span>}
                      {!s.visivel && <span className="chip chip-apagado">Oculto</span>}
                    </span>
                  </span>
                </button>
                <div className="sv-acoes">
                  <button type="button" className="sv-seta" disabled={ocupado || i === 0} onClick={() => acao("admin_servico_mover", { p_codigo: s.codigo, p_direcao: -1 })} aria-label={`Subir ${s.nome}`}>↑</button>
                  <button type="button" className="sv-seta" disabled={ocupado || i === lista.length - 1} onClick={() => acao("admin_servico_mover", { p_codigo: s.codigo, p_direcao: 1 })} aria-label={`Descer ${s.nome}`}>↓</button>
                  <button
                    type="button"
                    className={`acao ${s.visivel ? "acao-sutil" : "acao-forte"}`}
                    disabled={ocupado}
                    onClick={() => acao("admin_servico_visivel", { p_codigo: s.codigo, p_visivel: !s.visivel }, s.visivel ? `${s.nome} ocultado do site.` : `${s.nome} voltou para o site.`)}
                  >
                    {s.visivel ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <MenuApp quem={{ tipo: "admin" }} />

      {editar && (
        <Editor
          token={token}
          inicial={editar}
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
