"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rpc } from "../../lib/supabase";
import { lerSessao, limparSessao, sessaoExpirada } from "../../lib/sessao";
import { PALETAS, variaveisPaleta } from "../../lib/paletas";
import MenuApp from "../../components/MenuApp";
import Interruptor from "../../components/admin/Interruptor";
import { LogoDe } from "../../components/Empresa";
import { IconeMais } from "../../components/Icones";
import { RECURSOS, NOME_PLANO, precoPlano } from "../../lib/planos";

const SITUACOES = [["teste", "Em teste"], ["ativa", "Ativa"], ["atrasada", "Atrasada"], ["suspensa", "Suspensa"]];
const SIT_CHIP = { teste: "chip-ouro", ativa: "chip-ok", atrasada: "chip-alerta", suspensa: "chip-apagado" };
const dataBr = (iso) => (iso ? String(iso).split("-").reverse().slice(0, 2).join("/") : "");

const apelidoDe = (nome) =>
  nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 40);

function msgDona(r, dona) {
  const url = `https://${r.endereco}/admin/entrar?primeiro=1`;
  return [
    `Oi, ${dona.split(" ")[0]}! Seu app está pronto.`,
    `Endereço: https://${r.endereco}`,
    `Para criar sua senha, entre em ${url} com o seu e-mail e este código: ${r.codigo}`,
    "O código vale por 14 dias.",
  ].join("\n\n");
}

