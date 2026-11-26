"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rpc } from "../../../lib/supabase";
import { real, celularFormatado, mascaraCelular, dataCompleta, FUSO } from "../../../lib/formato";
import { primeiroNome } from "../../../lib/agenda";
import { lerSessao, limparSessao, sessaoExpirada } from "../../../lib/sessao";
import { EXPERIENCIA, STATUS_INSCRICAO, periodoTurma, instagramUrl } from "../../../lib/curso";
import MenuApp from "../../../components/MenuApp";
import { IconeConversa, IconeMais, IconeCalendario, IconeCoroa } from "../../../components/Icones";
import { useSalao } from "../../../components/Empresa";

const quando = (d) => new Date(d).toLocaleDateString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "short" }).replace(".", "");
const whats = (cel, t) => `https://wa.me/55${cel}?text=${encodeURIComponent(t)}`;
const FILTROS = { nova: "Novas", contatada: "Contatadas", matriculada: "Matriculadas", todas: "Todas" };

function Campo({ id, rotulo, ...p }) {
  return (
    <>
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} {...p} />
    </>
  );
}

function FolhaTurma({ inicial, token, aoFechar, aoSalvar }) {
  const [t, setT] = useState({ nome: "", data_inicio: "", data_fim: "", horario: "8h às 17h", cidade: "Fortaleza", local: "", vagas: 6, valor: "", aberta: true, ...inicial });
  const [erro, setErro] = useState("");
  const muda = (k) => (e) => setT({ ...t, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  async function salvar() {
    setErro("");
    const r = await rpc("admin_turma_salvar", { p_token: token, p: { ...t, valor: t.valor === "" ? null : t.valor } }).catch((e) => ({ ok: false, erro: e.message }));
    if (!r.ok) return setErro(r.erro);
    aoSalvar(`Turma ${r.turma.nome} salva`);
  }
  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha folha-alta" role="dialog" aria-modal="true" aria-labelledby="ft" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        <h2 id="ft" className="folha-titulo">{t.id ? "Editar turma" : "Nova turma"}</h2>
        <div className="form form-compacto">
          <Campo id="t-nome" rotulo="Nome da turma" value={t.nome} onChange={muda("nome")} placeholder="Ex.: Turma de Fevereiro" />
          <div className="duas">
            <div><Campo id="t-ini" rotulo="Primeiro dia" type="date" value={t.data_inicio} onChange={muda("data_inicio")} /></div>
            <div><Campo id="t-fim" rotulo="Último dia" type="date" value={t.data_fim || ""} onChange={muda("data_fim")} /></div>
          </div>
          <Campo id="t-hor" rotulo="Horário" value={t.horario || ""} onChange={muda("horario")} />
          <div className="duas">
            <div><Campo id="t-cid" rotulo="Cidade" value={t.cidade} onChange={muda("cidade")} /></div>
            <div><Campo id="t-vag" rotulo="Vagas" type="number" min="1" max="60" value={t.vagas} onChange={muda("vagas")} /></div>
          </div>
          <Campo id="t-loc" rotulo="Local (opcional)" value={t.local || ""} onChange={muda("local")} />
          <Campo id="t-val" rotulo="Valor em R$ (vazio = sob consulta)" inputMode="decimal" value={t.valor ?? ""} onChange={muda("valor")} />
        </div>
        <label className="marcar">
          <input type="checkbox" checked={t.aberta} onChange={muda("aberta")} />
          <span>Inscrições abertas<small>{t.aberta ? "Aparece na página do curso com o formulário." : "Fica escondida do público."}</small></span>
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button type="button" className="botao-ouro" disabled={!t.nome || !t.data_inicio} onClick={salvar}>Salvar turma</button>
        <button type="button" className="folha-fechar" onClick={aoFechar}>Fechar</button>
      </div>
    </div>
  );
}

function FolhaPro({ inicial, turmas, token, aoFechar, aoSalvar }) {
  const [p, setP] = useState({ nome: "", cidade: "", uf: "CE", instagram: "", whatsapp: "", bio: "", turma_id: "", certificar: true, publicada: true, ...inicial });
  const [erro, setErro] = useState("");
  const muda = (k) => (e) => setP({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const jaCertificada = Boolean(inicial?.codigo);
  async function salvar() {
    setErro("");
    const r = await rpc("admin_profissional_salvar", { p_token: token, p: { ...p, whatsapp: String(p.whatsapp || "").replace(/\D/g, "") } }).catch((e) => ({ ok: false, erro: e.message }));
    if (!r.ok) return setErro(r.erro);
    aoSalvar(r.profissional.codigo ? `${primeiroNome(r.profissional.nome)} certificada · ${r.profissional.codigo}` : "Profissional salva");
  }
  return (
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha folha-alta" role="dialog" aria-modal="true" aria-labelledby="fp" onClick={(e) => e.stopPropagation()}>
        <span className="folha-alca" aria-hidden="true" />
        <h2 id="fp" className="folha-titulo">{p.id ? "Editar profissional" : "Certificar aluna"}</h2>
        <div className="form form-compacto">
          <Campo id="p-nome" rotulo="Nome completo" value={p.nome} onChange={muda("nome")} />
          <div className="duas">
            <div><Campo id="p-cid" rotulo="Cidade" value={p.cidade} onChange={muda("cidade")} /></div>
            <div><Campo id="p-uf" rotulo="UF" maxLength={2} value={p.uf} onChange={(e) => setP({ ...p, uf: e.target.value.toUpperCase() })} /></div>
          </div>
          <Campo id="p-ig" rotulo="Instagram (sem @)" value={p.instagram || ""} onChange={muda("instagram")} autoCapitalize="none" />
          <Campo id="p-wa" rotulo="WhatsApp" inputMode="numeric" value={mascaraCelular(String(p.whatsapp || ""))} onChange={(e) => setP({ ...p, whatsapp: e.target.value })} />
          <label htmlFor="p-bio">Frase curta (aparece na vitrine)</label>
          <textarea id="p-bio" rows={2} maxLength={280} value={p.bio || ""} onChange={muda("bio")} />
          <label htmlFor="p-tur">Turma</label>
          <select id="p-tur" value={p.turma_id || ""} onChange={muda("turma_id")}>
            <option value="">Curso VIP / sem turma</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome} · {periodoTurma(t)}</option>)}
          </select>
        </div>
        {!jaCertificada && (
          <label className="marcar">
            <input type="checkbox" checked={p.certificar} onChange={muda("certificar")} />
            <span>Emitir certificado agora<small>Gera o código único e o PDF.</small></span>
          </label>
        )}
        <label className="marcar">
          <input type="checkbox" checked={p.publicada} onChange={muda("publicada")} />
          <span>Mostrar na vitrine da Rede<small>Só aparece se tiver certificado.</small></span>
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button type="button" className="botao-ouro" disabled={!p.nome || !p.cidade} onClick={salvar}>{jaCertificada ? "Salvar" : p.certificar ? "Certificar" : "Salvar"}</button>
        <button type="button" className="folha-fechar" onClick={aoFechar}>Fechar</button>
      </div>
    </div>
  );
}

