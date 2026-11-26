"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rpc } from "../../../lib/supabase";
import { lerSessao, limparSessao, sessaoExpirada } from "../../../lib/sessao";
import { PALETAS, aplicarPaleta, variaveisPaleta, corValida } from "../../../lib/paletas";
import { prepararImagem } from "../../../lib/imagem";
import MenuApp from "../../../components/MenuApp";
import { LogoDe } from "../../../components/Empresa";

const DIAS = [
  [1, "Segunda"], [2, "Terça"], [3, "Quarta"], [4, "Quinta"], [5, "Sexta"], [6, "Sábado"], [0, "Domingo"],
];

const HORAS = Array.from({ length: 36 }, (_, i) => {
  const m = 6 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});
const rotuloHora = (h) => h.replace(":00", "h").replace(":30", "h30").replace(/^0/, "");

function Hora({ valor, rotulo, invalido, aoMudar }) {
  const lista = HORAS.includes(valor) ? HORAS : [valor, ...HORAS].sort();
  return (
    <select aria-label={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value)} aria-invalid={invalido || undefined}>
      {lista.map((h) => <option key={h} value={h}>{rotuloHora(h)}</option>)}
    </select>
  );
}

const celularVisivel = (d) => {
  const n = String(d || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (n.length < 10) return n;
  return `(${n.slice(0, 2)}) ${n.slice(2, n.length - 4)}-${n.slice(-4)}`;
};

function Bloco({ titulo, texto, children }) {
  return (
    <section className="ms-bloco vidro">
      <h2>{titulo}</h2>
      {texto && <p className="ms-texto">{texto}</p>}
      {children}
    </section>
  );
}

function Campo({ id, rotulo, dica, area, ...p }) {
  return (
    <>
      <label htmlFor={id}>{rotulo}</label>
      {area ? <textarea id={id} rows={2} {...p} /> : <input id={id} {...p} />}
      {dica && <small className="ms-dica">{dica}</small>}
    </>
  );
}

function Foto({ tipo, atual, token, aoEnviar, nome }) {
  const entrada = useRef(null);
  const [estado, setEstado] = useState("");
  async function escolher(e) {
    const arq = e.target.files?.[0];
    e.target.value = "";
    if (!arq) return;
    setEstado("Enviando…");
    try {
      const img = await prepararImagem(arq, tipo);
      const r = await rpc("admin_arquivo_salvar", { p_token: token, p_tipo: tipo, p_mime: img.mime, p_base64: img.base64 });
      if (!r.ok) throw new Error(r.erro);
      setEstado("");
      aoEnviar(r.url);
    } catch (err) {
      setEstado(err.message || "Não foi possível enviar.");
    }
  }
  const capa = tipo === "capa";
  return (
    <div className={`ms-foto ${capa ? "ms-foto-capa" : "ms-foto-logo"}`}>
      <button type="button" className="ms-foto-quadro" onClick={() => entrada.current?.click()} aria-label={capa ? "Trocar foto de capa" : "Trocar logo"}>
        {atual ? (
          <img src={atual} alt="" />
        ) : capa ? (
          <span className="ms-foto-vazia">Sem foto<br />Toque para enviar</span>
        ) : (
          <LogoDe salao={{ nome, logo: null }} tamanho={88} />
        )}
      </button>
      <div className="ms-foto-texto">
        <strong>{capa ? "Foto de capa" : "Logo"}</strong>
        <small>
          {capa
            ? "Aparece na entrada do app e na página do salão. Foto em pé, de preferência com a dona ou o salão."
            : "Aparece no topo, nos recibos e nos certificados. Use a imagem com fundo transparente, se tiver."}
        </small>
        <button type="button" className="acao" onClick={() => entrada.current?.click()}>
          {atual ? "Trocar imagem" : "Enviar imagem"}
        </button>
        {estado && <small className={estado === "Enviando…" ? "ms-dica" : "dica-erro"}>{estado}</small>}
      </div>
      <input ref={entrada} type="file" accept="image/*" hidden onChange={escolher} />
    </div>
  );
}

function Paletas({ paleta, cor, aoMudar }) {
  const livre = corValida(cor);
  return (
    <>
      <div className="ms-paletas" role="radiogroup" aria-label="Paleta de cores">
        {Object.entries(PALETAS).map(([k, p]) => {
          const v = variaveisPaleta(k);
          return (
            <button key={k} type="button" role="radio" aria-checked={paleta === k} className="ms-paleta" onClick={() => aoMudar(k, cor)}>
              <span className="ms-amostra" style={{ background: p.fundo }} aria-hidden="true">
                <i style={{ background: v["--folha-ouro"] }} />
                <i style={{ background: p.acento2 }} />
                <b style={{ color: p.texto }}>Aa</b>
              </span>
              <span>{p.nome}</span>
            </button>
          );
        })}
      </div>
      <div className="ms-cor">
        <label htmlFor="ms-cor">
          <strong>Cor principal</strong>
          <small>{livre ? "Cor escolhida à mão, no lugar do dourado da paleta." : "Usa a cor da paleta. Escolha outra se quiser a cor da marca."}</small>
        </label>
        <input id="ms-cor" type="color" value={livre ? cor : PALETAS[paleta]?.acento || "#d2aa5e"} onChange={(e) => aoMudar(paleta, e.target.value)} />
        {livre && (
          <button type="button" className="acao acao-sutil" onClick={() => aoMudar(paleta, null)}>
            Voltar à cor da paleta
          </button>
        )}
      </div>
    </>
  );
}

function Horarios({ lista, aoMudar }) {
  const por = new Map(lista.map((h) => [Number(h.dia), h]));
  const muda = (dia, mudanca) => {
    const atual = por.get(dia);
    let nova;
    if (mudanca === null) nova = lista.filter((h) => Number(h.dia) !== dia);
    else if (!atual) nova = [...lista, { dia, abre: "09:00", fecha: "18:00", ...mudanca }];
    else nova = lista.map((h) => (Number(h.dia) === dia ? { ...h, ...mudanca } : h));
    aoMudar(nova);
  };
  return (
    <ul className="ms-horarios">
      {DIAS.map(([d, nome]) => {
        const h = por.get(d);
        const errado = h && h.abre >= h.fecha;
        return (
          <li key={d} className={h ? "" : "ms-fechado"}>
            <label className="ms-dia">
              <input type="checkbox" checked={Boolean(h)} onChange={(e) => muda(d, e.target.checked ? {} : null)} />
              <span>{nome}</span>
            </label>
            {h ? (
              <span className="ms-horas">
                <Hora rotulo={`${nome}: abre`} valor={h.abre} aoMudar={(v) => muda(d, { abre: v })} />
                <span aria-hidden="true">às</span>
                <Hora rotulo={`${nome}: fecha`} valor={h.fecha} invalido={errado} aoMudar={(v) => muda(d, { fecha: v })} />
              </span>
            ) : (
              <span className="ms-horas-fechado">Fechado</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function MeuSalao() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [e, setE] = useState(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mudou, setMudou] = useState(false);
  const original = useRef(null);

  const sair = useCallback(() => {
    limparSessao("admin");
    router.replace("/admin/entrar");
  }, [router]);

  useEffect(() => {
    const s = lerSessao("admin");
    if (!s?.token) return router.replace("/admin/entrar");
    setToken(s.token);
    rpc("empresa_publica")
      .then((x) => {
        const c = x.config || {};
        const dados = {
          nome: x.nome,
          paleta: x.paleta,
          cor_principal: x.cor_principal,
          foto_capa: x.foto_capa,
          logo: x.logo,
          modulos: x.modulos || {},
          horarios: (x.horarios || []).map((h) => ({ dia: h.dia, abre: h.abre, fecha: h.fecha })),
          config: {
            contato: c.contato || "", whatsapp: celularVisivel(c.whatsapp), mensagem_whatsapp: c.mensagem_whatsapp || "",
            instagram: c.instagram ? `@${c.instagram}` : "", ola: c.ola || "", titulo: c.titulo || "", frase: c.frase || "",
            descricao_site: c.descricao_site || "", endereco: c.endereco || "", bairro_cidade: c.bairro_cidade || "",
            pix: { chave: "", exibicao: "", nome: "", cidade: "", ...(c.pix || {}) },
            curso: { nome: "", descricao: "", ...(c.curso || {}) },
          },
        };
        original.current = { paleta: x.paleta, cor: x.cor_principal };
        setE(dados);
      })
      .catch((err) => (sessaoExpirada(err) ? sair() : setErro("Sem conexão. Tente de novo.")));
  }, [router, sair]);

  // ao sair sem salvar, as cores voltam ao que estava
  useEffect(() => () => {
    if (original.current) aplicarPaleta(original.current.paleta, original.current.cor);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 3200);
    return () => clearTimeout(t);
  }, [aviso]);

  const muda = (k) => (v) => {
    setMudou(true);
    setE((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));
  };
  const mudaC = (k) => (v) => {
    setMudou(true);
    setE((x) => ({ ...x, config: { ...x.config, [k]: v?.target ? v.target.value : v } }));
  };
  const mudaSub = (grupo, k) => (v) => {
    setMudou(true);
    setE((x) => ({ ...x, config: { ...x.config, [grupo]: { ...x.config[grupo], [k]: v.target.value } } }));
  };

  function trocarCores(paleta, cor) {
    setMudou(true);
    setE((x) => ({ ...x, paleta, cor_principal: cor }));
    aplicarPaleta(paleta, cor);
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    try {
      const r = await rpc("admin_empresa_salvar", {
        p_token: token,
        p: { nome: e.nome, paleta: e.paleta, cor_principal: e.cor_principal || "", config: e.config, horarios: e.horarios },
      });
      if (!r.ok) throw new Error(r.erro);
      original.current = { paleta: e.paleta, cor: e.cor_principal };
      setMudou(false);
      setAviso("Salvo. O app inteiro já mostra as mudanças.");
      router.refresh();
    } catch (err) {
      if (sessaoExpirada(err)) return sair();
      setErro(err.message || "Não foi possível salvar.");
    }
    setSalvando(false);
  }

  if (!e) {
    return (
      <div className="app app-admin">
        <main className="tela"><p className="bloco-vazio">{erro || "Carregando…"}</p></main>
      </div>
    );
  }

  const c = e.config;
  const temCurso = e.modulos.curso || e.modulos.rede;

  return (
    <div className="app app-admin app-meu-salao">
      <header className="adm-topo">
        <div>
          <p className="c-saudacao">Painel</p>
          <h1>Meu salão</h1>
        </div>
        <Link href="/visitante" className="barra-link">Ver no app</Link>
      </header>

      <main className="tela">
        <Bloco titulo="Marca" texto="O nome, a foto e a logo que suas clientes veem.">
          <div className="form form-compacto">
            <Campo id="ms-nome" rotulo="Nome do salão" maxLength={60} value={e.nome} onChange={muda("nome")} />
          </div>
          <Foto tipo="capa" atual={e.foto_capa} token={token} nome={e.nome} aoEnviar={(url) => { setE((x) => ({ ...x, foto_capa: url })); setAviso("Foto de capa trocada."); router.refresh(); }} />
          <Foto tipo="logo" atual={e.logo} token={token} nome={e.nome} aoEnviar={(url) => { setE((x) => ({ ...x, logo: url })); setAviso("Logo trocada."); router.refresh(); }} />
        </Bloco>

        <Bloco titulo="Cores do app" texto="Toque numa paleta para ver o app inteiro com ela. Só fica valendo depois de salvar.">
          <Paletas paleta={e.paleta} cor={e.cor_principal} aoMudar={trocarCores} />
        </Bloco>

        <Bloco titulo="Contato" texto="Para onde vão os botões de WhatsApp e Instagram do app.">
          <div className="form form-compacto">
            <Campo id="ms-contato" rotulo="Quem atende" dica={`Aparece como “Fale com a ${c.contato || "…"}”.`} maxLength={40} value={c.contato} onChange={mudaC("contato")} placeholder="Ex.: Luana" />
            <Campo id="ms-whats" rotulo="WhatsApp" inputMode="tel" value={c.whatsapp} onChange={(ev) => mudaC("whatsapp")(celularVisivel(ev.target.value))} placeholder="(85) 99999-9999" />
            <Campo id="ms-msg" rotulo="Mensagem pronta do WhatsApp" area maxLength={200} value={c.mensagem_whatsapp} onChange={mudaC("mensagem_whatsapp")} placeholder={`Oi, ${c.contato || "tudo bem"}! Vim pelo app e quero agendar um horário.`} />
            <Campo id="ms-insta" rotulo="Instagram" value={c.instagram} onChange={mudaC("instagram")} placeholder="@seusalao" autoCapitalize="none" />
          </div>
        </Bloco>

        <Bloco titulo="Textos da página do salão">
          <div className="form form-compacto">
            <Campo id="ms-ola" rotulo="Saudação" maxLength={40} value={c.ola} onChange={mudaC("ola")} placeholder="Olá, seja bem-vinda" />
            <Campo id="ms-titulo" rotulo="Título da capa" maxLength={90} value={c.titulo} onChange={mudaC("titulo")} placeholder="Ex.: Cílios que valorizam o seu olhar." />
            <Campo id="ms-frase" rotulo="Frase de apresentação" area maxLength={200} value={c.frase} onChange={mudaC("frase")} />
            <Campo id="ms-desc" rotulo="Descrição para o Google e para links" dica="Aparece quando alguém compartilha o link do app." area maxLength={200} value={c.descricao_site} onChange={mudaC("descricao_site")} />
          </div>
        </Bloco>

        <Bloco titulo="Pix do sinal" texto="Gera o QR Code e o Pix copia e cola dos agendamentos.">
          <div className="form form-compacto">
            <Campo id="ms-chave" rotulo="Chave Pix" maxLength={77} value={c.pix.chave} onChange={mudaSub("pix", "chave")} placeholder="Celular com +55, e-mail, CPF/CNPJ ou chave aleatória" autoCapitalize="none" />
            <Campo id="ms-exib" rotulo="Como a chave aparece para a cliente" maxLength={77} value={c.pix.exibicao} onChange={mudaSub("pix", "exibicao")} placeholder="Ex.: (85) 99999-9999" />
            <div className="duas">
              <div><Campo id="ms-fav" rotulo="Nome do favorecido" maxLength={25} value={c.pix.nome} onChange={mudaSub("pix", "nome")} /></div>
              <div><Campo id="ms-cid" rotulo="Cidade" maxLength={15} value={c.pix.cidade} onChange={mudaSub("pix", "cidade")} /></div>
            </div>
          </div>
        </Bloco>

        <Bloco titulo="Endereço" texto="Vai nas mensagens de confirmação. Deixe vazio para não mostrar.">
          <div className="form form-compacto">
            <Campo id="ms-end" rotulo="Rua e número" maxLength={120} value={c.endereco} onChange={mudaC("endereco")} />
            <Campo id="ms-bairro" rotulo="Bairro e cidade" maxLength={80} value={c.bairro_cidade} onChange={mudaC("bairro_cidade")} />
          </div>
        </Bloco>

        <Bloco titulo="Horários de atendimento" texto="A agenda do app só oferece horários dentro destes períodos.">
          <Horarios lista={e.horarios} aoMudar={muda("horarios")} />
        </Bloco>

        {temCurso && (
          <Bloco titulo="Curso">
            <div className="form form-compacto">
              <Campo id="ms-curso" rotulo="Nome do curso" maxLength={60} value={c.curso.nome} onChange={mudaSub("curso", "nome")} />
              <Campo id="ms-curso-d" rotulo="Descrição" area maxLength={300} value={c.curso.descricao} onChange={mudaSub("curso", "descricao")} />
            </div>
          </Bloco>
        )}

        {erro && <p className="erro">{erro}</p>}
      </main>

      {(mudou || salvando) && (
        <div className="ms-salvar">
          <button type="button" className="botao-ouro" disabled={salvando} onClick={salvar}>
            {salvando ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      )}

      <MenuApp quem={{ tipo: "admin" }} />
      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  );
}
