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

const MODULOS = [
  ["agenda", "Agenda online", "Clientes marcam horário e pagam o sinal por Pix."],
  ["curso", "Curso", "Página do curso com turmas e inscrições."],
  ["rede", "Rede de profissionais", "Vitrine de certificadas e verificação de certificado."],
  ["promocoes", "Promoções", "Ofertas com data para entrar e sair do ar, com preço no agendamento."],
  ["natal", "Tema de Natal", "Enfeites de dezembro, que somem sozinhos em janeiro."],
];

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

function Folha({ inicial, token, aoFechar, aoSalvo }) {
  const novo = !inicial.id;
  const [f, setF] = useState({
    nome: "", slug: "", dominio: "", ativa: true, paleta: "cafe-ouro", dona_nome: "", dona_email: "",
    modulos: { agenda: true, curso: false, rede: false, promocoes: false, natal: true },
    ...inicial,
    dominio: inicial.dominio || "",
  });
  const [mexeuSlug, setMexeuSlug] = useState(!novo);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(null);
  const muda = (k) => (v) => setF((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));

  async function salvar() {
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("master_empresa_salvar", { p_token: token, p: { ...f, id: f.id || "" } });
      if (!r.ok) throw new Error(r.erro);
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

        <span className="cr-rotulo">O que aparece para esta empresa</span>
        <div className="sv-chaves">
          {MODULOS.map(([k, nome, texto]) => (
            <Interruptor key={k} ligado={Boolean(f.modulos[k])} rotulo={nome} texto={texto}
              aoMudar={(v) => setF((x) => ({ ...x, modulos: { ...x.modulos, [k]: v } }))} />
          ))}
          {!novo && (
            <Interruptor ligado={f.ativa} aoMudar={muda("ativa")} rotulo="App no ar"
              texto={f.ativa ? "Clientes acessam normalmente." : "O app mostra que está fora do ar."} />
          )}
        </div>

        {erro && <p className="erro">{erro}</p>}
        <button type="button" className="botao-ouro" disabled={enviando || f.nome.trim().length < 2 || !f.slug} onClick={salvar}>
          {enviando ? "Salvando…" : novo ? "Criar empresa" : "Salvar"}
        </button>
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
      </dl>
      <p className="emp-modulos">
        {MODULOS.filter(([k]) => e.modulos?.[k]).map(([, nome]) => nome).join(" · ") || "Nenhum módulo ligado"}
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

export default function Master() {
  const router = useRouter();
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
          Cada empresa tem o próprio endereço, clientes, agenda e cores. Ligue só os módulos que ela contratou.
        </p>
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
