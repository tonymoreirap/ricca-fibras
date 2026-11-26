"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rpc } from "../../lib/supabase";
import { linkAgendar, aContato } from "../../lib/empresa";
import { useSalao, LogoDe } from "../../components/Empresa";
import { real, hora, dataLonga, FUSO } from "../../lib/formato";
import { STATUS, nivelDe, primeiroNome } from "../../lib/agenda";
import { lerSessao, limparSessao, sessaoExpirada } from "../../lib/sessao";
import MenuApp from "../../components/MenuApp";
import { SoNoTema } from "../../components/TemaSazonal";
import {
  IconeCalendario, IconeCoroa, IconeConversa,
  IconeSeta, IconeRecibo, IlustracaoServico,
} from "../../components/Icones";

const ICONE = { aplicacao: "fibra", manutencao: "manutencao" };
const ext = { target: "_blank", rel: "noopener" };
const curta = (d) =>
  new Date(d).toLocaleDateString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "short", year: "2-digit" }).replace(/\./g, "");
const mesAno = (d) =>
  new Date(d).toLocaleDateString("pt-BR", { timeZone: FUSO, month: "short", year: "numeric" }).replace(".", "").replace(" de ", "/");
const dataDia = (iso) =>
  new Date(`${iso}T12:00:00-03:00`).toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long" });

function saudacao() {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: FUSO, hour: "numeric", hour12: false }));
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function Anel({ feito, total }) {
  const r = 50;
  const volta = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, feito / total));
  const ang = p * 2 * Math.PI - Math.PI / 2;
  return (
    <svg className="anel" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r={r} className="anel-trilho" />
      <circle cx="60" cy="60" r={r} className="anel-progresso" strokeDasharray={volta} strokeDashoffset={volta * (1 - p)} transform="rotate(-90 60 60)" />
      <circle cx={60 + r * Math.cos(ang)} cy={60 + r * Math.sin(ang)} r="7" className="anel-brilho" />
      <circle cx={60 + r * Math.cos(ang)} cy={60 + r * Math.sin(ang)} r="3.6" className="anel-ponto" />
    </svg>
  );
}

function Manutencao({ m }) {
  const faltam = m.dias_restantes;
  const atrasada = faltam < 0;
  const quase = faltam <= 5;
  return (
    <section className="manut vidro entra" aria-labelledby="manut-titulo">
      <div className="manut-topo">
        <div className="manut-anel">
          <Anel feito={m.ciclo_dias - Math.max(0, faltam)} total={m.ciclo_dias} />
          <span className="manut-numero">
            {Math.abs(faltam)}
            <small>{Math.abs(faltam) === 1 ? "dia" : "dias"}</small>
          </span>
        </div>
        <div className="manut-texto">
          <span className={`chip ${quase ? "chip-alerta" : ""}`}>
            {atrasada ? "Passou do prazo" : quase ? "Quase na hora" : "Em dia"}
          </span>
          <h2 id="manut-titulo">{atrasada ? "Sua manutenção atrasou" : "Sua próxima manutenção"}</h2>
          <p>{atrasada ? `Era até ${dataDia(m.proxima)}` : `Até ${dataDia(m.proxima)}`}</p>
          <p className="manut-dia">Último atendimento em {curta(m.ultimo)} · ciclo de {m.ciclo_dias} dias</p>
        </div>
      </div>
      <Link className="botao-ouro" href="/agendar?servico=manutencao">
        <IconeCalendario stroke="currentColor" />
        Agendar manutenção
      </Link>
    </section>
  );
}

