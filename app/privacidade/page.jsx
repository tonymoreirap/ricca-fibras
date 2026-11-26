import BarraTopo from "../../components/BarraTopo";
import { empresaDoPedido } from "../../lib/empresaServidor";

export const metadata = { title: "Política de privacidade" };

export default async function Privacidade() {
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
