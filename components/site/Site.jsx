import Link from "next/link";
import { Cabecalho, Rodape } from "./Moldura";
import Visitante from "./Visitante";
import GradePlanos from "./GradePlanos";
import { RECURSOS, precoPlano } from "../../lib/planos";
import { CONTATO, ENDERECO_RICA, whatsVendas } from "../../lib/plataforma";

// ---------- ícones de traço (24px) ----------
const I = ({ d, children }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d ? <path d={d} /> : children}
  </svg>
);
const ICONES = {
  agenda: <I><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17M8 14h2M12 14h2M8 17h2" /></I>,
  pix: <I><path d="M12 3.5 20.5 12 12 20.5 3.5 12Z" /><path d="m8.5 12 3.5 3.5 3.5-3.5L12 8.5Z" /></I>,
  equipe: <I><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2c2.3.1 4 1.6 4.5 4.3" /></I>,
  sino: <I><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></I>,
  promo: <I><path d="M3.5 12.5V4.5h8l9 9-8 8Z" /><circle cx="8" cy="9" r="1.4" /></I>,
  marca: <I><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-1 1.6-2.1-.5-1.3.4-2.4 1.8-2.4H17a3.5 3.5 0 0 0 3.5-3.5c0-5-3.8-9-8.5-9Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10.5" cy="7.5" r="1" /><circle cx="15" cy="8" r="1" /></I>,
  recibo: <I><path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8Z" /><path d="M9 8h6M9 11.5h6M9 15h3.5" /></I>,
  volta: <I><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /><path d="M12 8v4l2.5 2" /></I>,
  curso: <I><path d="m2.5 9 9.5-4.5L21.5 9 12 13.5Z" /><path d="M6.5 11v4.5c1.5 1.5 3.5 2.2 5.5 2.2s4-.7 5.5-2.2V11" /></I>,
  globo: <I><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.4 5.3 3.4 8.5s-1 6.1-3.4 8.5c-2.4-2.4-3.4-5.3-3.4-8.5s1-6.1 3.4-8.5Z" /></I>,
  celular: <I><rect x="6.5" y="2.5" width="11" height="19" rx="2.8" /><path d="M10.5 18.5h3" /></I>,
  google: <I><path d="M20 12.2c0-.6 0-1.2-.2-1.7H12v3.3h4.5a3.9 3.9 0 0 1-1.7 2.5v2.1h2.7c1.6-1.5 2.5-3.6 2.5-6.2Z" /><path d="M12 20.5c2.3 0 4.2-.8 5.5-2.1l-2.7-2.1c-.7.5-1.7.8-2.8.8a5 5 0 0 1-4.7-3.4H4.5v2.2A8.5 8.5 0 0 0 12 20.5Z" /><path d="M7.3 13.7a5 5 0 0 1 0-3.4V8.1H4.5a8.5 8.5 0 0 0 0 7.8Z" /><path d="M12 6.9c1.3 0 2.4.4 3.3 1.3l2.4-2.4A8.5 8.5 0 0 0 4.5 8.1l2.8 2.2A5 5 0 0 1 12 6.9Z" /></I>,
  escudo: <I><path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6Z" /><path d="m9 12 2.2 2.2L15.5 10" /></I>,
  conversa: <I><path d="M4 18.5 5.3 15A7.5 7.5 0 1 1 9 18.6Z" /><path d="M8.5 11h7M8.5 14h4" /></I>,
  livre: <I><path d="M7 11V8a5 5 0 0 1 9.6-2" /><rect x="4.5" y="11" width="15" height="10" rx="2.5" /></I>,
  check: <I d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <I d="M7 7l10 10M17 7 7 17" />,
};

// celular com uma captura de tela do app
function Celular({ src, alt, className = "", children, prioridade = false }) {
  return (
    <figure className={`st-cel ${className}`}>
      <span className="st-cel-ilha" aria-hidden="true" />
      {src && <img src={src} alt={alt} width="390" height="844" loading={prioridade ? "eager" : "lazy"} decoding="async" />}
      {children}
    </figure>
  );
}

