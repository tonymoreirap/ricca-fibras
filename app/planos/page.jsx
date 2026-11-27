import { rpcDoPedido } from "../../lib/empresaServidor";
import { cssPaleta } from "../../lib/paletas";
import { RECURSOS, linkVendas, precoPlano } from "../../lib/planos";
import { IconeCheck } from "../../components/Icones";

export const metadata = {
  title: "Tons Dellas · o app do seu salão, com a sua marca",
  description: "Agenda online com sinal por Pix, clientes, lembretes, promoções e curso, no app com a marca do seu salão.",
};

const ORDEM = ["agenda", "push", "resumo", "promocoes", "cor_livre", "natal", "curso", "rede", "dominio", "sem_assinatura"];
const BASE = [
  "Página do salão com serviços, valores e horários",
  "Agendamento online com sinal por Pix e recibo em PDF",
  "Área da cliente: histórico, recibos e próxima manutenção",
  "Painel com agenda, sinais, clientes e manutenções",
  "Login com Google, sua logo, cores e endereço próprio",
];

const PERGUNTAS = [
  ["Preciso instalar alguma coisa?", "Não. O app abre pelo navegador e pode ser adicionado à tela inicial do celular, com o ícone do seu salão."],
  ["As minhas clientes pagam algo?", "Não. Clientes e agendamentos são ilimitados em todos os planos."],
  ["Como recebo o sinal?", "Direto na sua chave Pix. O app gera o QR Code com o valor certo; o dinheiro não passa pela gente."],
  ["Posso trocar de plano depois?", "Pode, quando quiser. Nada é apagado: o que sair do plano fica guardado e volta se você subir de novo."],
  ["Tem período de teste?", "Sim: 30 dias grátis com os recursos do Profissional, sem cartão. Você cria o app sozinha em 2 minutos e só paga se quiser continuar."],
  ["Como pago a mensalidade?", "Pelo próprio app, com Pix, cartão ou boleto. Assim que o pagamento é aprovado, o plano renova sozinho."],
];

export default async function Planos() {
  const d = await rpcDoPedido("planos_publicos").catch(() => ({ planos: [], whatsapp: null }));
  const conversar = linkVendas(d.whatsapp, "Oi! Vi a página de planos da Tons Dellas e quero o app do meu salão.");
  return (
    <div className="app pl-pagina">
      <style dangerouslySetInnerHTML={{ __html: cssPaleta("cafe-ouro") }} />
      <header className="pl-topo">
        <span className="pl-marca">Tons Dellas</span>
        <a className="barra-link" href={conversar} target="_blank" rel="noopener">Falar com a gente</a>
      </header>

      <main className="tela">
        <section className="pl-capa">
          <h1>O app do seu salão, com a sua marca.</h1>
          <p>Suas clientes agendam e pagam o sinal por Pix num app com o seu nome, suas cores e o seu endereço. Sem dividir a tela com outros salões.</p>
          <a className="botao-ouro" href="/criar">Criar o app do meu salão</a>
          <small>30 dias grátis · sem cartão · sem fidelidade</small>
        </section>

        <section className="bloco">
          <div className="bloco-cabeca"><h2>Em todos os planos</h2><span className="bloco-fio" aria-hidden="true" /></div>
          <ul className="pl-base">
            {BASE.map((t) => <li key={t}><IconeCheck width="18" height="18" />{t}</li>)}
          </ul>
        </section>

        <section className="bloco">
          <div className="bloco-cabeca"><h2>Planos</h2><span className="bloco-fio" aria-hidden="true" /></div>
          <div className="planos-grade">
            {d.planos.map((pl, i) => (
              <article key={pl.codigo} className={`plano-cartao vidro ${i === 1 ? "plano-meu" : ""}`}>
                {i === 1 && <span className="plano-selo">Mais escolhido</span>}
                <h3 className="pl-nome">{pl.nome}</h3>
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
                <a className={i === 1 ? "botao-ouro" : "botao-linha"} href={`/criar?plano=${pl.codigo}`}>
                  Testar o {pl.nome} grátis
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="bloco">
          <div className="bloco-cabeca"><h2>Perguntas frequentes</h2><span className="bloco-fio" aria-hidden="true" /></div>
          <div className="pl-faq">
            {PERGUNTAS.map(([q, r]) => (
              <details key={q} className="vidro">
                <summary>{q}</summary>
                <p>{r}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="pl-fim">
          <h2>Veja um app funcionando</h2>
          <p>A Rica Fibras usa a Tons Dellas todos os dias.</p>
          <a className="botao-linha" href="https://tonsdellas.com.br/visitante" target="_blank" rel="noopener">Abrir o app da Rica Fibras</a>
          <a className="botao-ouro" href="/criar">Criar o app do meu salão</a>
          <a className="cs-link pl-falar" href={conversar} target="_blank" rel="noopener">Prefere conversar? Fale com a gente</a>
        </section>
      </main>
    </div>
  );
}
