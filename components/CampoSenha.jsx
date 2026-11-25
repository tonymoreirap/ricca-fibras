"use client";

import { useState } from "react";
import { IconeOlho } from "./Icones";

export default function CampoSenha({ id, valor, aoMudar, nova = false, placeholder = "Sua senha" }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="campo-senha">
      <input
        id={id}
        type={ver ? "text" : "password"}
        autoComplete={nova ? "new-password" : "current-password"}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="campo-senha-ver"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? "Esconder senha" : "Mostrar senha"}
      >
        <IconeOlho fechado={ver} width="20" height="20" />
      </button>
    </div>
  );
}
