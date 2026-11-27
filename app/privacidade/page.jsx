import BarraTopo from "../../components/BarraTopo";
import { empresaDoPedido, plataformaDoPedido } from "../../lib/empresaServidor";
import { Cabecalho, Rodape } from "../../components/site/Moldura";
import { CONTATO } from "../../lib/plataforma";

function PrivacidadeSite() {
  return (
    <div className="st">
      <Cabecalho />
      <main className="st-pagina">
        <div className="st-in st-estreito">
          <h1>Política de privacidade</h1>
          <p className="st-data">Atualizada em 27 de novembro de 2026</p>
          <p>
            Esta política vale para o site tonsdellas.com.br e para os apps dos salões que usam a plataforma Tons Dellas. Explicamos,
            em linguagem simples, quais dados usamos e por quê, de acordo com a Lei Geral de Proteção de Dados (LGPD).
          </p>
          <h2>Donas de salão</h2>
          <ul>
            <li>Nome, e-mail, WhatsApp e senha (guardada criptografada), para criar e proteger o acesso ao painel.</li>
            <li>Dados do salão: nome, endereço, horários, serviços, preços, chave Pix, logo e fotos, para montar o app.</li>
            <li>Histórico de mensalidades. Os pagamentos são processados pelo Mercado Pago; não recebemos nem guardamos dados de cartão.</li>
          </ul>
          <h2>Clientes dos salões</h2>
          <p>
            Nome, celular, agendamentos, recibos e, se a cliente escolher, o e-mail da conta Google. Cada salão vê apenas as próprias
            clientes. Nesses dados, o salão é o controlador e a Tons Dellas trata as informações em nome dele, só para o app funcionar.
          </p>
          <h2>Formulário de contato</h2>
          <p>O que você escreve no formulário fica guardado para que possamos responder. Não usamos para outra finalidade.</p>
          <h2>Com quem compartilhamos</h2>
          <p>
            Não vendemos nem alugamos dados. Eles ficam em serviços de hospedagem contratados pela plataforma (Supabase e Vercel), e os
            pagamentos passam pelo Mercado Pago. Senhas são criptografadas e ninguém consegue lê-las.
          </p>
          <h2>Cookies e armazenamento</h2>
          <p>Usamos apenas o armazenamento do navegador necessário para manter você conectada ao app. Não usamos cookies de propaganda.</p>
          <h2>Contagem de visitas</h2>
          <p>
            Para saber quantas pessoas visitam o site e os apps dos salões, contamos cada visita de forma anônima: guardamos só o dia,
            a página de entrada, de onde a pessoa veio (por exemplo, Instagram) e se foi pelo celular. Não guardamos o seu IP nem usamos
            cookies para isso, e a contagem não permite identificar ninguém.
          </p>
          <h2>Seus direitos</h2>
          <p>
            Você pode pedir para ver, corrigir, levar ou apagar seus dados a qualquer momento: WhatsApp {CONTATO.whatsappTexto} ou{" "}
            <a href={`mailto:${CONTATO.email}`}>{CONTATO.email}</a>.
          </p>
        </div>
      </main>
      <Rodape />
    </div>
  );
}

export const metadata = { title: "Política de privacidade" };

export default async function Privacidade() {
  if (await plataformaDoPedido()) return <PrivacidadeSite />;
  const s = await empresaDoPedido();
  const salao = s?.nome || "o salão";
  return (
    <div className="app">
      <BarraTopo voltar="/" />
      <main className="tela privacidade">
        <h1>Política de privacidade</h1>
        <p className="privacidade-data">Atualizada em 26 de novembro de 2026</p>

        <p>
          Este app é usado por {salao} para agendamentos, recibos e acompanhamento das clientes. A plataforma é a Tons Dellas
          (tonsdellas.com.br), responsável pela tecnologia. Aqui explicamos, em linguagem simples, quais dados usamos e por quê.
        </p>

        <h2>Dados que coletamos</h2>
        <ul>
          <li>Nome e celular, para identificar você e enviar confirmações pelo WhatsApp.</li>
          <li>E-mail e nome da sua conta Google, só se você escolher entrar com o Google.</li>
          <li>Agendamentos, valores, sinais pagos e recibos.</li>
          <li>Senha, guardada de forma criptografada (ninguém consegue lê-la, nem o salão).</li>
        </ul>

        <h2>Para que usamos</h2>
        <ul>
          <li>Marcar, confirmar e lembrar seus horários.</li>
          <li>Mostrar seu histórico, recibos e a data da próxima manutenção.</li>
          <li>Permitir que você entre no app com segurança.</li>
        </ul>

        <h2>Com quem compartilhamos</h2>
        <p>
          Não vendemos nem alugamos seus dados. Eles ficam em serviços de hospedagem contratados pela plataforma (Supabase e
          Vercel) e só o salão em que você é cliente tem acesso a eles. Cada salão da plataforma vê apenas as próprias clientes.
        </p>

        <h2>Login com Google</h2>
        <p>
          Ao entrar com o Google, recebemos apenas seu nome, e-mail e um identificador da conta. Não temos acesso à sua senha
          do Google, aos seus e-mails, contatos ou arquivos.
        </p>

        <h2>Seus direitos (LGPD)</h2>
        <p>
          Você pode pedir a qualquer momento para ver, corrigir ou apagar seus dados. Fale com o salão pelo WhatsApp
          {s?.whatsapp ? ` (${s.contato})` : ""} ou escreva para tonymoreirap@gmail.com.
        </p>
      </main>
    </div>
  );
}
