import Link from "next/link";
import RedirecionarLogado from "../components/RedirecionarLogado";

export default function Entrada() {
  return (
    <main className="entrada">
      <RedirecionarLogado />
      <img
        className="entrada-foto"
        src="/rica-fundo.webp"
        alt="Luana, da Rica Fibras, no salão com o logo dourado ao fundo"
        width="720"
        height="1080"
        fetchPriority="high"
      />
      <div className="entrada-painel">
        <h1>Bem-vinda à Rica Fibras</h1>
        <p>Acompanhe suas manutenções, seus horários e fale direto com a gente.</p>
        <div className="entrada-acoes">
          <Link className="botao-ouro" href="/entrar">
            Entrar
          </Link>
          <Link className="botao-vidro" href="/visitante">
            Continuar como visitante
          </Link>
        </div>
        <p className="entrada-nota">
          Primeira vez por aqui? <Link href="/entrar?nova=1">Criar minha conta</Link>
        </p>
      </div>
    </main>
  );
}