const DESTAQUE_PLANO = {
  essencial: { para: "Para quem atende sozinha", itens: ["Agenda online 24h com sinal por Pix", "Página com serviços, valores e horários", "Área da cliente com recibos", "Sua logo, cores e endereço"] },
  profissional: { para: "Para estúdios e quem quer crescer", itens: ["Tudo do Essencial", "Até 3 profissionais, cada uma com a sua agenda", "Avisos no celular e resumo do dia", "Promoções com data e preço", "Cor exata da sua marca"] },
  salao: { para: "Para salões com equipe e cursos", itens: ["Tudo do Profissional", "Até 10 profissionais (+R$ 20 por extra)", "Curso, turmas e certificados com QR Code", "Domínio próprio (seusalao.com.br)", "Sem a assinatura “Feito com Tons Dellas”"] },
};

const COMPARAR = [
  ["Agenda online com sinal por Pix", ["essencial", "profissional", "salao"]],
  ["Clientes e agendamentos ilimitados", ["essencial", "profissional", "salao"]],
  ["Página do salão, recibos em PDF e área da cliente", ["essencial", "profissional", "salao"]],
  ["Profissionais com agenda própria", { essencial: "1", profissional: "até 3", salao: "até 10" }],
  [RECURSOS.push.nome, ["profissional", "salao"]],
  [RECURSOS.resumo.nome, ["profissional", "salao"]],
  [RECURSOS.promocoes.nome, ["profissional", "salao"]],
  [RECURSOS.cor_livre.nome, ["profissional", "salao"]],
  [RECURSOS.natal.nome, ["profissional", "salao"]],
  [RECURSOS.curso.nome, ["salao"]],
  [RECURSOS.rede.nome, ["salao"]],
  [RECURSOS.dominio.nome, ["salao"]],
  [RECURSOS.sem_assinatura.nome, ["salao"]],
];

const PERGUNTAS = [
  ["Preciso instalar alguma coisa?", "Não. O app abre pelo navegador, em qualquer celular, e a cliente pode colocá-lo na tela inicial com o ícone do seu salão. Nada de loja de aplicativos."],
  ["Minhas clientes pagam alguma coisa?", "Não. Para as clientes é grátis, e clientes e agendamentos são ilimitados em todos os planos."],
  ["Como recebo o sinal dos agendamentos?", "Direto na sua chave Pix. O app gera o QR Code com o valor certo do sinal; o dinheiro vai da cliente para você, sem passar pela gente e sem taxa nossa."],
  ["Como funciona o teste grátis?", "Você cria o app do seu salão e ele já vai ao ar, com tudo liberado por 7 dias. Não pedimos cartão. Se quiser continuar, assina pelo painel; se não, o app sai do ar sozinho e nada é cobrado."],
  ["Como pago a assinatura?", "Pelo Mercado Pago, com Pix, cartão de crédito ou boleto. Pode ser mensal ou anual: no anual, o 1º ano sai com 2 meses grátis e dá para parcelar em até 12x no cartão. A renovação é feita pelo próprio painel."],
  ["Tem fidelidade ou multa?", "Não. O plano é mensal: se não renovar, o app sai do ar para as clientes, mas seus dados ficam guardados e voltam quando você reativar."],
  ["Posso trocar de plano depois?", "Pode, a qualquer momento, pelo painel. Nada é apagado: o que sair do plano fica guardado e volta se você subir de novo."],
  ["Quanto tempo leva para começar?", "Uns 2 minutos para criar o app. Depois você coloca logo, serviços, preços, horários e Pix pelo painel, no seu ritmo, e manda o link para as clientes."],
  ["Posso usar o meu próprio domínio?", "Sim, no plano Salão: seusalao.com.br. Nos outros planos o endereço é seusalao.tonsdellas.com.br, já com cadeado de segurança."],
  ["E se eu tiver dúvida ou problema?", `Fale com a gente pelo WhatsApp ${CONTATO.whatsappTexto} ou pelo e-mail ${CONTATO.email}. É gente de verdade do outro lado.`],
];