function Proximo({ a }) {
  const salao = useSalao();
  const st = STATUS[a.status];
  const pendente = a.status === "aguardando_sinal";
  return (
    <article className="proximo vidro entra">
      <div className="proximo-topo">
        <span className="proximo-arte" aria-hidden="true">
          <IlustracaoServico tipo={ICONE[a.servico] || "fibra"} tamanho={44} />
        </span>
        <span className="proximo-texto">
          <span className="proximo-rotulo">Seu próximo horário</span>
          <strong>{a.servico_nome}</strong>
        </span>
      </div>
      <p className="proximo-data">{dataLonga(a.inicio)}</p>
      <div className="proximo-linha">
        <p className="proximo-hora">
          {hora(a.inicio)} às {hora(a.fim)}
        </p>
        <span className={`chip ${st.classe}`}>{st.texto}</span>
      </div>
      {pendente ? (
        <>
          <p className="proximo-nota">Pague o sinal de {real(a.sinal)} via Pix para {aContato(salao)} confirmar.</p>
          <Link className="botao-ouro" href={`/recibo/${a.codigo}`}>
            Pagar sinal de {real(a.sinal)}
          </Link>
        </>
      ) : (
        <Link className="botao-linha" href={`/recibo/${a.codigo}`}>
          <IconeRecibo width="20" height="20" />
          Ver recibo
        </Link>
      )}
    </article>
  );
}

function ConfirmarNumero({ conta, token }) {
  const salao = useSalao();
  const [pedido, setPedido] = useState(Boolean(conta.confirmacao_pedida_em));
  const texto = `Oi, ${salao.contato}! Sou ${conta.nome}. Meu código de confirmação do app é ${conta.codigo}.`;
  const href = `https://wa.me/${salao.whatsapp}?text=${encodeURIComponent(texto)}`;
  const avisar = () => {
    setPedido(true);
    rpc("cliente_pedir_confirmacao", { p_token: token }).catch(() => {});
  };
  return (
    <section className="confirmar-numero vidro entra" aria-labelledby="cn-titulo">
      <h2 id="cn-titulo">Confirme que este número é seu</h2>
      <p>
        Este celular já tem histórico no salão. Para proteger os dados, envie o código abaixo para {aContato(salao)} pelo
        WhatsApp. Assim que ela conferir, seus atendimentos e recibos aparecem aqui.
      </p>
      <p className="cn-codigo" aria-label={`Código ${conta.codigo}`}>{conta.codigo}</p>
      {pedido ? (
        <>
          <p className="cn-enviado">Código enviado. Agora é só aguardar {aContato(salao)} confirmar.</p>
          <a className="link-botao cn-de-novo" href={href} target="_blank" rel="noopener" onClick={avisar}>Enviar de novo</a>
        </>
      ) : (
        <a className="botao-ouro" href={href} target="_blank" rel="noopener" onClick={avisar}>
          <IconeConversa stroke="currentColor" /> Enviar código pelo WhatsApp
        </a>
      )}
      <p className="cn-nota">Você já pode agendar normalmente enquanto isso.</p>
    </section>
  );
}

