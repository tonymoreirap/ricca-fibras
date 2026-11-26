"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BarraTopo from "../../components/BarraTopo";
import CampoSenha from "../../components/CampoSenha";
import { rpc } from "../../lib/supabase";
import { mascaraCelular } from "../../lib/formato";
import { lerSessao, salvarSessao } from "../../lib/sessao";
import { useSalao, LogoDe } from "../../components/Empresa";
import BotaoGoogle from "../../components/BotaoGoogle";
import { aContato, AContato, linkWhats } from "../../lib/empresa";

function Formulario() {
  const salao = useSalao();
  const router = useRouter();
  const busca = useSearchParams();
  const [modo, setModo] = useState(busca.get("nova") === "1" ? "criar" : "entrar");
  const convite = (busca.get("convite") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (lerSessao("admin")?.token) return router.replace("/admin");
    if (lerSessao("cliente")?.token) return router.replace("/cliente");
    try {
      const salvo = JSON.parse(localStorage.getItem("rica:cliente") || "null");
      if (salvo) {
        setNome(salvo.nome || "");
        setCelular(salvo.celular ? mascaraCelular(salvo.celular) : "");
      }
    } catch {}
    const c = (busca.get("c") || "").replace(/\D/g, "");
    if (c) setCelular(mascaraCelular(c));
  }, [router, busca]);

  // no "Já tenho conta" o mesmo campo aceita celular (cliente) ou e-mail (dona e equipe)
  const ehEmail = modo === "entrar" && /[a-z@]/i.test(celular);
  const digitos = celular.replace(/\D/g, "");
  const valido = ehEmail
    ? /^\S+@\S+\.\S+$/.test(celular.trim()) && senha.length > 0
    : digitos.length >= 10 && senha.length >= 6 && (modo === "entrar" || convite || nome.trim().length >= 2);

  async function enviar(e) {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      if (ehEmail) {
        const r = await rpc("admin_entrar", { p_email: celular.trim(), p_senha: senha });
        if (!r.ok) {
          if (r.primeiro_acesso) return router.push(`/admin/entrar?primeiro=1&email=${encodeURIComponent(celular.trim())}`);
          setErro(r.erro);
          setEnviando(false);
          return;
        }
        salvarSessao("admin", { token: r.token, nome: r.nome, papel: r.papel });
        return router.replace("/admin");
      }
      const r =
        modo === "entrar"
          ? await rpc("cliente_entrar", { p_celular: digitos, p_senha: senha })
          : await rpc("cliente_criar_conta", { p_nome: nome.trim(), p_celular: digitos, p_senha: senha, p_convite: convite || null });
      if (!r.ok) {
        setErro(r.erro);
        if (r.sem_conta) setModo("criar");
        if (r.tem_conta) setModo("entrar");
        setEnviando(false);
        return;
      }
      salvarSessao("cliente", { token: r.token, nome: r.nome, celular: digitos });
      router.replace("/cliente");
    } catch (e) {
      setErro("Não foi possível conectar. Verifique a internet e tente de novo.");
      setEnviando(false);
    }
  }

  const trocar = (m) => {
    setModo(m);
    setErro("");
  };

  return (
    <main className="tela tela-entrar">
      <LogoDe salao={salao} tamanho={112} className="entrar-monograma" />
      <h1>{modo === "entrar" ? "Entrar" : "Criar sua conta"}</h1>
      <p className="tela-sub">
        {modo === "entrar"
          ? "Clientes entram com o celular. A equipe do salão, com o e-mail."
          : "Seus horários, recibos e manutenções em um só lugar."}
      </p>

      <div className="alternar" role="tablist" aria-label="Escolha">
        <button type="button" role="tab" aria-selected={modo === "entrar"} onClick={() => trocar("entrar")}>
          Já tenho conta
        </button>
        <button type="button" role="tab" aria-selected={modo === "criar"} onClick={() => trocar("criar")}>
          Primeira vez
        </button>
      </div>

      <BotaoGoogle convite={convite} texto={convite ? "Ativar meu acesso com Google" : "Continuar com Google"} />

      <form className="form" onSubmit={enviar}>
        {modo === "criar" && convite && (
          <p className="convite-ok">{AContato(salao)} já fez o seu cadastro. Só falta criar a sua senha.</p>
        )}
        {modo === "criar" && !convite && (
          <>
            <label htmlFor="nome">Seu nome</label>
            <input id="nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como você gosta de ser chamada" />
          </>
        )}
        <label htmlFor="celular">{modo === "entrar" ? "Celular ou e-mail" : "Celular com WhatsApp"}</label>
        <input
          id="celular"
          inputMode={modo === "entrar" ? "email" : "numeric"}
          autoComplete={modo === "entrar" ? "username" : "tel"}
          autoCapitalize="none"
          placeholder={modo === "entrar" ? "(85) 90000-0000 ou seu@email.com" : "(85) 90000-0000"}
          value={celular}
          onChange={(e) => {
            const v = e.target.value;
            setCelular(modo === "entrar" && /[a-z@]/i.test(v) ? v.replace(/\s/g, "") : mascaraCelular(v));
          }}
        />
        <label htmlFor="senha">{modo === "entrar" ? "Senha" : "Crie uma senha"}</label>
        <CampoSenha
          id="senha"
          valor={senha}
          aoMudar={setSenha}
          nova={modo === "criar"}
          placeholder={modo === "entrar" ? "Sua senha" : "Pelo menos 6 caracteres"}
        />
        {erro && <p className="erro">{erro}</p>}
        <button className="botao-ouro" type="submit" disabled={!valido || enviando}>
          {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta e entrar"}
        </button>
      </form>

      {modo === "entrar" && (
        <p className="nota-senha">
          Esqueceu a senha? <a href={linkWhats(salao, `Oi, ${salao.contato}! Esqueci minha senha do app da ${salao.nome}.`) || `https://instagram.com/${salao.instagram}`} target="_blank" rel="noopener">Peça para {aContato(salao)} liberar</a> e crie uma nova em “Primeira vez”.
        </p>
      )}

      <p className="tela-rodape">
        Só quer conhecer? <Link href="/visitante">Continuar como visitante</Link>
      </p>
      <p className="tela-equipe">
        <Link href="/admin/entrar?primeiro=1">Equipe: recebeu um código de primeiro acesso?</Link>
      </p>
    </main>
  );
}

export default function Entrar() {
  return (
    <div className="app">
      <BarraTopo voltar="/" />
      <Suspense>
        <Formulario />
      </Suspense>
    </div>
  );
}
