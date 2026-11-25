"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BarraTopo from "../../../components/BarraTopo";
import { rpc } from "../../../lib/supabase";
import { dataCompleta } from "../../../lib/formato";
import { salao } from "../../../content/salao";

export default function Certificado() {
  const { codigo } = useParams();
  const [c, setC] = useState(undefined);

  useEffect(() => {
    rpc("certificado_verificar", { p_codigo: String(codigo) }).then((r) => setC(r || null)).catch(() => setC(null));
  }, [codigo]);

  return (
    <div className="app app-cert">
      <BarraTopo voltar="/rede" />
      <main className="tela">
        {c === undefined ? (
          <p className="bloco-vazio">Conferindo certificado…</p>
        ) : c === null ? (
          <div className="cert-invalido vidro">
            <h1>Certificado não encontrado</h1>
            <p>O código <strong>{String(codigo).toUpperCase()}</strong> não corresponde a nenhuma profissional certificada pelo {salao.curso.nome}.</p>
          </div>
        ) : (
          <>
            {c.demo && <p className="aviso-demo cert-exemplo">Certificado de <strong>exemplo</strong>, usado na simulação. Não tem validade.</p>}
            <article className="cert entra">
              <span className="cert-fio" aria-hidden="true" />
              <img src="/monograma.webp" alt="" width="80" height="80" />
              <p className="cert-rotulo">Certificado de conclusão</p>
              <h1>{c.nome}</h1>
              <p className="cert-texto">concluiu o curso <strong>{salao.curso.nome}</strong>{c.turma ? ` (${c.turma})` : ""}, ministrado por {salao.contato}, da {salao.nome}.</p>
              <dl className="cert-dados">
                <div><dt>Certificada em</dt><dd>{dataCompleta(c.certificada_em)}</dd></div>
                <div><dt>Cidade</dt><dd>{c.cidade} · {c.uf}</dd></div>
                <div><dt>Código</dt><dd>{c.codigo}</dd></div>
              </dl>
              <p className="cert-valido">✓ Certificado verificado pela {salao.nome}</p>
            </article>
            <a className="botao-ouro cert-pdf" href={`/certificado/${c.codigo}/pdf`} target="_blank" rel="noopener">Baixar certificado em PDF</a>
          </>
        )}
      </main>
    </div>
  );
}