export default function Cliente() {
  const salao = useSalao();
  const router = useRouter();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [ola, setOla] = useState("Olá");

  useEffect(() => {
    setOla(saudacao());
    const s = lerSessao("cliente");
    if (!s?.token) {
      router.replace("/entrar");
      return;
    }
    rpc("cliente_area", { p_token: s.token })
      .then(setDados)
      .catch((e) => {
        if (sessaoExpirada(e)) {
          limparSessao("cliente");
          router.replace("/entrar");
        } else setErro("Não foi possível carregar seus dados. Verifique a internet.");
      });
  }, [router]);

  if (!dados) {
    return (
      <div className="app app-cliente">
        <main className="tela carregando-tela">
          {erro ? <p className="erro">{erro}</p> : <span className="pulso" aria-label="Carregando" />}
        </main>
      </div>
    );
  }

  const { conta, agendamentos, concluidos, manutencao } = dados;
  const agora = Date.now();
  const ativos = agendamentos
    .filter((a) => ["aguardando_sinal", "confirmado"].includes(a.status) && new Date(a.fim).getTime() > agora)
    .sort((x, y) => new Date(x.inicio) - new Date(y.inicio));
  const historico = agendamentos.filter((a) => !ativos.includes(a));
  const [proximo, ...outros] = ativos;

  return (
    <div className="app app-cliente">
      <header className="c-topo entra" id="topo">
        <div>
          <p className="c-saudacao">{ola},</p>
          <h1>{primeiroNome(conta.nome)}</h1>
        </div>
        <span className="avatar" aria-hidden="true">
          <span>{conta.nome[0]}</span>
        </span>
      </header>

      <main className="tela">
        <section className="cartao-rica entra" aria-label={`Cartão ${salao.nome}`}>
          <span className="cartao-brilho" aria-hidden="true" />
          <SoNoTema>
            <span className="cartao-natal">Boas festas</span>
          </SoNoTema>
          <div className="cartao-rica-topo">
            <LogoDe salao={salao} tamanho={46} />
            <span className="cartao-nivel">
              <IconeCoroa stroke="currentColor" width="16" height="16" />
              {nivelDe(conta.nivel, salao).texto}
            </span>
          </div>
          <p className="cartao-rica-nome">{conta.nome}</p>
          <div className="cartao-rica-rodape">
            <span>
              Cliente desde
              <strong>{mesAno(dados.cliente_desde || conta.criado_em)}</strong>
            </span>
            <span>
              Atendimentos
              <strong>{concluidos}</strong>
            </span>
          </div>
        </section>

        {conta.precisa_confirmar && <ConfirmarNumero conta={conta} token={lerSessao("cliente")?.token} />}

        {!conta.verificado && !conta.precisa_confirmar && (
          <p className="aviso-verificar">
            Seu histórico completo aparece aqui assim que {aContato(salao)} confirmar o seu primeiro sinal.
          </p>
        )}

        {proximo && <Proximo a={proximo} />}

        {outros.length > 0 && (
          <ul className="lista-mini">
            {outros.map((a) => (
              <li key={a.codigo}>
                <Link href={`/recibo/${a.codigo}`}>
                  <span>
                    <strong>{a.servico_nome}</strong>
                    <small>
                      {dataLonga(a.inicio)} · {hora(a.inicio)}
                    </small>
                  </span>
                  <span className={`chip ${STATUS[a.status].classe}`}>{STATUS[a.status].texto}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {manutencao ? (
          <Manutencao m={manutencao} />
        ) : (
          !proximo && (
            <section className="vazio vidro entra">
              <IlustracaoServico tipo="fibra" tamanho={64} />
              <h2>Seu primeiro horário</h2>
              <p>Escolha o dia e reserve com o sinal de 30% via Pix. A contagem da manutenção começa depois do atendimento.</p>
              <Link className="botao-ouro" href="/agendar">
                <IconeCalendario stroke="currentColor" />
                Agendar horário
              </Link>
            </section>
          )
        )}

        <section className="bloco" id="historico">
          <div className="bloco-cabeca">
            <h2>Atendimentos e recibos</h2>
            <span className="bloco-fio" aria-hidden="true" />
          </div>
          {historico.length === 0 ? (
            <p className="bloco-vazio">Os atendimentos concluídos aparecem aqui, com o recibo de cada um.</p>
          ) : (
            <ol className="linha-tempo">
              {historico.map((a) => (
                <li key={a.codigo} className={a.status === "cancelado" ? "linha-cancelada" : ""}>
                  <span className="linha-icone">
                    <IlustracaoServico tipo={ICONE[a.servico] || "fibra"} tamanho={26} />
                  </span>
                  <Link className="linha-texto" href={`/recibo/${a.codigo}`}>
                    <span className="linha-nome">
                      {a.servico_nome}
                      <small>
                        {a.status === "concluido" ? real(a.valor) : STATUS[a.status].texto} · Recibo {a.codigo}
                      </small>
                    </span>
                    <span className="linha-data">{curta(a.inicio)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
          <a className="botao-linha" href={linkAgendar(salao, `Oi, ${salao.contato}! Sou a ${primeiroNome(conta.nome)}.`)} {...ext}>
            <IconeConversa stroke="currentColor" width="20" height="20" />
            Falar com {aContato(salao)}
          </a>
        </section>
      </main>

      <MenuApp quem={{ tipo: "cliente" }} />
    </div>
  );
}
