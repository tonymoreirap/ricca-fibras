"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rpc } from "../../../lib/supabase";
import { lerSessao, limparSessao, sessaoExpirada } from "../../../lib/sessao";
import { RECURSOS, NOME_PLANO, linkVendas, precoPlano } from "../../../lib/planos";
import { situacaoTexto } from "../../../components/admin/CartaoPlano";
import { useSalao } from "../../../components/Empresa";
import MenuApp from "../../../components/MenuApp";
import { IconeCheck } from "../../../components/Icones";

const ORDEM = ["agenda", "push", "resumo", "promocoes", "cor_livre", "natal", "curso", "rede", "dominio", "sem_assinatura"];

export default function MeuPlano() {
  const salao = useSalao();
  const router = useRouter();
  const [p, setP] = useState(null);

  useEffect(() => {
    const s = lerSessao("admin");
    if (!s?.token) return router.replace("/admin/entrar");
    rpc("admin_meu_plano", { p_token: s.token })
      .then(setP)
      .catch((e) => {
        if (sessaoExpirada(e)) {
          limparSessao("admin");
          router.replace("/admin/entrar");
        }
      });
  }, [router]);

  if (!p) return <div className="app app-admin"><main className="tela"><p className="bloco-vazio">Carregando…</p></main></div>;

  const atual = p.plano.codigo;
  const msg = (nome) => `Oi! Sou de ${salao.nome} (${salao.slug}.tonsdellas.com.br), hoje no plano ${NOME_PLANO[atual]}, e quero falar sobre o plano ${nome}.`;
  const pagar = `Oi! Sou de ${salao.nome} (${salao.slug}.tonsdellas.com.br) e quero pagar o plano ${NOME_PLANO[atual]}.`;

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
          {(p.situacao === "atrasada" || p.situacao === "suspensa" || p.situacao === "teste") && (
            <a className="botao-ouro" href={linkVendas(p.whatsapp, pagar)} target="_blank" rel="noopener">
              {p.situacao === "teste" ? "Contratar agora" : "Regularizar pagamento"}
            </a>
          )}
        </section>

        <div className="planos-grade">
          {p.planos.map((pl) => {
            const meu = pl.codigo === atual;
            return (
              <article key={pl.codigo} className={`plano-cartao vidro ${meu ? "plano-meu" : ""}`}>
                {meu && <span className="plano-selo">Seu plano</span>}
                <h2>{pl.nome}</h2>
                <p className="plano-desc">{pl.descricao}</p>
                <p className="plano-preco">{precoPlano(pl.preco)}<small>/mês</small></p>
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
                {!meu && (
                  <a className={pl.preco > p.plano.preco ? "botao-ouro" : "botao-linha"} href={linkVendas(p.whatsapp, msg(pl.nome))} target="_blank" rel="noopener">
                    {pl.preco > p.plano.preco ? `Quero o ${pl.nome}` : `Mudar para o ${pl.nome}`}
                  </a>
                )}
              </article>
            );
          })}
        </div>
        <p className="plano-rodape">Clientes e agendamentos são ilimitados em todos os planos. Mudou de plano? Nada é apagado: o que sair do plano fica guardado.</p>
      </main>

      <MenuApp quem={{ tipo: "admin" }} />
    </div>
  );
}
