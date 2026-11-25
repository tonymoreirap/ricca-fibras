"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BarraTopo from "../../components/BarraTopo";
import { BotaoConta } from "../../components/ContaVisitante";
import { rpc } from "../../lib/supabase";
import { real, mascaraCelular, dataDiaMes } from "../../lib/formato";
import { periodoTurma } from "../../lib/curso";
import { lerSessao } from "../../lib/sessao";
import { curso } from "../../content/curso";
import { salao } from "../../content/salao";
import { IlustracaoServico, IconeCheck, IconeConversa, IconeSeta } from "../../components/Icones";

export default function Curso() {
  const [turmas, setTurmas] = useState(null);
  const [escolha, setEscolha] = useState("vip");
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [cidade, setCidade] = useState("");
  const [experiencia, setExperiencia] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);
  const form = useRef(null);

  useEffect(() => {
    rpc("curso_publico", { p_token: lerSessao("admin")?.token || null })
      .then((l) => {
        setTurmas(l);
        const livre = l.find((t) => t.ocupadas < t.vagas);
        if (livre) setEscolha(livre.id);
      })
      .catch(() => setTurmas([]));
  }, []);

  const valido = nome.trim().length >= 2 && celular.replace(/\D/g, "").length >= 10;
  const turmaEscolhida = turmas?.find((t) => t.id === escolha);

  async function enviar(e) {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("curso_inscrever", {
        p_tipo: escolha === "vip" ? "vip" : "turma",
        p_turma: escolha === "vip" ? null : escolha,
        p_nome: nome.trim(),
        p_celular: celular.replace(/\D/g, ""),
        p_cidade: cidade.trim(),
        p_experiencia: experiencia,
        p_mensagem: mensagem.trim(),
      });
      if (!r.ok) setErro(r.erro);
      else setFeito(true);
    } catch {
      setErro("Não foi possível enviar. Verifique a internet e tente de novo.");
    }
    setEnviando(false);
  }

  const irParaForm = (id) => {
    if (id) setEscolha(id);
    form.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const whats = `https://wa.me/${salao.whatsapp}?text=${encodeURIComponent(
    `Oi, Luana! Acabei de me inscrever no ${curso.nome}${turmaEscolhida ? ` (${turmaEscolhida.nome})` : " (curso individual)"}. Meu nome é ${nome.trim()}.`
  )}`;

  return (
    <div className="app app-curso">
      <BarraTopo voltar="/visitante" direita={<BotaoConta />} />

      <header className="cr-capa entra">
        <span className="cr-arte" aria-hidden="true">
          <IlustracaoServico tipo="curso" tamanho={72} />
        </span>
        <p className="cr-sobre">Curso com a {salao.contato}</p>
        <h1>{curso.nome}</h1>
        <p className="cr-chamada">{curso.chamada}</p>
        <div className="cr-acoes">
          <button type="button" className="botao-ouro" onClick={() => irParaForm()}>
            Quero fazer o curso
          </button>
          <Link className="botao-linha" href="/rede">
            Ver profissionais certificadas
          </Link>
        </div>
      </header>

      <main className="tela">
        <section className="bloco">
          <div className="bloco-cabeca">
            <h2>O que você aprende</h2>
            <span className="bloco-fio" aria-hidden="true" />
          </div>
          <ul className="cr-topicos">
            {curso.topicos.map((t) => (
              <li key={t}>
                <IconeCheck width="18" height="18" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section className="bloco">
          <div className="bloco-cabeca">
            <h2>Do curso à sua agenda</h2>
            <span className="bloco-fio" aria-hidden="true" />
          </div>
          <ol className="cr-caminho">
            {curso.caminho.map((p, i) => (
              <li key={p.titulo}>
                <span className="cr-num">{i + 1}</span>
                <span>
                  <strong>{p.titulo}</strong>
                  <small>{p.texto}</small>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="bloco">
          <div className="bloco-cabeca">
            <h2>Próximas turmas</h2>
            <span className="bloco-fio" aria-hidden="true" />
          </div>
          {turmas === null && <p className="bloco-vazio">Carregando turmas…</p>}
          {turmas?.length === 0 && (
            <p className="cr-sem-turma">
              Novas turmas em breve. Inscreva-se abaixo para entrar na lista de espera ou peça o curso individual.
            </p>
          )}
          <div className="cr-turmas">
            {turmas?.map((t) => {
              const restam = Math.max(0, t.vagas - t.ocupadas);
              return (
                <article key={t.id} className={`cr-turma vidro ${escolha === t.id ? "ativa" : ""}`}>
                  <div className="cr-turma-topo">
                    <h3>
                      {t.nome}
                      {t.demo && <em className="selo-exemplo">exemplo</em>}
                    </h3>
                    <span className={`chip ${restam <= 2 ? "chip-alerta" : ""}`}>
                      {restam === 0 ? "Esgotada" : `${restam} ${restam === 1 ? "vaga" : "vagas"}`}
                    </span>
                  </div>
                  <p className="cr-turma-data">{periodoTurma(t)}</p>
                  <p className="cr-turma-info">
                    {[t.horario, t.local || t.cidade].filter(Boolean).join(" · ")}
                  </p>
                  <p className="cr-turma-valor">{t.valor ? real(t.valor) : "Valor e formas de pagamento no WhatsApp"}</p>
                  <button type="button" className="botao-linha" disabled={restam === 0} onClick={() => irParaForm(t.id)}>
                    {restam === 0 ? "Turma completa" : "Escolher esta turma"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="bloco" id="inscricao" ref={form}>
          <div className="bloco-cabeca">
            <h2>Inscrição</h2>
            <span className="bloco-fio" aria-hidden="true" />
          </div>
          {feito ? (
            <div className="cr-feito vidro entra">
              <span className="reservado-icone" aria-hidden="true">✓</span>
              <h3>Inscrição recebida</h3>
              <p>A {salao.contato} vai te chamar no WhatsApp com os detalhes. Se preferir, adiante a conversa.</p>
              <a className="botao-ouro" href={whats} target="_blank" rel="noopener">
                <IconeConversa stroke="currentColor" />
                Falar com a {salao.contato}
              </a>
            </div>
          ) : (
            <form className="form cr-form" onSubmit={enviar}>
              <span className="cr-rotulo">Como você quer fazer</span>
              <div className="pilulas" role="radiogroup" aria-label="Formato do curso">
                {turmas?.filter((t) => t.ocupadas < t.vagas).map((t) => (
                  <button key={t.id} type="button" role="radio" aria-checked={escolha === t.id} onClick={() => setEscolha(t.id)}>
                    {t.nome}
                    <small>{dataDiaMes(t.data_inicio)}</small>
                  </button>
                ))}
                <button type="button" role="radio" aria-checked={escolha === "vip"} onClick={() => setEscolha("vip")}>
                  Individual (VIP)
                  <small>data combinada</small>
                </button>
              </div>

              <label htmlFor="cr-nome">Nome</label>
              <input id="cr-nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" />
              <label htmlFor="cr-cel">Celular com WhatsApp</label>
              <input id="cr-cel" inputMode="numeric" autoComplete="tel" value={celular} onChange={(e) => setCelular(mascaraCelular(e.target.value))} placeholder="(85) 90000-0000" />
              <label htmlFor="cr-cidade">Cidade</label>
              <input id="cr-cidade" autoComplete="address-level2" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Onde você atende ou vai atender" />

              <span className="cr-rotulo">Sua experiência</span>
              <div className="ordenar" role="radiogroup" aria-label="Experiência">
                {curso.experiencias.map((x) => (
                  <button key={x.codigo} type="button" role="radio" aria-pressed={experiencia === x.codigo} aria-checked={experiencia === x.codigo} onClick={() => setExperiencia(x.codigo)}>
                    {x.nome}
                  </button>
                ))}
              </div>

              <label htmlFor="cr-msg">Quer contar algo? (opcional)</label>
              <textarea id="cr-msg" rows={3} maxLength={500} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Ex.: prefiro aulas aos sábados" />

              {erro && <p className="erro">{erro}</p>}
              <button className="botao-ouro" type="submit" disabled={!valido || enviando}>
                {enviando ? "Enviando…" : escolha === "vip" ? "Pedir o curso individual" : "Garantir minha vaga"}
              </button>
              <p className="cr-nota">Sem pagamento agora. A {salao.contato} confirma a vaga com você pelo WhatsApp.</p>
            </form>
          )}
        </section>

        <Link href="/rede" className="cr-rede vidro">
          <span>
            <strong>Rede de profissionais certificadas</strong>
            <small>Veja quem já fez o {curso.nome} e onde atende.</small>
          </span>
          <IconeSeta />
        </Link>
      </main>
    </div>
  );
}
