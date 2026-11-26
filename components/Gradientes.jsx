// Degradês usados por todos os ícones. Seguem a paleta do salão (variáveis CSS).
export default function Gradientes() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <linearGradient id="g-ouro" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22">
          <stop offset="0" style={{ stopColor: "var(--ouro-claro)" }} />
          <stop offset="0.55" style={{ stopColor: "var(--ouro)" }} />
          <stop offset="1" style={{ stopColor: "var(--ouro-escuro)" }} />
        </linearGradient>
        <linearGradient id="g-ouro-48" gradientUnits="userSpaceOnUse" x1="4" y1="4" x2="44" y2="44">
          <stop offset="0" style={{ stopColor: "var(--ouro-claro)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--ouro)" }} />
          <stop offset="1" style={{ stopColor: "var(--ouro-escuro)" }} />
        </linearGradient>
        <linearGradient id="g-rose-48" gradientUnits="userSpaceOnUse" x1="14" y1="6" x2="34" y2="42">
          <stop offset="0" style={{ stopColor: "var(--rose-claro)" }} />
          <stop offset="0.6" style={{ stopColor: "var(--rose)" }} />
          <stop offset="1" style={{ stopColor: "var(--rose)" }} />
        </linearGradient>
        <linearGradient id="g-anel" gradientUnits="userSpaceOnUse" x1="10" y1="10" x2="110" y2="110">
          <stop offset="0" style={{ stopColor: "var(--ouro-claro)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--ouro)" }} />
          <stop offset="1" style={{ stopColor: "var(--rose)" }} />
        </linearGradient>
      </defs>
    </svg>
  );
}
