// Degradês usados por todos os ícones (ouro e rosé). Fica uma vez no layout.
export default function Gradientes() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <linearGradient id="g-ouro" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22">
          <stop offset="0" stopColor="#F7E6B5" />
          <stop offset="0.55" stopColor="#D4AC62" />
          <stop offset="1" stopColor="#A87A35" />
        </linearGradient>
        <linearGradient id="g-ouro-48" gradientUnits="userSpaceOnUse" x1="4" y1="4" x2="44" y2="44">
          <stop offset="0" stopColor="#FBEDC4" />
          <stop offset="0.5" stopColor="#D4AC62" />
          <stop offset="1" stopColor="#9A6C2C" />
        </linearGradient>
        <linearGradient id="g-rose-48" gradientUnits="userSpaceOnUse" x1="14" y1="6" x2="34" y2="42">
          <stop offset="0" stopColor="#FBE3DF" />
          <stop offset="0.6" stopColor="#E4AFAB" />
          <stop offset="1" stopColor="#B97C7A" />
        </linearGradient>
        <linearGradient id="g-anel" gradientUnits="userSpaceOnUse" x1="10" y1="10" x2="110" y2="110">
          <stop offset="0" stopColor="#FBEDC4" />
          <stop offset="0.5" stopColor="#D4AC62" />
          <stop offset="1" stopColor="#E4AFAB" />
        </linearGradient>
      </defs>
    </svg>
  );
}
