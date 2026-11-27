"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rpc } from "../../../lib/supabase";
import { lerSessao, limparSessao, sessaoExpirada } from "../../../lib/sessao";
import { RECURSOS, NOME_PLANO, linkVendas, precoPlano } from "../../../lib/planos";
import { situacaoTexto, dataCurta } from "../../../components/admin/CartaoPlano";
import { useSalao } from "../../../components/Empresa";
import MenuApp from "../../../components/MenuApp";
import { IconeCheck } from "../../../components/Icones";

const ORDEM = ["agenda", "push", "resumo", "promocoes", "cor_livre", "natal", "curso", "rede", "dominio", "sem_assinatura"];

export default function MeuPlano() {
  const salao = useSalao();
  const router = useRouter();
  const [p, setP] = useState(null);
  const [pagarAgora, setPagarAgora] = useState(false);
  const [m, setM] = useState(null); // mensalidade: valores, pagamento online, histórico
  const [token, setToken] = useState(null);
  const [volta, setVolta] = useState(null); // null | conferindo | pago | aguardando
  const [abrindo, setAbrindo] = useState(null);
  const [erro, setErro] = useState("");
  const [ciclo, setCiclo] = useState("mensal");

  const carregar = useCallback(
    (t) =>
      Promise.all([rpc("admin_meu_plano", { p_token: t }), rpc("admin_mensalidade_info", { p_token: t }).catch(() => null)])
        .then(([plano, mens]) => {
          setP(plano);
          setM(mens);
        })
        .catch((e) => {
          if (sessaoExpirada(e)) {
            limparSessao("admin");
            router.replace("/admin/entrar");
          }
        }),
    [router]
  );

  const conferir = useCallback(
    async (t) => {
      setVolta("conferindo");
      try {
        const r = await rpc("admin_mensalidade_verificar", { p_token: t });
        setVolta(r.pago ? "pago" : "aguardando");
        if (r.pago) carregar(t);
      } catch {
        setVolta("aguardando");
      }
    },
    [carregar]
  );

  useEffect(() => {
    const s = lerSessao("admin");
    if (!s?.token) return router.replace("/admin/entrar");
    setToken(s.token);
    carregar(s.token);
    const q = new URLSearchParams(window.location.search);
    if (q.get("pagamento")) {
      window.history.replaceState(null, "", "/admin/plano");
      conferir(s.token);
    }
    if (q.get("pagar")) {
      window.history.replaceState(null, "", "/admin/plano");
      setPagarAgora(true);
    }
  }, [router, carregar, conferir]);

  // vindo da assinatura pelo site: abre o pagamento sozinho
  useEffect(() => {
    if (!pagarAgora || !p || !m) return;
    setPagarAgora(false);
    if (m.online && p.situacao !== "ativa") pagar(p.plano?.codigo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagarAgora, p, m]);

  // abre o checkout do Mercado Pago (Pix, cartão ou boleto)
  async function pagar(codigo) {
    setAbrindo(codigo);
    setErro("");
    try {
      const r = await rpc("admin_mensalidade_ciclo", { p_token: token, p_plano: codigo, p_ciclo: ciclo });
      if (!r.ok) throw new Error(r.erro);
      window.location.href = r.link;
    } catch (e) {
      setErro(e.message || "Não foi possível abrir o pagamento. Tente de novo.");
      setAbrindo(null);
    }
  }

  if (!p) return <div className="app app-admin"><main className="tela"><p className="bloco-vazio">Carregando…</p></main></div>;

  const atual = p.plano.codigo;
  const msg = (nome) => `Oi! Sou de ${salao.nome} (${salao.slug}.tonsdellas.com.br), hoje no plano ${NOME_PLANO[atual]}, e quero falar sobre o plano ${nome}.`;
  const msgPagar = `Oi! Sou de ${salao.nome} (${salao.slug}.tonsdellas.com.br) e quero pagar o plano ${NOME_PLANO[atual]}.`;
  const online = Boolean(m?.online);
  const anual = ciclo === "anual";
  const promo = !m?.anual_promo_usado;
  const valor = (c) => (anual
    ? m?.valores_anual?.[c] ?? p.planos.find((x) => x.codigo === c)?.[promo ? "preco_anual" : "preco_anual_renova"]
    : m?.valores?.[c] ?? p.planos.find((x) => x.codigo === c)?.preco);
  const sufixo = anual ? "/ano" : "/mês";
  const faltam = p.vence_em ? Math.round((new Date(`${p.vence_em}T12:00:00-03:00`) - Date.now()) / 864e5) : null;
  const deve = p.situacao === "atrasada" || p.situacao === "suspensa";
  const podePagar = deve || p.situacao === "teste" || (p.situacao === "ativa" && faltam != null && faltam <= 10);
  const estreia = p.situacao === "suspensa" && !p.vence_em;
  const rotuloPagar = estreia ? "Pagar e colocar no ar" : p.situacao === "teste" ? `Assinar o ${NOME_PLANO[atual]}` : deve ? (anual ? "Pagar o ano" : "Pagar mensalidade") : anual ? "Pagar o próximo ano" : "Pagar o próximo mês";
  const seletor = online && (
    <div className="plano-ciclo" role="radiogroup" aria-label="Forma de pagamento">
      <button type="button" role="radio" aria-checked={!anual} onClick={() => setCiclo("mensal")}>Mensal</button>
      <button type="button" role="radio" aria-checked={anual} onClick={() => setCiclo("anual")}>
        Anual {promo ? <span>2 meses grátis</span> : <span>1 mês grátis</span>}
      </button>
    </div>
  );

  return (
    <div className="app app-admin">
      <header className="adm-topo">
        <div>
          <p className="c-saudacao">Painel</p>
          <h1>Meu plano</h1>
        </div>
        <Link href="/admin" className="barra-link">Painel</Link>
      </header>

      <main className="tela">
        <section className={`plano-atual vidro ${p.situacao === "atrasada" || p.situacao === "suspensa" ? "plano-alerta" : ""}`}>
          <small>Plano atual</small>
          <strong>{NOME_PLANO[atual]}</strong>
          <p>{situacaoTexto(p)}</p>
          {p.situacao === "teste" && <p className="plano-nota">No teste você usa os recursos do Profissional. Depois, fica o plano que escolher.</p>}
          {podePagar && seletor}
          {podePagar &&
            (online ? (
              <button type="button" className="botao-ouro" disabled={Boolean(abrindo)} onClick={() => pagar(atual)}>
                {abrindo === atual ? "Abrindo o pagamento…" : `${rotuloPagar} · ${precoPlano(valor(atual))}${anual ? "/ano" : ""}`}
              </button>
            ) : (
              (deve || p.situacao === "teste") && (
                <a className="botao-ouro" href={linkVendas(p.whatsapp, msgPagar)} target="_blank" rel="noopener">
                  {p.situacao === "teste" ? "Contratar agora" : "Regularizar pagamento"}
                </a>
              )
            ))}
          {online && podePagar && (
            <p className="plano-nota">
              {anual
                ? `Pague 12 meses de uma vez${promo ? " com 2 meses grátis" : ""}, no Pix, boleto ou em até 12x no cartão. Vale por 1 ano a partir do vencimento atual.`
                : "Pix, cartão ou boleto pelo Mercado Pago. O app renova sozinho assim que o pagamento é aprovado."}
            </p>
          )}
          {online && m?.pendente && volta !== "pago" && (
            <button type="button" className="link-botao plano-conferir" onClick={() => conferir(token)} disabled={volta === "conferindo"}>
              {volta === "conferindo" ? "Conferindo…" : "Já paguei: conferir pagamento"}
            </button>
          )}
          {erro && <p className="erro">{erro}</p>}
        </section>

        {volta && volta !== "conferindo" && (
          <div className={`plano-volta vidro ${volta === "pago" ? "plano-volta-ok" : ""}`} role="status">
            {volta === "pago" ? (
              <>
                <strong>Pagamento confirmado</strong>
                <p>Obrigada! Seu plano {NOME_PLANO[atual]} está ativo{p.vence_em ? ` até ${dataCurta(p.vence_em)}` : ""}.</p>
                <Link href="/admin?bemvinda=1" className="botao-ouro plano-volta-botao">Ir para o meu painel</Link>
              </>
            ) : (
              <>
                <strong>Ainda não recebemos a confirmação</strong>
                <p>Pix e cartão costumam confirmar em segundos; boleto leva até 2 dias úteis. O app atualiza sozinho quando o pagamento for aprovado.</p>
              </>
            )}
          </div>
        )}

        <div className="planos-grade">
          {p.planos.map((pl) => {
            const meu = pl.codigo === atual;
            return (
              <article key={pl.codigo} className={`plano-cartao vidro ${meu ? "plano-meu" : ""}`}>
                {meu && <span className="plano-selo">Seu plano</span>}
                <h2>{pl.nome}</h2>
                <p className="plano-desc">{pl.descricao}</p>
                <p className="plano-preco">{precoPlano(online ? valor(pl.codigo) : pl.preco)}<small>{online ? sufixo : "/mês"}</small></p>
                {anual && <p className="plano-equipe">equivale a {precoPlano(Math.round((Number(valor(pl.codigo)) / 12) * 100) / 100)}/mês</p>}
                <p className="plano-equipe">
                  {pl.profissionais === 1 ? "1 profissional" : `Até ${pl.profissionais} profissionais`}
                  {pl.extra_profissional ? ` · extra ${precoPlano(pl.extra_profissional)} cada` : ""}
                </p>
                <ul>
                  {ORDEM.map((r) => {
                    const tem = pl.recursos.includes(r);
                    return (
                      <li key={r} className={tem ? "" : "plano-nao"}>
                        {tem ? <IconeCheck width="16" height="16" /> : <span aria-hidden="true">–</span>}
                        {RECURSOS[r].nome}
                      </li>
                    );
                  })}
                </ul>
                {!meu &&
                  (online ? (
                    <button type="button" className={pl.preco > p.plano.preco ? "botao-ouro" : "botao-linha"} disabled={Boolean(abrindo)} onClick={() => pagar(pl.codigo)}>
                      {abrindo === pl.codigo ? "Abrindo o pagamento…" : `${p.situacao === "teste" ? "Assinar" : "Mudar para"} o ${pl.nome} · ${precoPlano(valor(pl.codigo))}${anual ? "/ano" : ""}`}
                    </button>
                  ) : (
                    <a className={pl.preco > p.plano.preco ? "botao-ouro" : "botao-linha"} href={linkVendas(p.whatsapp, msg(pl.nome))} target="_blank" rel="noopener">
                      {pl.preco > p.plano.preco ? `Quero o ${pl.nome}` : `Mudar para o ${pl.nome}`}
                    </a>
                  ))}
              </article>
            );
          })}
        </div>
        {m?.historico?.length > 0 && (
          <section className="plano-historico">
            <h2>Pagamentos</h2>
            <ul>
              {m.historico.map((h, i) => (
                <li key={i}>
                  <span>
                    {NOME_PLANO[h.plano] || h.plano}{h.meses === 12 ? " · anual" : ""}
                    <small>Pago em {new Date(h.pago_em).toLocaleDateString("pt-BR")}{h.valido_ate ? ` · vale até ${dataCurta(h.valido_ate)}` : ""}</small>
                  </span>
                  <strong>{precoPlano(h.valor)}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}
        {online && <p className="plano-rodape">Ao trocar de plano pelo app, o novo começa assim que o pagamento é aprovado e soma 1 mês (ou 12, no anual) ao seu vencimento.{promo ? "" : " Os 2 meses grátis valem só no primeiro ano; nas renovações anuais, é 1 mês grátis."}</p>}
        <p className="plano-rodape">Clientes e agendamentos são ilimitados em todos os planos. Mudou de plano? Nada é apagado: o que sair do plano fica guardado.</p>
      </main>

      <MenuApp quem={{ tipo: "admin" }} />
    </div>
  );
}
