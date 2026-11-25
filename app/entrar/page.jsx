"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BarraTopo from "../../components/BarraTopo";
import CampoSenha from "../../components/CampoSenha";
import { rpc } from "../../lib/supabase";
import { mascaraCelular } from "../../lib/formato";
import { lerSessao, salvarSessao } from "../../lib/sessao";
import { salao } from "../../content/salao";

function Formulario() {
  const router = useRouter();
  const busca = useSearchParams();
  const [modo, setModo] = useState(busca.get("nova") === "1" ? "criar" : "entrar");
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (lerSessao("cliente")?.token) router.replace("/cliente");
    try {
      const salvo = JSON.parse(localStorage.getItem("rica:cliente") || "null");
      if (salvo) {
        setNome(salvo.nome || "");
        setCelular(salvo.celular ? mascaraCelular(salvo.celular) : "");
      }
    } catch {}
  }, [router]);

  const digitos = celular.replace(/\D/g, "");
  const valido =
    digitos.length >= 10 && senha.length >= 6 && (modo === "entrar" || nome.trim().length >= 2);

  async function enviar(e) {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      const r =
        modo === "entrar"
          ? await rpc("cliente_entrar", { p_celular: digitos, p_senha: senha })
          : await rpc("cliente_criar_conta", { p_nome: nome.trim(), p_celular: digitos, p_senha: senha });
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
      <img className="entrar-monograma" src="/monograma.webp" alt="" width="112" height="112" />
      <h1>{modo === "entrar" ? "Entrar" : "Criar sua conta"}</h1>
      <p className="tela-sub">
        {modo === "entrar"
          ? "Com o celular e a senha que você criou."
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

      <form className="form" onSubmit={enviar}>
        {modo === "criar" && (
          <>
            <label htmlFor="nome">Seu nome</label>
            <input id="nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como a Luana te chama" />
          </>
        )}
        <label htmlFor="celular">Celular com WhatsApp</label>
        <input
          id="celular"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(85) 90000-0000"
          value={celular}
          onChange={(e) => setCelular(mascaraCelular(e.target.value))}
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
          Esqueceu a senha? <a href={`https://wa.me/${salao.whatsapp}?text=${encodeURIComponent("Oi, Luana! Esqueci minha senha do app da Rica Fibras.")}`} target="_blank" rel="noopener">Peça para a Luana liberar</a> e crie uma nova em “Primeira vez”.
        </p>
      )}

      <p className="tela-rodape">
        Só quer conhecer? <Link href="/visitante">Continuar como visitante</Link>
      </p>
      <p className="tela-equipe">
        <Link href="/admin/entrar">Acesso da equipe</Link>
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
