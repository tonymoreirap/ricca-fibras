"use client";

import { usePathname } from "next/navigation";
import { useSalao } from "./Empresa";
import { linkWhats } from "../lib/empresa";

// App fora do ar (desligado pelo Master ou plano suspenso): as clientes veem o
// aviso; a dona continua entrando no painel para regularizar.
const LIVRES = ["/admin", "/master", "/entrar", "/google", "/planos", "/privacidade"];

export default function Bloqueio({ children }) {
  const salao = useSalao();
  const rota = usePathname() || "/";
  const fora = !salao.ativa || salao.suspensa;
  if (!fora || LIVRES.some((p) => rota === p || rota.startsWith(`${p}/`))) return children;
  const whats = linkWhats(salao, `Oi, ${salao.contato}! Tentei agendar pelo app.`);
  return (
    <main className="sem-salao">
      <h1>{salao.nome}</h1>
      <p>O app está temporariamente fora do ar. Para agendar, fale com o salão.</p>
      {whats && <a className="botao-ouro" href={whats} target="_blank" rel="noopener">Falar pelo WhatsApp</a>}
      <a className="sem-salao-dona" href="/admin/entrar">Sou a dona do salão</a>
    </main>
  );
}
