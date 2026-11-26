"use client";

import { useEffect, useRef, useState } from "react";
import { LogoDe } from "../../components/Empresa";

export default function CentralGoogle({ clientId, nonce, volta, nome, logo }) {
  const caixa = useRef(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const iniciar = () => {
      const g = window.google?.accounts?.id;
      if (!g) return setErro("Não foi possível abrir o Google. Verifique a internet e tente de novo.");
      g.initialize({
        client_id: clientId,
        nonce,
        ux_mode: "popup",
        context: "signin",
        itp_support: true,
        use_fedcm_for_prompt: true,
        callback: (r) => {
          if (!r?.credential) return setErro("O Google não confirmou o login. Tente de novo.");
          window.location.replace(`${volta}/google/retorno#c=${encodeURIComponent(r.credential)}`);
        },
      });
      g.renderButton(caixa.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", locale: "pt-BR", width: 300 });
      g.prompt();
    };
    if (window.google?.accounts?.id) return iniciar();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = iniciar;
    s.onerror = () => setErro("Não foi possível abrir o Google. Verifique a internet e tente de novo.");
    document.head.appendChild(s);
  }, [clientId, nonce, volta]);

  return (
    <main className="tela tela-entrar google-central">
      <LogoDe salao={{ nome, logo }} tamanho={96} className="entrar-monograma" />
      <h1>Entrar em {nome}</h1>
      <p className="tela-sub">Escolha sua conta Google. Depois você volta direto para o app.</p>
      <div ref={caixa} className="google-oficial" />
      {erro && <p className="erro">{erro}</p>}
      <p className="tela-rodape">
        <a href={`${volta}/entrar`}>Voltar e entrar com celular e senha</a>
      </p>
    </main>
  );
}
