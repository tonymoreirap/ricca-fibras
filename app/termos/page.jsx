import Link from "next/link";
import { Cabecalho, Rodape } from "../../components/site/Moldura";
import { CONTATO } from "../../lib/plataforma";

export const metadata = { title: "Termos de uso", description: "Regras de uso, assinatura, pagamento e cancelamento da Tons Dellas." };

export default function Termos() {
  return (
    <div className="st">
      <Cabecalho />
      <main className="st-pagina">
        <div className="st-in st-estreito">
          <h1>Termos de uso</h1>
          <p className="st-data">Atualizados em 27 de novembro de 2026</p>
          <p>
            Estes termos explicam como funciona a assinatura da Tons Dellas, a plataforma que cria o app de agendamento do seu salão.
            Ao assinar, você concorda com as regras abaixo. Se tiver dúvida, <Link href="/contato">fale com a gente</Link> antes de assinar.
          </p>

          <h2>1. O que é a Tons Dellas</h2>
          <p>
            A Tons Dellas oferece, por assinatura mensal, um app para salões de beleza, estúdios e profissionais autônomas: página do
            salão, agendamento online com sinal por Pix, painel de gestão e os demais recursos do plano contratado. Cada salão tem o
            seu próprio endereço e a sua marca.
          </p>

          <h2>2. Planos e preços</h2>
          <ul>
            <li>Os planos, preços e recursos estão na <Link href="/#planos">página de planos</Link>. O valor é mensal e cobrado antes do período de uso.</li>
            <li>Clientes e agendamentos são ilimitados em todos os planos. O número de profissionais com agenda própria depende do plano.</li>
            <li>No plano Salão, cada profissional além das 10 incluídas soma R$ 20 por mês.</li>
            <li>Se os preços mudarem, avisamos com pelo menos 30 dias de antecedência. O novo valor vale a partir da renovação seguinte.</li>
          </ul>

          <h2>3. Pagamento</h2>
          <ul>
            <li>A mensalidade é paga pelo Mercado Pago, com Pix, cartão de crédito ou boleto. Não guardamos dados de cartão.</li>
            <li>Na assinatura pelo site, o app do salão vai ao ar assim que o Mercado Pago aprova o primeiro pagamento.</li>
            <li>A renovação é feita pela dona, no painel, em “Meu plano”. Cada pagamento aprovado soma 1 mês ao vencimento.</li>
            <li>O sinal pago pelas clientes vai direto para a chave Pix do salão. A Tons Dellas não recebe, não retém e não cobra taxa sobre esses valores.</li>
          </ul>

          <h2>4. Atraso e suspensão</h2>
          <ul>
            <li>Passado o vencimento sem pagamento, o painel mostra o aviso de pagamento pendente e o app continua funcionando por 7 dias.</li>
            <li>Depois desses 7 dias, o app sai do ar para as clientes. A dona continua entrando no painel e, ao pagar, o app volta na hora.</li>
            <li>Os dados do salão ficam guardados por até 12 meses após a suspensão. Antes de qualquer exclusão, avisamos pelo e-mail cadastrado.</li>
          </ul>

          <h2>5. Arrependimento e cancelamento</h2>
          <ul>
            <li>
              Na primeira contratação, você pode desistir em até 7 dias a partir do pagamento e recebe o valor de volta integralmente,
              como garante o Código de Defesa do Consumidor (art. 49). Basta pedir pelo WhatsApp ou e-mail.
            </li>
            <li>Depois disso, você pode parar quando quiser, sem multa e sem fidelidade: basta não renovar. O período já pago continua valendo até o fim, sem devolução proporcional.</li>
          </ul>

          <h2>6. Responsabilidades do salão</h2>
          <ul>
            <li>O salão é responsável pelos serviços, preços, horários, promoções, textos e imagens que publica no app, e pelo atendimento às clientes.</li>
            <li>O salão deve usar os dados das clientes só para o atendimento e respeitar a Lei Geral de Proteção de Dados (LGPD). A Tons Dellas trata esses dados em nome do salão, para fazer o app funcionar.</li>
            <li>É proibido usar a plataforma para atividades ilegais, conteúdo ofensivo, cobranças indevidas ou envio de mensagens em massa não autorizadas. Nesses casos, a conta pode ser suspensa.</li>
            <li>A senha do painel é pessoal. Mantenha-a em segurança e avise a gente se suspeitar de uso indevido.</li>
          </ul>

          <h2>7. Responsabilidades da Tons Dellas</h2>
          <ul>
            <li>Manter o app funcionando, seguro e com cópias de segurança dos dados, com a maior disponibilidade possível.</li>
            <li>Paradas programadas para melhorias, quando necessárias, são feitas de preferência fora do horário comercial.</li>
            <li>A Tons Dellas não responde por faltas de clientes, por problemas nos serviços prestados pelo salão nem por instabilidades de terceiros (internet, bancos, Pix ou Mercado Pago).</li>
          </ul>

          <h2>8. Propriedade</h2>
          <p>
            O app, o código e a marca Tons Dellas pertencem à Tons Dellas. O nome, a logo, as fotos e o conteúdo do salão pertencem ao
            salão, que pode pedir uma cópia dos seus dados a qualquer momento.
          </p>

          <h2>9. Mudanças nestes termos</h2>
          <p>Quando estes termos mudarem, avisamos no painel e por e-mail. Continuar usando o app depois do aviso significa concordar com a nova versão.</p>

          <h2>10. Contato e foro</h2>
          <p>
            Tons Dellas · {CONTATO.cidade} · WhatsApp {CONTATO.whatsappTexto} · <a href={`mailto:${CONTATO.email}`}>{CONTATO.email}</a>.
            Fica eleito o foro da comarca de Fortaleza, CE, ressalvado o direito do consumidor de escolher o foro do seu domicílio.
          </p>
          <p>Veja também a nossa <Link href="/privacidade">política de privacidade</Link>.</p>
        </div>
      </main>
      <Rodape />
    </div>
  );
}
