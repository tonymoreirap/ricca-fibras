"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BarraTopo from "../../../components/BarraTopo";
import CampoSenha from "../../../components/CampoSenha";
import { rpc } from "../../../lib/supabase";
import { mascaraCelular } from "../../../lib/formato";
import { lerSessao, salvarSessao } from "../../../lib/sessao";
import { useSalao, LogoDe } from "../../../components/Empresa";

function Formulario() {
  const salao = useSalao();
  const router = useRouter();
  const busca = useSearchParams();
  const convite = (busca.get("convite") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const [celular, setCelular] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (lerSessao("profissional")?.token && !convite) return router.replace("/equipe");
    const c = (busca.get("c") || "").replace(/\D/g, "");
    if (c) setCelular(mascaraCelular(c));
  }, [router, busca, convite]);

  const digitos = celular.replace(/\D/g, "");
  const valido = digitos.length >= 10 && senha.length >= 6;

  async function enviar(e) {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      const r = convite
        ? await rpc("profissional_criar_senha", { p_celular: digitos, p_convite: convite, p_senha: senha })
        : await rpc("profissional_entrar", { p_celular: digitos, p_senha: senha });
      if (!r.ok) {
        setErro(r.erro);
        setEnviando(false);
        return;
      }
      salvarSessao("profissional", { token: r.token, nome: r.nome });
      router.replace("/equipe");
    } catch {
      setErro("Não foi possível conectar. Verifique a internet e tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <main className="tela tela-entrar">
      <LogoDe salao={salao} tamanho={96} className="entrar-monograma" />
      <h1>{convite ? "Crie sua senha" : "Agenda da equipe"}</h1>
      <p className="tela-sub">
        {convite
          ? `Seu acesso à agenda da ${salao.nome} foi liberado. Crie uma senha para entrar.`
          : `Entre com o celular que a dona da ${salao.nome} cadastrou para você.`}
      </p>
      <form className="form" onSubmit={enviar}>
        <label htmlFor="eq-celular">Seu celular</label>
        <input id="eq-celular" inputMode="numeric" autoComplete="tel" placeholder="(85) 90000-0000" value={celular} onChange={(e) => setCelular(mascaraCelular(e.target.value))} />
        <label htmlFor="eq-senha">{convite ? "Crie uma senha" : "Senha"}</label>
        <CampoSenha id="eq-senha" valor={senha} aoMudar={setSenha} nova={Boolean(convite)} placeholder={convite ? "Pelo menos 6 caracteres" : "Sua senha"} />
        {erro && <p className="erro">{erro}</p>}
        <button className="botao-ouro" type="submit" disabled={!valido || enviando}>
          {enviando ? "Aguarde…" : convite ? "Criar senha e entrar" : "Entrar"}
        </button>
      </form>
      {!convite && <p className="nota-senha">Esqueceu a senha? Peça à dona do salão um link novo.</p>}
    </main>
  );
}

export default function EntrarEquipe() {
  return (
    <div className="app">
      <BarraTopo voltar="/" />
      <Suspense>
        <Formulario />
      </Suspense>
    </div>
  );
}
