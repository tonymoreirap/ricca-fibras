"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BarraTopo from "../../components/BarraTopo";
import { BotaoConta } from "../../components/ContaVisitante";
import { rpc } from "../../lib/supabase";
import { lerSessao } from "../../lib/sessao";
import { instagramUrl } from "../../lib/curso";
import { IconeCamera, IconeConversa, IconeSeta } from "../../components/Icones";
import { useSalao, LogoDe } from "../../components/Empresa";

export default function Rede() {
  const salao = useSalao();
  const rica = salao.slug === "rica";
  const selo = rica ? "Método Rica" : salao.curso.nome;
  const [lista, setLista] = useState(null);
  const [cidade, setCidade] = useState("");

  useEffect(() => {
    // a equipe vê também os exemplos, marcados
    const token = lerSessao("admin")?.token || null;
    rpc("rede_publica", { p_token: token }).then(setLista).catch(() => setLista([]));
  }, []);

  const cidades = useMemo(() => [...new Set((lista || []).map((p) => `${p.cidade} · ${p.uf}`))], [lista]);
  const visiveis = (lista || []).filter((p) => !cidade || `${p.cidade} · ${p.uf}` === cidade);

  return (
    <div className="app app-rede">
      <BarraTopo voltar="/curso" direita={<BotaoConta />} />
      <main className="tela">
        <section className="rede-capa entra">
          <LogoDe salao={salao} tamanho={72} />
          <h1>{rica ? "Rede Método Rica" : `Profissionais ${salao.nome}`}</h1>
          <p>Profissionais formadas e certificadas {salao.contato !== salao.nome ? `pela ${salao.contato}` : `pela ${salao.nome}`}. Cada certificado tem um código que você pode conferir.</p>
        </section>

        {cidades.length > 1 && (
          <div className="ordenar rede-cidades" role="group" aria-label="Filtrar por cidade">
            <button type="button" aria-pressed={!cidade} onClick={() => setCidade("")}>Todas</button>
            {cidades.map((c) => (
              <button key={c} type="button" aria-pressed={cidade === c} onClick={() => setCidade(c)}>{c}</button>
            ))}
          </div>
        )}

        {lista === null ? (
          <p className="bloco-vazio">Carregando…</p>
        ) : visiveis.length === 0 ? (
          <div className="turmas-vazio vidro">
            <p>As primeiras profissionais certificadas aparecem aqui em breve.</p>
            <Link href="/curso" className="botao-linha">Quero fazer o curso</Link>
          </div>
        ) : (
          <ul className="rede-lista">
            {visiveis.map((p) => (
              <li key={p.id} className="pro vidro">
                <div className="pro-topo">
                  <span className="avatar" aria-hidden="true"><span>{p.nome[0]}</span></span>
                  <span className="pro-texto">
                    <strong>{p.nome}{p.demo && <em className="selo-exemplo">exemplo</em>}</strong>
                    <small>{p.cidade} · {p.uf}</small>
                  </span>
                </div>
                <span className="pro-selo">Certificada {selo} · {String(p.certificada_em).slice(0, 4)}</span>
                {p.bio && <p className="pro-bio">{p.bio}</p>}
                <div className="pro-acoes">
                  {p.instagram && !p.demo && (
                    <a className="acao" href={instagramUrl(p.instagram)} target="_blank" rel="noopener"><IconeCamera width="18" height="18" /> Instagram</a>
                  )}
                  {p.whatsapp && !p.demo && (
                    <a className="acao" href={`https://wa.me/55${p.whatsapp}`} target="_blank" rel="noopener"><IconeConversa width="18" height="18" /> WhatsApp</a>
                  )}
                  <Link className="acao acao-forte" href={`/certificado/${p.codigo}`}>Certificado <IconeSeta stroke="currentColor" /></Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
