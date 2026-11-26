import Link from "next/link";
import RedirecionarLogado from "../components/RedirecionarLogado";
import { SoNoTema } from "../components/TemaSazonal";
import { LogoDe } from "../components/Empresa";
import { empresaDoPedido } from "../lib/empresaServidor";

export default async function Entrada() {
  const s = await empresaDoPedido();
  const rica = s.slug === "rica";
  return (
    <main className={`entrada ${s.fotoCapa ? "" : "entrada-sem-foto"}`}>
      <RedirecionarLogado />
      {s.fotoCapa ? (
        <img
          className="entrada-foto"
          src={s.fotoCapa}
          alt={rica ? "Luana, da Rica Fibras, no salão com o logo dourado ao fundo" : `${s.contato}, da ${s.nome}`}
          width="720"
          height="1080"
          fetchPriority="high"
        />
      ) : (
        <div className="entrada-marca" aria-hidden="true">
          <LogoDe salao={s} tamanho={168} />
        </div>
      )}
      <div className="entrada-painel">
        <SoNoTema>
          <p className="entrada-natal">Edição de Natal</p>
        </SoNoTema>
        <h1>{rica ? "Bem-vinda à Rica Fibras" : s.nome}</h1>
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
