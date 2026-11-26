"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { rpc } from "../../../lib/supabase";
import { salvarSessao } from "../../../lib/sessao";
import { mascaraCelular } from "../../../lib/formato";
import { lerPedidoGoogle, limparPedidoGoogle, iniciarGoogle } from "../../../lib/google";
import { useSalao, LogoDe } from "../../../components/Empresa";
import CampoSenha from "../../../components/CampoSenha";

export default function RetornoGoogle() {
  const salao = useSalao();
  const router = useRouter();
  const [estado, setEstado] = useState("conferindo");
  const [ticket, setTicket] = useState(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [celular, setCelular] = useState("");
  const [senha, setSenha] = useState("");
  const [pedeSenha, setPedeSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  function entrar(r) {
    limparPedidoGoogle();
    if (r.papel === "cliente") {
      salvarSessao("cliente", { token: r.token, nome: r.nome, celular: r.celular });
      router.replace("/cliente");
    } else {
      salvarSessao("admin", { token: r.token, nome: r.nome, papel: r.papel });
      router.replace("/admin");
    }
  }

  useEffect(() => {
    const c = new URLSearchParams(window.location.hash.slice(1)).get("c");
    // o comprovante sai do endereço na hora (não fica no histórico)
    window.history.replaceState(null, "", window.location.pathname);
    const pedido = lerPedidoGoogle();
    if (!c || !pedido) {
      setEstado("erro");
      setErro("O login com Google não foi concluído. Tente de novo.");
      return;
    }
    rpc("google_entrar", { p_credencial: c, p_nonce: pedido.nonce })
      .then((r) => {
        if (r.ok) return entrar(r);
        if (r.precisa_celular) {
          setTicket(r.ticket);
          setNome(r.nome || "");
          setEmail(r.email || "");
          setEstado("celular");
          return;
        }
        setErro(r.erro || "Não foi possível entrar com Google.");
        setEstado("erro");
      })
      .catch(() => {
        setErro("Não foi possível conectar. Verifique a internet e tente de novo.");
        setEstado("erro");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function vincular(e) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const r = await rpc("google_vincular", {
        p_ticket: ticket,
        p_celular: celular.replace(/\D/g, ""),
        p_nome: nome.trim(),
        p_senha: pedeSenha ? senha : null,
        p_convite: lerPedidoGoogle()?.convite || null,
      });
      if (r.ok) return entrar(r);
      if (r.pede_senha) setPedeSenha(true);
      if (r.expirou) setEstado("erro");
      setErro(r.erro);
    } catch {
      setErro("Não foi possível conectar. Verifique a internet e tente de novo.");
    }
    setEnviando(false);
  }

  const digitos = celular.replace(/\D/g, "");
  const valido = digitos.length >= 10 && nome.trim().length >= 2 && (!pedeSenha || senha.length > 0);

  return (
    <div className="app">
      <main className="tela tela-entrar">
        <LogoDe salao={salao} tamanho={96} className="entrar-monograma" />
        {estado === "conferindo" && (
          <>
            <h1>Entrando…</h1>
            <p className="tela-sub">Conferindo seu login com o Google.</p>
            <span className="pulso google-pulso" aria-hidden="true" />
          </>
        )}

        {estado === "celular" && (
          <>
            <h1>Falta só o celular</h1>
            <p className="tela-sub">
              É pelo celular que o salão encontra seus horários e recibos. Você só informa isso uma vez{email ? ` (${email})` : ""}.
            </p>
            <form className="form" onSubmit={vincular}>
              <label htmlFor="g-nome">Seu nome</label>
              <input id="g-nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} />
              <label htmlFor="g-cel">Celular com WhatsApp</label>
              <input id="g-cel" inputMode="numeric" autoComplete="tel" placeholder="(85) 90000-0000" value={celular} onChange={(e) => setCelular(mascaraCelular(e.target.value))} />
              {pedeSenha && (
                <>
                  <label htmlFor="g-senha">Sua senha do app</label>
                  <CampoSenha id="g-senha" valor={senha} aoMudar={setSenha} placeholder="A senha que você já usa" />
                </>
              )}
              {erro && <p className="erro">{erro}</p>}
              <button className="botao-ouro" type="submit" disabled={!valido || enviando}>
                {enviando ? "Aguarde…" : pedeSenha ? "Ligar ao Google e entrar" : "Continuar"}
              </button>
            </form>
          </>
        )}

        {estado === "erro" && (
          <>
            <h1>Não deu certo</h1>
            {erro && <p className="erro">{erro}</p>}
            <button type="button" className="botao-ouro google-tentar" onClick={() => iniciarGoogle({ convite: lerPedidoGoogle()?.convite || "" })}>
              Tentar de novo com Google
            </button>
            <p className="tela-rodape">
              <a href="/entrar">Entrar com celular e senha</a>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