export default function Site({ planos }) {
  const ordenados = [...planos].sort((a, b) => a.preco - b.preco);
  return (
    <div className="st">
      <Visitante />
      <Cabecalho />

      <main>
        {/* ---------------- capa ---------------- */}
        <section className="st-capa">
          <div className="st-in st-capa-in">
            <div className="st-capa-texto">
              <img src="/site/logo-tons-dellas.webp" alt="Tons Dellas" width="900" height="462" className="st-logo-capa" />
              <p className="st-capa-pre">Para manicures, estúdios e salões de beleza</p>
              <h1>O app de agendamento do seu salão, com a sua marca.</h1>
              <p className="st-capa-sub">
                Suas clientes agendam sozinhas, a qualquer hora, e pagam o sinal por Pix. Você acompanha tudo num painel simples, no
                celular. Chega de responder “tem horário?” às onze da noite.
              </p>
              <div className="st-capa-acoes">
                <a className="st-botao st-botao-g" href="/criar">Testar 7 dias grátis</a>
                <a className="st-botao st-botao-l" href="#video">Ver o vídeo (1 min)</a>
              </div>
              <p className="st-capa-nota">7 dias grátis · sem cartão · sem fidelidade</p>
            </div>
            <div className="st-capa-cena" aria-label="Telas do app: página do salão, agendamento e painel">
              <Celular className="st-cel-capa" prioridade>
                <div className="st-carrossel">
                  <img src="/site/vitrine-borboleta.webp" alt="" width="390" height="844" />
                  <img src="/site/agendar-1.webp" alt="" width="390" height="844" />
                  <img src="/site/agendar-2.webp" alt="" width="390" height="844" />
                  <img src="/site/recibo.webp" alt="" width="390" height="844" />
                  <img src="/site/painel-1.webp" alt="" width="390" height="844" />
                </div>
              </Celular>
              <div className="st-aviso st-aviso-1" aria-hidden="true">
                <span className="st-aviso-ic">{ICONES.agenda}</span>
                <span><strong>Novo agendamento</strong><small>Juliana · seg. 16h · com Bia</small></span>
              </div>
              <div className="st-aviso st-aviso-2" aria-hidden="true">
                <span className="st-aviso-ic st-aviso-ok">{ICONES.pix}</span>
                <span><strong>Sinal recebido</strong><small>R$ 51,00 por Pix</small></span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- antes e depois ---------------- */}
        <section className="st-sec st-antes">
          <div className="st-in">
            <h2 className="st-h2">Seu tempo é para atender, não para responder mensagem.</h2>
            <div className="st-antes-grade">
              <div className="st-antes-col">
                <h3>Agendando pelo WhatsApp</h3>
                <ul>
                  <li>{ICONES.x}Responder preço e horário o dia inteiro</li>
                  <li>{ICONES.x}Cliente marca e não aparece, sem sinal</li>
                  <li>{ICONES.x}Agenda no caderno, horário duplicado</li>
                  <li>{ICONES.x}Esquecer de chamar quem precisa de manutenção</li>
                </ul>
              </div>
              <div className="st-antes-col st-depois">
                <h3>Com o app do seu salão</h3>
                <ul>
                  <li>{ICONES.check}A cliente vê serviços, valores e horários livres</li>
                  <li>{ICONES.check}O horário só é reservado com o sinal por Pix</li>
                  <li>{ICONES.check}Uma agenda só, por profissional, sem conflito</li>
                  <li>{ICONES.check}Lembrete de manutenção na hora certa</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- como funciona ---------------- */}
        <section className="st-sec" id="como">
          <div className="st-in">
            <h2 className="st-h2">Como funciona</h2>
            <ol className="st-passos">
              <li>
                <span className="st-passo-n">1</span>
                <h3>Assine e crie o app</h3>
                <p>Escolha o plano, o nome e as cores. Em 2 minutos seu salão ganha um endereço: seusalao.tonsdellas.com.br.</p>
              </li>
              <li>
                <span className="st-passo-n">2</span>
                <h3>Deixe com a sua cara</h3>
                <p>Coloque sua logo, foto, serviços, preços, horários e a chave Pix. Tudo pelo painel, no celular.</p>
              </li>
              <li>
                <span className="st-passo-n">3</span>
                <h3>Mande o link</h3>
                <p>Coloque na bio do Instagram e envie no WhatsApp. A partir daí, as clientes agendam sozinhas.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* ---------------- vídeo ---------------- */}
        <section className="st-sec st-video" id="video">
          <div className="st-in st-video-in">
            <div>
              <h2 className="st-h2">Veja em 1 minuto</h2>
              <p className="st-texto">Da cliente que agenda sozinha, a qualquer hora, ao lucro do mês na palma da mão: é assim que fica o dia a dia com o app.</p>
              <a className="st-botao st-botao-g" href="#planos">Quero para o meu salão</a>
            </div>
            <Celular className="st-cel-video">
              <video src="/site/tons-dellas-video.mp4" poster="/site/tons-dellas-video-poster.jpg" controls playsInline preload="none" aria-label="Vídeo de 1 minuto mostrando o app" />
            </Celular>
          </div>
        </section>

        {/* ---------------- recursos em destaque ---------------- */}
        <section className="st-sec" id="recursos">
          <div className="st-in">
            <h2 className="st-h2">Tudo o que o seu salão precisa, num app só</h2>

            <article className="st-rec">
              <div className="st-rec-texto">
                <span className="st-rec-ic">{ICONES.agenda}</span>
                <h3>Agenda online, 24 horas</h3>
                <p>A cliente escolhe o serviço, com quem quer ser atendida, o dia e o horário. Só aparecem os horários livres de verdade, e nada de duas clientes no mesmo horário.</p>
                <ul className="st-lista">
                  <li>{ICONES.check}Horários de funcionamento e bloqueios do seu jeito</li>
                  <li>{ICONES.check}“Com quem?”: a cliente escolhe a profissional, ou qualquer uma</li>
                  <li>{ICONES.check}Você também marca horários pelo painel</li>
                </ul>
              </div>
              <div className="st-rec-telas">
                <Celular src="/site/agendar-1.webp" alt="Tela de agendamento: escolha da profissional e do dia" />
                <Celular src="/site/agendar-2.webp" alt="Tela de agendamento: horários livres do dia" className="st-cel-atras" />
              </div>
            </article>

            <article className="st-rec st-rec-inv">
              <div className="st-rec-texto">
                <span className="st-rec-ic">{ICONES.pix}</span>
                <h3>Sinal por Pix, direto para você</h3>
                <p>O horário só fica reservado com o sinal. O app gera o QR Code com o valor certo e o recibo em PDF, e o dinheiro cai na sua chave Pix, sem taxa nossa.</p>
                <ul className="st-lista">
                  <li>{ICONES.check}Percentual do sinal definido por serviço</li>
                  <li>{ICONES.check}Recibo com código e link para a cliente</li>
                  <li>{ICONES.check}Menos faltas e agenda mais cheia</li>
                </ul>
              </div>
              <div className="st-rec-telas">
                <Celular src="/site/recibo.webp" alt="Recibo com QR Code do Pix do sinal" />
              </div>
            </article>

            <article className="st-rec">
              <div className="st-rec-texto">
                <span className="st-rec-ic">{ICONES.celular}</span>
                <h3>Seu painel, na palma da mão</h3>
                <p>Agenda do dia por profissional, sinais pendentes, quanto já entrou no mês e quem está na hora da manutenção. Ao abrir, um resumo do que pede atenção.</p>
                <ul className="st-lista">
                  <li>{ICONES.check}Avisos no celular a cada reserva e Pix informado</li>
                  <li>{ICONES.check}Cadastro de clientes com histórico</li>
                  <li>{ICONES.check}Equipe com agendas separadas</li>
                </ul>
              </div>
              <div className="st-rec-telas">
                <Celular src="/site/painel-1.webp" alt="Painel da dona com números do mês e atalhos" />
                <Celular src="/site/painel-alerta.webp" alt="Resumo do dia com os horários de hoje" className="st-cel-atras" />
              </div>
            </article>

            <article className="st-rec st-rec-inv">
              <div className="st-rec-texto">
                <span className="st-rec-ic">{ICONES.marca}</span>
                <h3>Com a cara do seu salão</h3>
                <p>Seu nome, sua logo, sua foto e as suas cores. Nada de dividir tela com outros salões: a cliente entra no app do seu salão, e só dele.</p>
                <ul className="st-lista">
                  <li>{ICONES.check}8 paletas prontas ou a cor exata da sua marca</li>
                  <li>{ICONES.check}Endereço próprio: seusalao.tonsdellas.com.br</li>
                  <li>{ICONES.check}Ícone do salão na tela inicial do celular</li>
                </ul>
              </div>
              <div className="st-rec-telas st-rec-tres">
                <Celular src="/site/vitrine-livia.webp" alt="App com a paleta lavanda" />
                <Celular src="/site/vitrine-perola.webp" alt="App com a paleta pérola" />
                <Celular src="/site/vitrine-noite.webp" alt="App com a paleta noite" />
              </div>
            </article>

            <ul className="st-mais">
              {[
                ["sino", "Avisos e lembretes", "Notificações no seu celular e lembrete automático para a cliente."],
                ["promo", "Promoções com data", "Ofertas que entram e saem do ar sozinhas, com o preço já no agendamento."],
                ["equipe", "Equipe", "Cada profissional com a sua agenda e os serviços que faz."],
                ["volta", "Manutenções", "Saiba quem está no prazo de voltar e chame com um toque."],
                ["recibo", "Área da cliente", "Histórico, recibos e próximos horários, com login por celular ou Google."],
                ["curso", "Curso e certificados", "Venda turmas e emita certificados com QR Code de verificação."],
                ["globo", "Domínio próprio", "seusalao.com.br no plano Salão."],
                ["livre", "Sem instalar nada", "Funciona no navegador de qualquer celular e vira ícone na tela."],
              ].map(([ic, t, d]) => (
                <li key={t}>
                  <span className="st-mais-ic">{ICONES[ic]}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------- portes ---------------- */}
        <section className="st-sec st-portes" id="portes">
          <div className="st-in">
            <h2 className="st-h2">Do primeiro cliente à equipe completa</h2>
            <div className="st-portes-grade">
              {[
                ["Manicure que atende sozinha", "Pare de responder mensagem entre um atendimento e outro. A agenda se preenche enquanto você trabalha.", "essencial"],
                ["Estúdio com até 3 profissionais", "Cada uma com a sua agenda, avisos no celular e promoções para encher os horários vagos.", "profissional"],
                ["Salão com equipe e cursos", "Até 10 agendas, curso com certificados, domínio próprio e o app 100% com a sua marca.", "salao"],
              ].map(([t, d, c]) => {
                const pl = planos.find((p) => p.codigo === c);
                return (
                  <a key={c} className="st-porte" href={`/criar?plano=${c}`}>
                    <h3>{t}</h3>
                    <p>{d}</p>
                    <span className="st-porte-plano">Plano {pl?.nome || c}{pl ? ` · ${precoPlano(pl.preco)}/mês` : ""}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------- planos ---------------- */}
        <section className="st-sec st-planos" id="planos">
          <div className="st-in">
            <h2 className="st-h2">Planos e preços</h2>
            <p className="st-texto st-centro">Teste 7 dias grátis, sem cartão. Depois, mensal ou anual com 2 meses grátis. Clientes e agendamentos ilimitados em todos.</p>
            <GradePlanos planos={ordenados} destaques={DESTAQUE_PLANO} check={ICONES.check} />
            <p className="st-pagamento">
              {ICONES.escudo}
              <span>Comece grátis: o app vai ao ar na hora e você só paga se quiser continuar depois dos 7 dias. Pagamento seguro pelo <strong>Mercado Pago</strong>: Pix, cartão de crédito ou boleto.</span>
            </p>

            <details className="st-comparar">
              <summary>Comparar todos os recursos</summary>
              <div className="st-tabela-rolagem">
                <table className="st-tabela">
                  <thead>
                    <tr><th scope="col">Recurso</th>{ordenados.map((p) => <th key={p.codigo} scope="col">{p.nome}</th>)}</tr>
                  </thead>
                  <tbody>
                    {COMPARAR.map(([nome, quem]) => (
                      <tr key={nome}>
                        <th scope="row">{nome}</th>
                        {ordenados.map((p) => {
                          const v = Array.isArray(quem) ? quem.includes(p.codigo) : quem[p.codigo];
                          return (
                            <td key={p.codigo}>
                              {v === true ? <span className="st-sim" aria-label="Incluído">{ICONES.check}</span> : v ? v : <span className="st-nao" aria-label="Não incluído">–</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </section>

        {/* ---------------- caso real ---------------- */}
        <section className="st-sec st-caso">
          <div className="st-in st-caso-in">
            <Celular src="/site/rica.webp" alt="App da Rica Fibras, salão de alongamento em fibra de vidro em Fortaleza" className="st-cel-caso" />
            <div>
              <h2 className="st-h2">Nascido dentro de um salão de verdade</h2>
              <p className="st-texto">
                A Tons Dellas começou como o app da Rica Fibras, salão de alongamento em fibra de vidro em Fortaleza. Cada tela foi
                pensada no dia a dia de quem atende: agenda cheia, cliente pedindo horário no WhatsApp e sinal que não chega.
              </p>
              <p className="st-texto">Hoje, o mesmo app está disponível para o seu salão, com a sua marca.</p>
              <a className="st-botao st-botao-l" href={ENDERECO_RICA} target="_blank" rel="noopener">Conhecer o app da Rica Fibras</a>
            </div>
          </div>
        </section>

        {/* ---------------- confiança ---------------- */}
        <section className="st-sec st-confianca">
          <ul className="st-in st-confianca-grade">
            <li>{ICONES.escudo}<h3>Pagamento seguro</h3><p>Mensalidade pelo Mercado Pago. O sinal das clientes vai direto para o seu Pix.</p></li>
            <li>{ICONES.livre}<h3>Dados protegidos</h3><p>Senhas criptografadas e dados de cada salão separados, de acordo com a LGPD.</p></li>
            <li>{ICONES.volta}<h3>Sem fidelidade</h3><p>Plano mensal. Se parar, seus dados ficam guardados para quando voltar.</p></li>
            <li>{ICONES.conversa}<h3>Suporte de gente</h3><p>Atendimento pelo WhatsApp e e-mail, por quem conhece rotina de salão.</p></li>
          </ul>
        </section>

        {/* ---------------- dúvidas ---------------- */}
        <section className="st-sec" id="duvidas">
          <div className="st-in st-estreito">
            <h2 className="st-h2">Dúvidas frequentes</h2>
            <div className="st-faq">
              {PERGUNTAS.map(([p, r]) => (
                <details key={p}>
                  <summary>{p}</summary>
                  <p>{r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- chamada final ---------------- */}
        <section className="st-fim">
          <div className="st-in st-estreito">
            <h2>Seu salão merece um app à altura do seu trabalho.</h2>
            <p>Assine hoje e mande o link para as clientes ainda esta semana.</p>
            <div className="st-capa-acoes st-centro-flex">
              <a className="st-botao st-botao-g" href="/criar">Testar 7 dias grátis</a>
              <a className="st-botao st-botao-l" href={whatsVendas("Oi! Vi o site da Tons Dellas e quero tirar umas dúvidas sobre o app para o meu salão.")} target="_blank" rel="noopener">Tirar dúvidas no WhatsApp</a>
            </div>
          </div>
        </section>
      </main>

      <Rodape />
      <a className="st-barra-celular" href="/criar">Testar 7 dias grátis</a>
    </div>
  );
}
