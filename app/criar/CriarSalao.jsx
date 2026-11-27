"use client";

import { useEffect, useMemo, useState } from "react";
import { rpc } from "../../lib/supabase";
import { PALETAS, variaveisPaleta } from "../../lib/paletas";
import { iniciais } from "../../lib/empresa";
import { precoPlano, linkVendas } from "../../lib/planos";
import CampoSenha from "../../components/CampoSenha";
import { IconeCheck } from "../../components/Icones";

// mesmo jeito do banco: "Borboleta Rosa" -> "borboletarosa"
const slugDe = (t) =>
  (t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);

const DESTAQUES = {
  essencial: ["Agenda online com sinal por Pix", "Sua logo, cores e endereço"],
  profissional: ["Até 3 agendas", "Avisos no celular e promoções", "Cor exata da sua marca"],
  salao: ["Até 10 agendas", "Curso, certificados e rede", "Domínio próprio"],
};

const mascaraCel = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
};

const ETAPA_DO_CAMPO = { nome: 1, slug: 1, dona_nome: 3, email: 3, whatsapp: 3, senha: 3 };

export default function CriarSalao({ planos, whatsapp }) {
  const [etapa, setEtapa] = useState(1);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugMexido, setSlugMexido] = useState(false);
  const [disp, setDisp] = useState(null); // { livre, motivo, sugestao } | "checando"
  const [paleta, setPaleta] = useState("cafe-ouro");
  const [plano, setPlano] = useState("profissional");
  const [dona, setDona] = useState("");
  const [email, setEmail] = useState("");
  const [cel, setCel] = useState("");
  const [senha, setSenha] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState("");
  const [campoErro, setCampoErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("plano");
    if (p && planos.some((x) => x.codigo === p)) setPlano(p);
  }, [planos]);

  // endereço acompanha o nome até a dona mexer nele
  useEffect(() => {
    if (!slugMexido) setSlug(slugDe(nome));
  }, [nome, slugMexido]);

  useEffect(() => {
    if (slug.length < 3) return setDisp(slug ? { livre: false, motivo: "Use pelo menos 3 letras." } : null);
    setDisp("checando");
    const t = setTimeout(() => {
      rpc("slug_disponivel", { p_slug: slug })
        .then((r) => setDisp(r.slug === slug ? r : { ...r, livre: false }))
        .catch(() => setDisp(null));
    }, 400);
    return () => clearTimeout(t);
  }, [slug]);

  const estilo = useMemo(() => variaveisPaleta(paleta), [paleta]);
  const etapa1 = nome.trim().length >= 2 && disp?.livre === true;
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const celOk = cel.replace(/\D/g, "").length >= 10;
  const etapa3 = dona.trim().length >= 2 && emailOk && celOk && senha.length >= 8 && aceite;

  function irPara(n) {
    setErro("");
    setEtapa(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function criar() {
    if (!etapa3 || enviando) return;
    setEnviando(true);
    setErro("");
    setCampoErro("");
    try {
      const r = await rpc("criar_salao", {
        p: { nome: nome.trim(), slug, dona_nome: dona.trim(), email: email.trim(), whatsapp: cel, senha, plano, paleta },
      });
      if (!r.ok) {
        setErro(r.erro + (r.outro_endereco ? ` (${r.outro_endereco})` : ""));
        setCampoErro(r.campo || "");
        if (r.campo && ETAPA_DO_CAMPO[r.campo]) setEtapa(ETAPA_DO_CAMPO[r.campo]);
        if (r.campo === "slug") setDisp({ livre: false, motivo: r.erro });
        setEnviando(false);
        return;
      }
      setPronto(r);
      window.scrollTo({ top: 0 });
      setTimeout(() => {
        window.location.href = `${r.endereco}/admin/entrar#passe=${r.passe}${r.pagar ? "&pagar=1" : ""}`;
      }, 3000);
    } catch {
      setErro("Não foi possível conectar. Verifique a internet e tente de novo.");
      setEnviando(false);
    }
  }

  const previa = (
    <div className="cs-previa" style={estilo} aria-hidden="true">
      <div className="cs-previa-tela">
        <span className="cs-previa-logo">{iniciais(nome || "Seu salão")}</span>
        <strong>{nome.trim() || "Seu salão"}</strong>
        <small>Olá, seja bem-vinda</small>
        <span className="cs-previa-botao">Agendar horário</span>
      </div>
      <span className="cs-previa-url">{slug || "seusalao"}.tonsdellas.com.br</span>
    </div>
  );

  if (pronto) {
    return (
      <main className="tela cs-pronto">
        {previa}
        <h1>{pronto.pagar ? `Falta só o pagamento para o ${nome.trim()} ir ao ar.` : `Pronto! O app do ${nome.trim()} está no ar.`}</h1>
        <p>
          Seu endereço é <strong>{pronto.endereco.replace("https://", "")}</strong>.
          {pronto.pagar
            ? " Esse WhatsApp já usou o teste grátis, então o app vai ao ar assim que a primeira mensalidade for aprovada no Mercado Pago."
            : " Você tem 7 dias grátis para usar tudo. Sem cartão: quando quiser continuar, é só assinar pelo painel."}
        </p>
        <a className="botao-ouro" href={`${pronto.endereco}/admin/entrar#passe=${pronto.passe}${pronto.pagar ? "&pagar=1" : ""}`}>
          {pronto.pagar ? "Ir para o pagamento" : "Abrir meu painel"}
        </a>
        <small>{pronto.pagar ? "Abrindo o pagamento…" : "Abrindo o seu painel…"}</small>
      </main>
    );
  }

  return (
    <main className="tela cs-tela">
      <ol className="cs-passos" aria-label="Etapas">
        {["Seu salão", "Plano", "Sua conta"].map((t, i) => (
          <li key={t} className={etapa === i + 1 ? "atual" : etapa > i + 1 ? "feito" : ""} aria-current={etapa === i + 1 ? "step" : undefined}>
            <span>{etapa > i + 1 ? <IconeCheck width="14" height="14" /> : i + 1}</span>
            {t}
          </li>
        ))}
      </ol>

      {etapa === 1 && (
        <section className="cs-etapa">
          <h1>Crie o app do seu salão</h1>
          <p className="cs-sub">Leva 2 minutos e o app já vai ao ar. Teste 7 dias grátis, sem cartão.</p>
          {previa}
          <div className="form form-compacto">
            <label htmlFor="cs-nome">Nome do salão</label>
            <input id="cs-nome" value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Borboleta Rosa" autoComplete="organization" aria-invalid={campoErro === "nome"} />

            <label htmlFor="cs-slug">Endereço do seu app</label>
            <div className="cs-slug">
              <input
                id="cs-slug"
                value={slug}
                onChange={(e) => {
                  setSlugMexido(true);
                  setSlug(slugDe(e.target.value));
                }}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-describedby="cs-slug-status"
                aria-invalid={disp && disp !== "checando" && !disp.livre}
              />
              <span aria-hidden="true">.tonsdellas.com.br</span>
            </div>
            <p id="cs-slug-status" className={`cs-status ${disp?.livre ? "ok" : disp && disp !== "checando" ? "ruim" : ""}`} role="status">
              {disp === "checando"
                ? "Conferindo…"
                : disp?.livre
                  ? "Endereço livre"
                  : disp
                    ? (
                      <>
                        {disp.motivo}
                        {disp.sugestao && (
                          <button type="button" className="link-botao" onClick={() => { setSlugMexido(true); setSlug(disp.sugestao); }}>
                            Usar {disp.sugestao}
                          </button>
                        )}
                      </>
                    )
                    : "Só letras e números, sem espaço."}
            </p>
          </div>

          <h2 className="cs-rotulo">Cores do app</h2>
          <div className="ms-paletas" role="radiogroup" aria-label="Cores do app">
            {Object.entries(PALETAS).map(([k, p]) => {
              const v = variaveisPaleta(k);
              return (
                <button key={k} type="button" role="radio" aria-checked={paleta === k} className="ms-paleta" onClick={() => setPaleta(k)}>
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
          <p className="cs-nota">Logo, foto de capa e cores podem ser trocadas depois, no painel.</p>

          <div className="acao-rodape">
            <button type="button" className="botao-ouro" disabled={!etapa1} onClick={() => irPara(2)}>Continuar</button>
          </div>
        </section>
      )}

      {etapa === 2 && (
        <section className="cs-etapa">
          <h1>Escolha o plano</h1>
          <p className="cs-sub">Os 7 primeiros dias são grátis em qualquer plano. Depois, mensal ou anual com 2 meses grátis, sem fidelidade.</p>
          <div className="cs-planos" role="radiogroup" aria-label="Plano">
            {planos.map((pl) => (
              <button key={pl.codigo} type="button" role="radio" aria-checked={plano === pl.codigo} className="cs-plano vidro" onClick={() => setPlano(pl.codigo)}>
                <span className="cs-plano-topo">
                  <strong>{pl.nome}</strong>
                  <span className="cs-plano-preco">{precoPlano(pl.preco)}<small>/mês</small></span>
                </span>
                <span className="cs-plano-equipe">{pl.profissionais === 1 ? "1 profissional" : `Até ${pl.profissionais} profissionais`}</span>
                <span className="cs-plano-lista">
                  {(DESTAQUES[pl.codigo] || []).map((d) => (
                    <span key={d}><IconeCheck width="14" height="14" />{d}</span>
                  ))}
                </span>
              </button>
            ))}
          </div>
          <a className="cs-nota cs-link" href="/#planos" target="_blank" rel="noopener">Comparar tudo o que cada plano tem</a>
          <div className="acao-rodape cs-rodape-duplo">
            <button type="button" className="botao-linha" onClick={() => irPara(1)}>Voltar</button>
            <button type="button" className="botao-ouro" onClick={() => irPara(3)}>Continuar</button>
          </div>
        </section>
      )}

      {etapa === 3 && (
        <section className="cs-etapa">
          <h1>Sua conta de dona</h1>
          <p className="cs-sub">É com ela que você entra no painel do {nome.trim()}.</p>
          <form className="form form-compacto" onSubmit={(e) => { e.preventDefault(); criar(); }}>
            <label htmlFor="cs-dona">Seu nome</label>
            <input id="cs-dona" value={dona} maxLength={80} onChange={(e) => setDona(e.target.value)} autoComplete="name" placeholder="Como as clientes te chamam" aria-invalid={campoErro === "dona_nome"} />
            <label htmlFor="cs-email">E-mail</label>
            <input id="cs-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="seu@email.com" aria-invalid={campoErro === "email"} />
            <label htmlFor="cs-cel">WhatsApp do salão</label>
            <input id="cs-cel" inputMode="tel" value={cel} onChange={(e) => setCel(mascaraCel(e.target.value))} autoComplete="tel-national" placeholder="(85) 99999-9999" aria-invalid={campoErro === "whatsapp"} />
            <label htmlFor="cs-senha">Crie uma senha</label>
            <CampoSenha id="cs-senha" valor={senha} aoMudar={setSenha} nova placeholder="Pelo menos 8 caracteres" />
            <label className="marcar">
              <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
              <span>
                Li e aceito os <a href="/termos" target="_blank" rel="noopener">termos de uso</a> e a{" "}
                <a href="/privacidade" target="_blank" rel="noopener">política de privacidade</a>
              </span>
            </label>
            {erro && <p className="erro" role="alert">{erro}</p>}
            <div className="acao-rodape cs-rodape-duplo">
              <button type="button" className="botao-linha" onClick={() => irPara(2)}>Voltar</button>
              <button type="submit" className="botao-ouro" disabled={!etapa3 || enviando}>{enviando ? "Criando…" : "Criar e testar grátis"}</button>
            </div>
          </form>
        </section>
      )}

      {erro && etapa !== 3 && <p className="erro" role="alert">{erro}</p>}
      <p className="cs-ajuda">
        Dúvidas? <a href={linkVendas(whatsapp, "Oi! Estou criando o app do meu salão na Tons Dellas e tenho uma dúvida.")} target="_blank" rel="noopener">Fale com a gente</a>
      </p>
    </main>
  );
}