function Folha({ inicial, token, planos, aoFechar, aoSalvo }) {
  const novo = !inicial.id;
  const [f, setF] = useState({
    nome: "", slug: "", dominio: "", ativa: true, paleta: "cafe-ouro", dona_nome: "", dona_email: "",
    modulos: { agenda: true, curso: true, rede: true, promocoes: true, natal: true },
    plano: "essencial", situacao: "teste", teste_ate: "", vence_em: "", cortesias: [], profissionais_extra: 0,
    ...inicial,
    dominio: inicial.dominio || "",
    teste_ate: inicial.teste_ate || "",
    vence_em: inicial.vence_em || "",
    cortesias: inicial.cortesias || [],
  });
  const recPlano = planos.find((p) => p.codigo === f.plano)?.recursos || [];
  const extras = Object.keys(RECURSOS).filter((r) => r !== "agenda" && !r.startsWith("equipe") && !recPlano.includes(r));
  const planoAtual = planos.find((p) => p.codigo === f.plano);
  const [mexeuSlug, setMexeuSlug] = useState(!novo);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(null);
  const muda = (k) => (v) => setF((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));

  async function registrarPagamento() {
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("master_empresa_plano", { p_token: token, p_id: f.id, p: { plano: f.plano, pago: true } });
      if (!r.ok) throw new Error(r.erro);
      aoSalvo(`Pagamento registrado. Vence em ${dataBr(r.vence_em)}.`);
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  async function salvar() {
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("master_empresa_salvar", { p_token: token, p: { ...f, id: f.id || "" } });
      if (!r.ok) throw new Error(r.erro);
      const cort = f.cortesias.filter((c) => !recPlano.includes(c));
      const plano = await rpc("master_empresa_plano", {
        p_token: token,
        p_id: novo ? r.id : f.id,
        p: novo ? { plano: f.plano, cortesias: cort } : { plano: f.plano, situacao: f.situacao, teste_ate: f.teste_ate, vence_em: f.vence_em, cortesias: cort, profissionais_extra: String(f.profissionais_extra || 0) },
      });
      if (!plano.ok) throw new Error(plano.erro);
      if (novo) setPronto(r);
      else aoSalvo("Empresa atualizada.");
    } catch (e) {
      setErro(e.message);
    }
    setEnviando(false);
  }

  if (pronto) {
    const texto = msgDona(pronto, f.dona_nome);
    return (
      <div className="folha-fundo" onClick={() => aoSalvo("Empresa criada.")}>
        <div className="folha" role="dialog" aria-modal="true" aria-labelledby="emp-ok" onClick={(e) => e.stopPropagation()}>
          <span className="folha-alca" aria-hidden="true" />
          <h2 id="emp-ok" className="folha-titulo">{f.nome} criada</h2>
          <p className="emp-endereco">https://{pronto.endereco}</p>
          <div className="emp-codigo">
            <span>Código de primeiro acesso da {f.dona_nome.split(" ")[0]}</span>
            <strong>{pronto.codigo}</strong>
            <small>Vale 14 dias. Ela entra com o e-mail {f.dona_email} e cria a senha.</small>
          </div>
          <a className="botao-ouro" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener">
            Enviar acesso pelo WhatsApp
          </a>
          <button type="button" className="botao-linha" onClick={() => navigator.clipboard?.writeText(texto)}>
            Copiar mensagem
          </button>
          <button type="button" className="folha-fechar" onClick={() => aoSalvo("Empresa criada.")}>Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha folha-alta" role="dialog" aria-modal="true" aria-labelledby="emp-titulo" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        <h2 id="emp-titulo" className="folha-titulo">{novo ? "Nova empresa" : f.nome}</h2>

        <div className="form form-compacto">
          <label htmlFor="emp-nome">Nome da empresa</label>
          <input id="emp-nome" maxLength={60} value={f.nome} placeholder="Ex.: Cílios por Lívia"
            onChange={(e) => { muda("nome")(e); if (!mexeuSlug) setF((x) => ({ ...x, slug: apelidoDe(e.target.value) })); }} />

          <label htmlFor="emp-slug">Apelido no endereço</label>
          <input id="emp-slug" maxLength={40} value={f.slug} autoCapitalize="none"
            onChange={(e) => { setMexeuSlug(true); muda("slug")(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }} />
          <small className="ms-dica">Endereço do app: {f.slug || "apelido"}.tonsdellas.com.br</small>

          <label htmlFor="emp-dom">Domínio próprio (opcional)</label>
          <input id="emp-dom" value={f.dominio} autoCapitalize="none" placeholder="Ex.: ciliosporlivia.com.br" onChange={muda("dominio")} />
          <small className="ms-dica">Só preencha depois que o domínio estiver apontado para a Vercel.</small>

          {novo && (
            <>
              <label htmlFor="emp-dona">Nome da dona</label>
              <input id="emp-dona" maxLength={60} value={f.dona_nome} onChange={muda("dona_nome")} placeholder="Ex.: Lívia Souza" />
              <label htmlFor="emp-email">E-mail da dona</label>
              <input id="emp-email" type="email" autoCapitalize="none" value={f.dona_email} onChange={muda("dona_email")} placeholder="ela@email.com" />
            </>
          )}
        </div>

        {novo && (
          <>
            <span className="cr-rotulo">Paleta inicial</span>
            <div className="ms-paletas" role="radiogroup" aria-label="Paleta inicial">
              {Object.entries(PALETAS).map(([k, p]) => (
                <button key={k} type="button" role="radio" aria-checked={f.paleta === k} className="ms-paleta" onClick={() => muda("paleta")(k)}>
                  <span className="ms-amostra" style={{ background: p.fundo }} aria-hidden="true">
                    <i style={{ background: variaveisPaleta(k)["--folha-ouro"] }} />
                    <i style={{ background: p.acento2 }} />
                    <b style={{ color: p.texto }}>Aa</b>
                  </span>
                  <span>{p.nome}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <span className="cr-rotulo">Plano</span>
        <div className="ordenar emp-planos" role="radiogroup" aria-label="Plano">
          {planos.map((p) => (
            <button key={p.codigo} type="button" role="radio" aria-checked={f.plano === p.codigo} aria-pressed={f.plano === p.codigo} onClick={() => muda("plano")(p.codigo)}>
              {p.nome} · {precoPlano(p.preco)}
            </button>
          ))}
        </div>
        {novo && <small className="ms-dica">Começa com 30 dias de teste grátis com os recursos do Profissional.</small>}

        {!novo && (
          <div className="form form-compacto">
            <label htmlFor="emp-sit">Situação</label>
            <select id="emp-sit" value={f.situacao} onChange={muda("situacao")}>
              {SITUACOES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
            <div className="duas">
              <div>
                <label htmlFor="emp-teste">Teste até</label>
                <input id="emp-teste" type="date" value={f.teste_ate} onChange={muda("teste_ate")} />
              </div>
              <div>
                <label htmlFor="emp-vence">Vence em</label>
                <input id="emp-vence" type="date" value={f.vence_em} onChange={muda("vence_em")} />
              </div>
            </div>
            <small className="ms-dica">Sem data de vencimento, o salão não sai do ar sozinho (cortesia).</small>
            {planoAtual?.extra_profissional > 0 && (
              <>
                <label htmlFor="emp-extra">Profissionais extras ({precoPlano(planoAtual.extra_profissional)} cada)</label>
                <input id="emp-extra" inputMode="numeric" value={f.profissionais_extra}
                  onChange={(e) => muda("profissionais_extra")(e.target.value.replace(/\D/g, "").slice(0, 2))} />
                <small className="ms-dica">
                  Equipe de até {planoAtual.profissionais + Number(f.profissionais_extra || 0)} profissionais
                  {Number(f.profissionais_extra) > 0 ? ` · mensalidade ${precoPlano(Number(planoAtual.preco) + Number(planoAtual.extra_profissional) * Number(f.profissionais_extra))}` : ""}.
                </small>
              </>
            )}
          </div>
        )}

        {extras.length > 0 && (
          <>
            <span className="cr-rotulo">Cortesias (além do plano)</span>
            <div className="sv-chaves">
              {extras.map((r) => (
                <Interruptor key={r} ligado={f.cortesias.includes(r)} rotulo={RECURSOS[r].nome}
                  texto={`Normalmente no plano ${NOME_PLANO[RECURSOS[r].plano]}`}
                  aoMudar={(v) => setF((x) => ({ ...x, cortesias: v ? [...x.cortesias, r] : x.cortesias.filter((c) => c !== r) }))} />
              ))}
            </div>
          </>
        )}

        <div className="sv-chaves">
          {!novo && (
            <Interruptor ligado={f.ativa} aoMudar={muda("ativa")} rotulo="App no ar"
              texto={f.ativa ? "Clientes acessam normalmente." : "O app mostra que está fora do ar."} />
          )}
        </div>

        {erro && <p className="erro">{erro}</p>}
        <button type="button" className="botao-ouro" disabled={enviando || f.nome.trim().length < 2 || !f.slug} onClick={salvar}>
          {enviando ? "Salvando…" : novo ? "Criar empresa" : "Salvar"}
        </button>
        {!novo && (
          <button type="button" className="botao-linha emp-pago" disabled={enviando} onClick={registrarPagamento}>
            Registrar pagamento de 1 mês ({NOME_PLANO[f.plano]})
          </button>
        )}
        <button type="button" className="folha-fechar" onClick={aoFechar}>Fechar</button>
      </div>
    </div>
  );
}

function Empresa({ e, aoEditar, aoNovoAcesso }) {
  const dona = e.donas[0];
  return (
    <li className="emp-item vidro">
      <div className="emp-topo">
        <LogoDe salao={{ nome: e.nome, logo: e.logo }} tamanho={46} />
        <span className="emp-nome">
          <strong>{e.nome}</strong>
          <a href={`https://${e.endereco}`} target="_blank" rel="noopener">{e.endereco}</a>
        </span>
        <span className={`chip ${e.ativa ? "chip-ok" : "chip-apagado"}`}>{e.ativa ? "No ar" : "Fora do ar"}</span>
      </div>
      <dl className="emp-numeros">
        <div><dt>Clientes</dt><dd>{e.clientes}</dd></div>
        <div><dt>Agendamentos 30 dias</dt><dd>{e.agendamentos_30d}</dd></div>
        <div><dt>Serviços</dt><dd>{e.servicos}</dd></div>
        {e.limite_equipe != null && <div><dt>Equipe</dt><dd>{e.equipe_ativa} de {e.limite_equipe}</dd></div>}
      </dl>
      <p className="emp-modulos">
        <span className="chip chip-ouro">{NOME_PLANO[e.plano] || e.plano}</span>
        <span className={`chip ${SIT_CHIP[e.situacao] || ""}`}>
          {e.situacao === "teste" ? `Teste até ${dataBr(e.teste_ate)}` : e.situacao === "ativa" ? (e.vence_em ? `Ativa até ${dataBr(e.vence_em)}` : "Ativa") : e.situacao === "atrasada" ? `Atrasada desde ${dataBr(e.vence_em)}` : "Suspensa"}
        </span>
        {e.cortesias?.length > 0 && <span className="chip">+{e.cortesias.length} cortesia{e.cortesias.length > 1 ? "s" : ""}</span>}
      </p>
      {dona && (
        <p className="emp-dona">
          {dona.nome} · {dona.email} · {dona.tem_senha ? "senha criada" : "aguardando primeiro acesso"}
        </p>
      )}
      <div className="emp-acoes">
        <button type="button" className="acao" onClick={aoEditar}>Editar</button>
        {dona && <button type="button" className="acao acao-sutil" onClick={() => aoNovoAcesso(e, dona)}>Novo código da dona</button>}
      </div>
    </li>
  );
}

// Preços dos planos e WhatsApp de vendas
function PlanosPrecos({ token, dados, aoSalvo }) {
  const [aberto, setAberto] = useState(false);
  const [precos, setPrecos] = useState({});
  const [whats, setWhats] = useState("");
  const [erro, setErro] = useState("");
  useEffect(() => {
    if (!dados) return;
    setPrecos(Object.fromEntries(dados.planos.map((p) => [p.codigo, String(p.preco).replace(".", ",")])));
    setWhats(dados.whatsapp || "");
  }, [dados]);
  async function salvar() {
    setErro("");
    try {
      const r = await rpc("master_planos_salvar", {
        p_token: token,
        p: { planos: Object.entries(precos).map(([codigo, preco]) => ({ codigo, preco: preco || "0" })), whatsapp: whats },
      });
      if (!r.ok) throw new Error(r.erro);
      aoSalvo(r);
      setAberto(false);
    } catch (e) {
      setErro(e.message);
    }
  }
  if (!dados) return null;
  return (
    <section className="emp-precos vidro">
      <button type="button" className="emp-precos-topo" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
        <span>
          <strong>Planos e preços</strong>
          <small>{dados.planos.map((p) => `${p.nome} ${precoPlano(p.preco)}`).join(" · ")}</small>
        </span>
        <span aria-hidden="true">{aberto ? "−" : "+"}</span>
      </button>
      {aberto && (
        <div className="form form-compacto">
          {dados.planos.map((p) => (
            <div key={p.codigo}>
              <label htmlFor={`pp-${p.codigo}`}>{p.nome} (R$ por mês)</label>
              <input id={`pp-${p.codigo}`} inputMode="decimal" value={precos[p.codigo] || ""} onChange={(e) => setPrecos((x) => ({ ...x, [p.codigo]: e.target.value.replace(/[^\d,.]/g, "") }))} />
            </div>
          ))}
          <label htmlFor="pp-whats">WhatsApp de vendas</label>
          <input id="pp-whats" inputMode="tel" value={whats} onChange={(e) => setWhats(e.target.value)} placeholder="(85) 99999-9999" />
          <small className="ms-dica">Para onde vão os botões “Quero este plano” de todos os salões e da página de planos.</small>
          {erro && <p className="erro">{erro}</p>}
          <button type="button" className="botao-ouro" onClick={salvar}>Salvar preços</button>
        </div>
      )}
    </section>
  );
}

// Cobrança automática: liga o app à conta do Mercado Pago do Tony
function Cobranca({ token, aoAviso }) {
  const [info, setInfo] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [chave, setChave] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    if (token) rpc("master_cobranca_info", { p_token: token }).then(setInfo).catch(() => {});
  }, [token]);
  async function salvar(p) {
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("master_cobranca_salvar", { p_token: token, p });
      if (!r.ok) throw new Error(r.erro);
      setInfo(r);
      setChave("");
      aoAviso(p.desligar ? "Cobrança pelo app desligada." : "Mercado Pago conectado.");
      if (!p.desligar) setAberto(false);
    } catch (e) {
      setErro(e.message);
    }
    setEnviando(false);
  }
  if (!info) return null;
  return (
    <section className="emp-precos vidro">
      <button type="button" className="emp-precos-topo" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
        <span>
          <strong>Mensalidades pelo Mercado Pago</strong>
          <small>
            {info.ativa
              ? `Ligado${info.conta ? ` · ${info.conta}` : ""} · recebido este mês ${precoPlano(info.mes || 0)}`
              : "Desligado: as donas pagam pelo seu WhatsApp"}
          </small>
        </span>
        <span aria-hidden="true">{aberto ? "−" : "+"}</span>
      </button>
      {aberto && (
        <div className="form form-compacto">
          {info.teste && <p className="erro">Você conectou uma chave de TESTE: os pagamentos não são de verdade.</p>}
          <label htmlFor="mp-chave">{info.ativa ? "Trocar a chave (Access Token)" : "Access Token do Mercado Pago"}</label>
          <input id="mp-chave" type="password" autoComplete="off" value={chave} onChange={(e) => setChave(e.target.value.trim())} placeholder="APP_USR-..." />
          <small className="ms-dica">
            No Mercado Pago: Suas integrações → sua aplicação → Credenciais de produção → Access Token. A chave fica guardada
            só no banco de dados e nunca aparece no app.
          </small>
          {erro && <p className="erro">{erro}</p>}
          <button type="button" className="botao-ouro" disabled={enviando || chave.length < 20} onClick={() => salvar({ chave })}>
            {enviando ? "Conferindo…" : "Conectar Mercado Pago"}
          </button>
          {info.ativa && (
            <button type="button" className="botao-linha" disabled={enviando} onClick={() => salvar({ desligar: true })}>
              Desligar cobrança pelo app
            </button>
          )}
          {info.recebidas?.length > 0 && (
            <>
              <span className="cr-rotulo">Últimos pagamentos</span>
              <ul className="emp-recebidas">
                {info.recebidas.map((r, i) => (
                  <li key={i}>
                    <span>{r.empresa}<small>{NOME_PLANO[r.plano] || r.plano} · {new Date(r.pago_em).toLocaleDateString("pt-BR")}</small></span>
                    <strong>{precoPlano(r.valor)}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default function Master() {
  const router = useRouter();
  const [planos, setPlanos] = useState(null);
  const [token, setToken] = useState(null);
  const [lista, setLista] = useState(null);
  const [editar, setEditar] = useState(null);
  const [acesso, setAcesso] = useState(null);
  const [aviso, setAviso] = useState("");

  const sair = useCallback(() => {
    limparSessao("admin");
    router.replace("/admin/entrar");
  }, [router]);

  const carregar = useCallback(
    (t) => rpc("master_empresas", { p_token: t }).then(setLista).catch((e) => (sessaoExpirada(e) ? sair() : setAviso("Sem conexão. Tente de novo."))),
    [sair]
  );

  useEffect(() => {
    const s = lerSessao("admin");
    if (!s?.token) return router.replace("/admin/entrar");
    if (s.papel && s.papel !== "master") return router.replace("/admin");
    setToken(s.token);
    carregar(s.token);
    rpc("planos_publicos").then(setPlanos).catch(() => {});
  }, [router, carregar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 3200);
    return () => clearTimeout(t);
  }, [aviso]);

  async function novoAcesso(e, dona) {
    try {
      const r = await rpc("master_novo_acesso", { p_token: token, p_email: dona.email });
      if (!r.ok) throw new Error(r.erro);
      setAcesso({ ...r, endereco: e.endereco, nome: dona.nome, email: dona.email });
      carregar(token);
    } catch (err) {
      sessaoExpirada(err) ? sair() : setAviso(err.message);
    }
  }

  return (
    <div className="app app-admin">
      <header className="adm-topo">
        <div>
          <p className="c-saudacao">Master</p>
          <h1>Empresas</h1>
        </div>
        <Link href="/admin" className="barra-link">Painel</Link>
      </header>

      <main className="tela">
        <p className="sv-intro">
          Cada empresa tem o próprio endereço, clientes, agenda e cores. O plano define o que ela usa; cortesias liberam extras.
        </p>
        <PlanosPrecos token={token} dados={planos} aoSalvo={(r) => { setPlanos(r); setAviso("Preços salvos."); }} />
        <Cobranca token={token} aoAviso={setAviso} />
        <button type="button" className="botao-linha nova-cliente" onClick={() => setEditar({})}>
          <IconeMais width="20" height="20" /> Nova empresa
        </button>

        {lista === null ? (
          <p className="bloco-vazio">Carregando empresas…</p>
        ) : (
          <ul className="emp-lista">
            {lista.map((e) => (
              <Empresa key={e.id} e={e} aoEditar={() => setEditar(e)} aoNovoAcesso={novoAcesso} />
            ))}
          </ul>
        )}
      </main>

      <MenuApp quem={{ tipo: "admin" }} />

      {editar && (
        <Folha
          token={token}
          planos={planos?.planos || []}
          inicial={editar}
          aoFechar={() => setEditar(null)}
          aoSalvo={(msg) => {
            setEditar(null);
            setAviso(msg);
            carregar(token);
          }}
        />
      )}

      {acesso && (
        <div className="folha-fundo" onClick={() => setAcesso(null)}>
          <div className="folha" role="dialog" aria-modal="true" aria-labelledby="emp-acesso" onClick={(e) => e.stopPropagation()}>
            <span className="folha-alca" aria-hidden="true" />
            <h2 id="emp-acesso" className="folha-titulo">Novo código para {acesso.nome.split(" ")[0]}</h2>
            <div className="emp-codigo">
              <span>Código de primeiro acesso</span>
              <strong>{acesso.codigo}</strong>
              <small>A senha antiga deixou de valer. Ela entra com {acesso.email} e cria uma nova.</small>
            </div>
            <a className="botao-ouro" href={`https://wa.me/?text=${encodeURIComponent(msgDona(acesso, acesso.nome))}`} target="_blank" rel="noopener">
              Enviar pelo WhatsApp
            </a>
            <button type="button" className="folha-fechar" onClick={() => setAcesso(null)}>Fechar</button>
          </div>
        </div>
      )}
      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  );
}