export default function AdminCurso() {
  const salao = useSalao();
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [d, setD] = useState(null);
  const [aba, setAba] = useState("inscricoes");
  const [filtro, setFiltro] = useState("nova");
  const [folha, setFolha] = useState(null);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback((tk) =>
    rpc("admin_curso", { p_token: tk }).then(setD).catch((e) => {
      if (sessaoExpirada(e)) { limparSessao("admin"); router.replace("/admin/entrar"); }
    }), [router]);

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

  if (!d) return <div className="app"><main className="tela carregando-tela"><span className="pulso" aria-label="Carregando" /></main></div>;

  const novas = d.inscricoes.filter((i) => i.status === "nova").length;
  const inscricoes = d.inscricoes.filter((i) => filtro === "todas" || i.status === filtro);
  const salvo = (msg) => { setFolha(null); setAviso(msg); carregar(token); };

  async function status(i, st) {
    const r = await rpc("admin_inscricao_status", { p_token: token, p_id: i.id, p_status: st }).catch(() => ({ ok: false }));
    setAviso(r.ok ? `${primeiroNome(i.nome)}: ${STATUS_INSCRICAO[st].texto.toLowerCase()}` : "Não foi possível salvar.");
    carregar(token);
  }
  async function publicar(p, v) {
    await rpc("admin_profissional_salvar", { p_token: token, p: { ...p, turma_id: d.turmas.find((t) => t.nome === p.turma)?.id || "", publicada: v } });
    setAviso(v ? `${primeiroNome(p.nome)} aparece na vitrine` : `${primeiroNome(p.nome)} saiu da vitrine`);
    carregar(token);
  }

  return (
    <div className="app app-admin">
      <header className="adm-topo">
        <div>
          <p className="c-saudacao">{salao.curso.nome}</p>
          <h1>Curso e Rede</h1>
        </div>
        <Link href="/curso" className="barra-link">Ver página</Link>
      </header>
      <main className="tela">
        <section className="kpis" aria-label="Resumo do curso">
          <button type="button" className={`kpi vidro ${novas ? "kpi-alerta" : ""}`} onClick={() => { setAba("inscricoes"); setFiltro("nova"); }}>
            <span>Inscrições novas</span><strong>{novas}</strong><small>aguardando contato</small>
          </button>
          <button type="button" className="kpi vidro" onClick={() => setAba("rede")}>
            <span>Certificadas</span><strong>{d.profissionais.filter((p) => p.codigo).length}</strong><small>{salao.slug === "rica" ? "na Rede Método Rica" : "na rede de profissionais"}</small>
          </button>
        </section>

        <nav className="segmento segmento-3" aria-label="Seções">
          {[["inscricoes", "Inscrições", novas], ["turmas", "Turmas", 0], ["rede", "Rede", 0]].map(([k, t, n]) => (
            <button key={k} type="button" aria-pressed={aba === k} onClick={() => setAba(k)}>{t}{n > 0 && <i>{n}</i>}</button>
          ))}
        </nav>

        {aba === "inscricoes" && (
          <section className="adm-secao">
            <div className="ordenar" role="group" aria-label="Filtrar inscrições">
              {Object.entries(FILTROS).map(([k, t]) => <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{t}</button>)}
            </div>
            {inscricoes.length === 0 ? <p className="bloco-vazio">Nenhuma inscrição aqui.</p> : (
              <ul className="cl-lista">
                {inscricoes.map((i) => {
                  const st = STATUS_INSCRICAO[i.status];
                  return (
                    <li key={i.id} className="insc vidro">
                      <div className="insc-topo">
                        <span className={`insc-tipo ${i.tipo === "vip" ? "insc-vip" : ""}`}>{i.tipo === "vip" ? <><IconeCoroa stroke="currentColor" width="14" height="14" /> VIP</> : i.turma || "Turma"}</span>
                        <span className={`chip ${st.classe}`}>{st.texto}</span>
                      </div>
                      <strong className="insc-nome">{i.nome}{i.demo && <em className="selo-exemplo">exemplo</em>}</strong>
                      <small className="insc-meta">{[i.cidade, EXPERIENCIA[i.experiencia], `pediu em ${quando(i.criado_em)}`].filter(Boolean).join(" · ")}</small>
                      {i.mensagem && <p className="insc-msg">“{i.mensagem}”</p>}
                      <div className="insc-acoes">
                        {i.demo ? <span className="acao acao-off">WhatsApp (exemplo)</span> : (
                          <a className="acao acao-forte" href={whats(i.celular, `Oi, ${primeiroNome(i.nome)}! Aqui é ${salao.contato !== salao.nome ? `a ${salao.contato}, da ` : "a equipe da "}${salao.nome}. Recebi seu pedido do ${i.tipo === "vip" ? "curso VIP" : `curso (${i.turma})`}.`)} target="_blank" rel="noopener" onClick={() => i.status === "nova" && status(i, "contatada")}>
                            <IconeConversa stroke="currentColor" width="18" height="18" /> {celularFormatado(i.celular)}
                          </a>
                        )}
                        {i.status !== "matriculada" && <button type="button" className="acao" onClick={() => status(i, "matriculada")}>Matricular</button>}
                        {i.status === "matriculada" && <button type="button" className="acao" onClick={() => setFolha({ tipo: "pro", dados: { nome: i.nome, cidade: i.cidade || "", turma_id: i.turma_id || "" } })}>Certificar</button>}
                        {i.status !== "desistiu" && <button type="button" className="acao acao-sutil" onClick={() => status(i, "desistiu")}>Desistiu</button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {aba === "turmas" && (
          <section className="adm-secao">
            <button type="button" className="botao-linha" onClick={() => setFolha({ tipo: "turma", dados: {} })}><IconeMais width="20" height="20" /> Nova turma</button>
            {d.turmas.length === 0 ? <p className="bloco-vazio">Crie a primeira turma. Com inscrições abertas, ela aparece na página do curso.</p> : (
              <ul className="cl-lista">
                {d.turmas.map((t) => (
                  <li key={t.id} className="turma-adm vidro">
                    <div className="insc-topo">
                      <span className="turma-data"><IconeCalendario width="18" height="18" /> {periodoTurma(t)}</span>
                      <span className={`chip ${t.aberta ? "chip-ok" : "chip-apagado"}`}>{t.aberta ? "Inscrições abertas" : "Fechada"}</span>
                    </div>
                    <strong className="insc-nome">{t.nome}{t.demo && <em className="selo-exemplo">exemplo</em>}</strong>
                    <small className="insc-meta">{[t.horario, t.local, t.cidade, t.valor ? real(t.valor) : "valor sob consulta"].filter(Boolean).join(" · ")}</small>
                    <div className="turma-barra" aria-label={`${t.ocupadas} de ${t.vagas} vagas`}>
                      <span style={{ width: `${Math.min(100, (t.ocupadas / t.vagas) * 100)}%` }} />
                    </div>
                    <small className="insc-meta">{t.ocupadas} de {t.vagas} vagas · {t.interessadas} {t.interessadas === 1 ? "interessada" : "interessadas"}</small>
                    <div className="insc-acoes">
                      <button type="button" className="acao" onClick={() => setFolha({ tipo: "turma", dados: t })}>Editar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {aba === "rede" && (
          <section className="adm-secao">
            <button type="button" className="botao-linha" onClick={() => setFolha({ tipo: "pro", dados: {} })}><IconeMais width="20" height="20" /> Certificar aluna</button>
            <Link href="/rede" className="link-claro rede-ver">Ver a vitrine como as clientes veem</Link>
            <ul className="cl-lista">
              {d.profissionais.map((p) => (
                <li key={p.id} className="insc vidro">
                  <div className="insc-topo">
                    <span className="insc-tipo">{p.codigo || "Sem certificado"}</span>
                    <span className={`chip ${p.publicada ? "chip-ok" : "chip-apagado"}`}>{p.publicada ? "Na vitrine" : "Oculta"}</span>
                  </div>
                  <strong className="insc-nome">{p.nome}{p.demo && <em className="selo-exemplo">exemplo</em>}</strong>
                  <small className="insc-meta">{[`${p.cidade} · ${p.uf}`, p.turma, p.certificada_em && `certificada em ${dataCompleta(p.certificada_em)}`].filter(Boolean).join(" · ")}</small>
                  <div className="insc-acoes">
                    {p.codigo && <a className="acao acao-forte" href={`/certificado/${p.codigo}/pdf`} target="_blank" rel="noopener">Certificado PDF</a>}
                    {p.codigo && <button type="button" className="acao" onClick={() => publicar(p, !p.publicada)}>{p.publicada ? "Tirar da vitrine" : "Mostrar na vitrine"}</button>}
                    <button type="button" className="acao acao-sutil" onClick={() => setFolha({ tipo: "pro", dados: { ...p, turma_id: d.turmas.find((t) => t.nome === p.turma)?.id || "" } })}>Editar</button>
                    {p.instagram && !p.demo && <a className="acao acao-sutil" href={instagramUrl(p.instagram)} target="_blank" rel="noopener">Instagram</a>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <MenuApp quem={{ tipo: "admin" }} />
      {folha?.tipo === "turma" && <FolhaTurma inicial={folha.dados} token={token} aoFechar={() => setFolha(null)} aoSalvar={salvo} />}
      {folha?.tipo === "pro" && <FolhaPro inicial={folha.dados} turmas={d.turmas} token={token} aoFechar={() => setFolha(null)} aoSalvar={salvo} />}
      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  );
}
