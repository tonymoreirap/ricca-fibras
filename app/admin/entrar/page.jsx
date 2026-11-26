"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BarraTopo from "../../../components/BarraTopo";
import CampoSenha from "../../../components/CampoSenha";
import { rpc } from "../../../lib/supabase";
import { lerSessao, salvarSessao } from "../../../lib/sessao";
import { useSalao, LogoDe } from "../../../components/Empresa";
import BotaoGoogle from "../../../components/BotaoGoogle";

export default function EntrarEquipe() {
  const salao = useSalao();
  const router = useRouter();
  const [modo, setModo] = useState("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nova, setNova] = useState("");
  const [repetir, setRepetir] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (lerSessao("admin")?.token) return router.replace("/admin");
    const q = new URLSearchParams(window.location.search);
    if (q.get("primeiro") === "1") setModo("primeiro");
    if (q.get("email")) setEmail(q.get("email"));
  }, [router]);

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const valido =
    modo === "entrar"
      ? emailOk && senha.length > 0
      : emailOk && codigo.replace(/[^a-z0-9]/gi, "").length === 8 && nova.length >= 8 && nova === repetir;

  async function enviar(e) {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      const limpo = codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const r =
        modo === "entrar"
          ? await rpc("admin_entrar", { p_email: email.trim(), p_senha: senha })
          : await rpc("admin_primeiro_acesso", {
              p_email: email.trim(),
              p_codigo: `${limpo.slice(0, 4)}-${limpo.slice(4)}`,
              p_senha: nova,
            });
      if (!r.ok) {
        setErro(r.erro);
        if (r.primeiro_acesso) setModo("primeiro");
        setEnviando(false);
        return;
      }
      salvarSessao("admin", { token: r.token, nome: r.nome, papel: r.papel });
      router.replace("/admin");
    } catch {
      setErro("Não foi possível conectar. Verifique a internet e tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <div className="app">
      <BarraTopo voltar="/entrar" />
      <main className="tela tela-entrar">
        <LogoDe salao={salao} tamanho={112} className="entrar-monograma" />
        <h1>{modo === "entrar" ? "Painel da equipe" : "Primeiro acesso"}</h1>
        <p className="tela-sub">
          {modo === "entrar"
            ? "Agenda, sinais, clientes e manutenções."
            : "Use o código que você recebeu e crie a sua senha."}
        </p>

        {modo === "entrar" && <BotaoGoogle texto="Entrar com Google" />}

        <form className="form" onSubmit={enviar}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
          {modo === "entrar" ? (
            <>
              <label htmlFor="senha">Senha</label>
              <CampoSenha id="senha" valor={senha} aoMudar={setSenha} />
            </>
          ) : (
            <>
              <label htmlFor="codigo">Código de acesso</label>
              <input
                id="codigo"
                autoComplete="one-time-code"
                autoCapitalize="characters"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 9))}
                placeholder="XXXX-XXXX"
                className="campo-codigo"
              />
              <label htmlFor="nova">Nova senha</label>
              <CampoSenha id="nova" valor={nova} aoMudar={setNova} nova placeholder="Pelo menos 8 caracteres" />
              <label htmlFor="repetir">Repita a senha</label>
              <CampoSenha id="repetir" valor={repetir} aoMudar={setRepetir} nova placeholder="Igual à de cima" />
              {repetir && nova !== repetir && <p className="dica-erro">As senhas não são iguais.</p>}
            </>
          )}
          {erro && <p className="erro">{erro}</p>}
          <button className="botao-ouro" type="submit" disabled={!valido || enviando}>
            {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar no painel" : "Criar senha e entrar"}
          </button>
        </form>

        <p className="tela-rodape">
          {modo === "entrar" ? (
            <>
              Recebeu um código?{" "}
              <button type="button" className="link-botao" onClick={() => { setModo("primeiro"); setErro(""); }}>
                Fazer primeiro acesso
              </button>
            </>
          ) : (
            <>
              Já criou sua senha?{" "}
              <button type="button" className="link-botao" onClick={() => { setModo("entrar"); setErro(""); }}>
                Entrar
              </button>
            </>
          )}
        </p>
      </main>
    </div>
  );
}
