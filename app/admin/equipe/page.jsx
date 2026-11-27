"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rpc } from "../../../lib/supabase";
import { lerSessao, limparSessao, sessaoExpirada } from "../../../lib/sessao";
import { iniciais } from "../../../lib/empresa";
import { NOME_PLANO } from "../../../lib/planos";
import { useSalao } from "../../../components/Empresa";
import MenuApp from "../../../components/MenuApp";
import Interruptor from "../../../components/admin/Interruptor";
import { FolhaPlano, IconeCadeado } from "../../../components/admin/Cadeado";
import { IconeMais } from "../../../components/Icones";
import AcessoEquipe from "../../../components/admin/AcessoEquipe";

// Qual oferta mostrar quando a equipe chega ao limite
const ofertaDoLimite = (limite) => (limite <= 1 ? { recurso: "equipe3" } : limite <= 3 ? { recurso: "equipe10" } : { recurso: "equipe10", extra: true });

const textoServicos = (q, servicos) => {
  if (!q.servicos?.length) return "Faz todos os serviços";
  const nomes = q.servicos.map((c) => servicos.find((s) => s.codigo === c)?.nome).filter(Boolean);
  return nomes.length ? `Faz ${nomes.join(", ")}` : "Faz todos os serviços";
};

function Editor({ token, inicial, servicos, aoFechar, aoSalvo, aoLimite, aoAcesso }) {
  const novo = !inicial.id;
  const [nome, setNome] = useState(inicial.nome || "");
  const [ativo, setAtivo] = useState(inicial.ativo ?? true);
  const [todos, setTodos] = useState(!inicial.servicos?.length);
  const [marcados, setMarcados] = useState(inicial.servicos || []);
  const [comissao, setComissao] = useState(inicial.comissao_pct != null ? String(Number(inicial.comissao_pct)).replace(".", ",") : "0");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const alternarServico = (c) => setMarcados((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  const valido = nome.trim().length >= 2 && (todos || marcados.length > 0);

  async function salvar() {
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("admin_equipe_salvar", {
        p_token: token,
        p: { id: inicial.id || null, nome: nome.trim(), ativo, servicos: todos ? [] : marcados },
      });
      if (!r.ok) {
        if (r.limite) return aoLimite();
        throw new Error(r.erro);
      }
      const pctNovo = Number(String(comissao).replace(",", ".")) || 0;
      if (!novo && pctNovo !== Number(inicial.comissao_pct || 0)) {
        const c = await rpc("admin_equipe_comissao", { p_token: token, p_equipe: inicial.id, p_pct: pctNovo });
        if (!c.ok) throw new Error(c.erro);
        r.equipe = (r.equipe || []).map((x) => (x.id === inicial.id ? { ...x, comissao_pct: pctNovo } : x));
      }
      aoSalvo(r, novo ? `${nome.trim()} entrou na equipe.` : "Alterações salvas.");
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha folha-alta sv-editor" role="dialog" aria-modal="true" aria-labelledby="eq-titulo" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        <h2 id="eq-titulo" className="folha-titulo">{novo ? "Nova profissional" : "Editar profissional"}</h2>

        <div className="form form-compacto">
          <label htmlFor="eq-nome">Nome que a cliente vê</label>
          <input id="eq-nome" maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Bia" autoFocus={novo} />
        </div>

        {!novo && (
          <div className="form form-compacto">
            <label htmlFor="eq-comissao">Comissão sobre os atendimentos (%)</label>
            <input id="eq-comissao" inputMode="decimal" maxLength={5} value={comissao} onChange={(e) => setComissao(e.target.value.replace(/[^\d,]/g, ""))} placeholder="0" />
            <small className="ms-dica">Usada no painel de Resultados para calcular quanto pagar a ela e quanto fica para o salão. Deixe 0 se ela não ganha comissão.</small>
          </div>
        )}

        <p className="nh-rotulo">Serviços que ela faz</p>
        <div className="eq-servicos">
          <label className="marcar">
            <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} />
            <span>
              Todos os serviços
              <small>Inclui serviços que você criar depois.</small>
            </span>
          </label>
          {!todos &&
            servicos.map((s) => (
              <label key={s.codigo} className="marcar">
                <input type="checkbox" checked={marcados.includes(s.codigo)} onChange={() => alternarServico(s.codigo)} />
                <span>{s.nome}</span>
              </label>
            ))}
          {!todos && marcados.length === 0 && <small className="dica-erro">Marque pelo menos um serviço.</small>}
        </div>

        {!novo && (
          <div className="sv-chaves">
            <Interruptor
              ligado={ativo}
              aoMudar={setAtivo}
              rotulo="Atende pela agenda"
              texto={
                ativo
                  ? "Aparece para as clientes e recebe horários."
                  : inicial.futuros > 0
                    ? `Sai da agenda. ${inicial.futuros === 1 ? "O horário já marcado continua" : `Os ${inicial.futuros} horários já marcados continuam`} na sua lista.`
                    : "Sai da agenda, mas o histórico dela fica guardado."
              }
            />
          </div>
        )}

        {erro && <p className="erro">{erro}</p>}
        <button type="button" className="botao-ouro" disabled={!valido || enviando} onClick={salvar}>
          {enviando ? "Salvando…" : novo ? "Adicionar à equipe" : "Salvar alterações"}
        </button>
        {!novo && <AcessoEquipe token={token} q={inicial} aoMudar={aoAcesso} />}
        <button type="button" className="folha-fechar" onClick={aoFechar}>Fechar</button>
      </div>
    </div>
  );
}

export default function Equipe() {
  const salao = useSalao();
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [dados, setDados] = useState(null);
  const [editar, setEditar] = useState(null);
  const [oferta, setOferta] = useState(null);
  const [aviso, setAviso] = useState("");

  const sair = useCallback(() => {
    limparSessao("admin");
    router.replace("/admin/entrar");
  }, [router]);

  const carregar = useCallback(
    (t) =>
      rpc("admin_equipe", { p_token: t })
        .then(setDados)
        .catch((e) => (sessaoExpirada(e) ? sair() : setAviso("Sem conexão. Tente de novo."))),
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

  const equipe = dados?.equipe || [];
  const servicos = dados?.servicos || [];
  const limite = dados?.limite || 1;
  const ativas = equipe.filter((q) => q.ativo).length;
  const cheia = ativas >= limite;
  const plano = NOME_PLANO[salao.plano] || "";

  function adicionar() {
    if (cheia) return setOferta(ofertaDoLimite(limite));
    setEditar({});
  }

  return (
    <div className="app app-admin">
      <header className="adm-topo">
        <div>
          <p className="c-saudacao">Meu salão</p>
          <h1>Equipe</h1>
        </div>
        <Link href="/agendar" className="barra-link">Ver no app</Link>
      </header>

      <main className="tela">
        <p className="sv-intro">
          Cada profissional tem a sua agenda. Na hora de agendar, a cliente escolhe com quem quer ser atendida, ou deixa o salão
          escolher quem estiver livre.
        </p>

        {dados && (
          <div className="eq-vagas" aria-label={`${ativas} de ${limite} profissionais`}>
            <div className="eq-vagas-barra" aria-hidden="true">
              {Array.from({ length: Math.min(limite, 12) }, (_, i) => (
                <i key={i} className={i < ativas ? "cheia" : ""} />
              ))}
            </div>
            <p>
              <strong>{ativas} de {limite}</strong> {limite === 1 ? "profissional" : "profissionais"}
              {plano ? ` no plano ${plano}` : ""}
            </p>
          </div>
        )}

        <button type="button" className={`botao-linha nova-cliente ${cheia ? "eq-cheia" : ""}`} onClick={adicionar}>
          {cheia ? <IconeCadeado width="18" height="18" /> : <IconeMais width="20" height="20" />}
          {cheia ? "Adicionar mais profissionais" : "Adicionar profissional"}
        </button>

        {!dados ? (
          <p className="bloco-vazio">Carregando a equipe…</p>
        ) : (
          <ul className="sv-lista">
            {equipe.map((q) => (
              <li key={q.id} className={`sv-item vidro ${!q.ativo || q.fora_do_plano ? "sv-oculto" : ""}`}>
                <button type="button" className="sv-linha" onClick={() => setEditar(q)} aria-label={`Editar ${q.nome}`}>
                  <span className="eq-avatar" aria-hidden="true">{iniciais(q.nome)}</span>
                  <span className="sv-texto">
                    <strong>{q.nome}</strong>
                    <small>{textoServicos(q, servicos)}</small>
                    <span className="sv-chips">
                      {!q.ativo ? (
                        <span className="chip chip-apagado">Fora da agenda</span>
                      ) : q.fora_do_plano ? (
                        <span className="chip chip-apagado">Acima do limite do plano</span>
                      ) : (
                        <span className="chip chip-ok">Na agenda</span>
                      )}
                      {Number(q.comissao_pct) > 0 && <span className="chip">Comissão {Number(q.comissao_pct)}%</span>}
                      {q.acesso && (
                        <span className="chip">{q.acesso.ativo ? "Usa o app" : "Link enviado"}</span>
                      )}
                      {q.futuros > 0 && (
                        <span className="chip">{q.futuros} {q.futuros === 1 ? "horário marcado" : "horários marcados"}</span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {equipe.some((q) => q.fora_do_plano) && (
          <p className="ms-dica eq-nota">
            Quem está acima do limite do plano não aparece para as clientes. Tire alguém da agenda ou mude de plano.
          </p>
        )}
      </main>

      <MenuApp quem={{ tipo: "admin" }} />

      {editar && (
        <Editor
          token={token}
          inicial={editar}
          servicos={servicos}
          aoFechar={() => setEditar(null)}
          aoLimite={() => {
            setEditar(null);
            setOferta(ofertaDoLimite(limite));
          }}
          aoSalvo={(r, msg) => {
            setEditar(null);
            setDados(r);
            setAviso(msg);
          }}
          aoAcesso={(msg) => {
            setAviso(msg);
            rpc("admin_equipe", { p_token: token }).then((d) => {
              setDados(d);
              setEditar((e) => (e ? d.equipe.find((x) => x.id === e.id) || e : e));
            }).catch(() => {});
          }}
        />
      )}
      {oferta && <FolhaPlano recurso={oferta.recurso} extra={oferta.extra} aoFechar={() => setOferta(null)} />}
      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  );
}
