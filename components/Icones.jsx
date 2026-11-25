// Ícones de interface: traço com degradê dourado (definido em Gradientes.jsx).
const base = (props) => ({
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "url(#g-ouro)",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  ...props,
});

export const IconeConversa = (p) => (
  <svg {...base(p)}>
    <path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.5-4.3A8.5 8.5 0 1 1 20.5 11.5Z" />
    <circle cx="8.5" cy="11.5" r="0.6" fill="url(#g-ouro)" />
    <circle cx="12" cy="11.5" r="0.6" fill="url(#g-ouro)" />
    <circle cx="15.5" cy="11.5" r="0.6" fill="url(#g-ouro)" />
  </svg>
);
export const IconeCalendario = (p) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <path d="M12 12.6l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3Z" fill="url(#g-ouro)" stroke="none" />
  </svg>
);
export const IconeBrilho = (p) => (
  <svg {...base(p)}>
    <path d="M11 2.5l1.9 5.6 5.6 1.9-5.6 1.9L11 17.5l-1.9-5.6-5.6-1.9 5.6-1.9Z" />
    <path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" fill="url(#g-ouro)" stroke="none" />
  </svg>
);
export const IconeCurso = (p) => (
  <svg {...base(p)}>
    <path d="M2.5 9 12 4.5 21.5 9 12 13.5Z" />
    <path d="M6.5 11v5c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-5" />
    <path d="M21.5 9v5.5" />
  </svg>
);
export const IconeCamera = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="5.5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.3" cy="6.7" r="0.9" fill="url(#g-ouro)" stroke="none" />
  </svg>
);
export const IconeRelogio = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.75" />
    <path d="M12 7.25V12l3.25 2" />
  </svg>
);
export const IconeCoroa = (p) => (
  <svg {...base(p)}>
    <path d="M4 17.5 3 7.5l5 4 4-6 4 6 5-4-1 10Z" />
    <path d="M5 20.5h14" />
  </svg>
);
export const IconeCasa = (p) => (
  <svg {...base(p)}>
    <path d="M3.5 10.5 12 3.5l8.5 7V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19Z" />
  </svg>
);
export const IconeHistorico = (p) => (
  <svg {...base(p)}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
    <path d="M3.5 3.5V8H8" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const IconeUsuario = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20.5c1.5-3.8 4.5-5.5 8-5.5s6.5 1.7 8 5.5" />
  </svg>
);
export const IconeSeta = (p) => (
  <svg {...base({ width: 18, height: 18, ...p })}>
    <path d="M9 5.5l6.5 6.5L9 18.5" />
  </svg>
);
export const IconeVoltar = (p) => (
  <svg {...base(p)} stroke="currentColor">
    <path d="M15 5.5 8.5 12l6.5 6.5" />
  </svg>
);
export const IconeSair = (p) => (
  <svg {...base(p)}>
    <path d="M14 3.5h4A2.5 2.5 0 0 1 20.5 6v12a2.5 2.5 0 0 1-2.5 2.5h-4" />
    <path d="M10 7.5 5.5 12l4.5 4.5M5.5 12H16" />
  </svg>
);

export const IconeOlho = ({ fechado, ...p }) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
    {fechado && <path d="M4 20 20 4" />}
  </svg>
);
export const IconeMais = (p) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconeBusca = (p) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);
export const IconeCheck = (p) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const IconeCadeado = (p) => (
  <svg {...base(p)}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <circle cx="12" cy="15.5" r="1.2" fill="url(#g-ouro)" />
  </svg>
);
export const IconeRecibo = (p) => (
  <svg {...base(p)}>
    <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4Z" />
    <path d="M9 8h6M9 11.5h6M9 15h3.5" />
  </svg>
);

export const IconeSino = (p) => (
  <svg {...base(p)}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    <path d="M12 3v2" />
  </svg>
);

/* ---------- ilustrações dos serviços (48×48, ouro + rosé) ---------- */
const ilus = { width: 48, height: 48, viewBox: "0 0 48 48", fill: "none", "aria-hidden": true };
const contorno = { stroke: "url(#g-ouro-48)", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

const Unha = ({ x = 0, y = 0, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path
      d="M24 5c7.5 0 11.5 8.5 11.5 19v13.5a4.5 4.5 0 0 1-4.5 4.5H17a4.5 4.5 0 0 1-4.5-4.5V24C12.5 13.5 16.5 5 24 5Z"
      fill="url(#g-rose-48)"
      {...contorno}
    />
    <path d="M18.5 21c1-6 2.6-9.5 5-11" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
  </g>
);

export function IlustracaoServico({ tipo, tamanho = 48 }) {
  const t = { ...ilus, width: tamanho, height: tamanho };
  switch (tipo) {
    case "fibra":
      return (
        <svg {...t}>
          <Unha />
          <path d="M16 33c4-4 10-6 16-5.5M16.5 37c4.5-3 9.5-4.3 15-4M17 29c3.5-3.8 8.5-6 14-6" stroke="url(#g-ouro-48)" strokeWidth="1" strokeLinecap="round" opacity="0.95" />
          <path d="M39 6.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9Z" fill="url(#g-ouro-48)" />
        </svg>
      );
    case "manutencao":
      return (
        <svg {...t}>
          <Unha x={9} y={9} s={0.62} />
          <path d="M40 22a16 16 0 0 1-28.5 10" {...contorno} />
          <path d="M8 26A16 16 0 0 1 36.5 16" {...contorno} />
          <path d="M37.5 10.5l-1 5.6-5.4-1.4M10.5 37.5l1-5.6 5.4 1.4" {...contorno} />
        </svg>
      );
    case "gel":
      return (
        <svg {...t}>
          <rect x="19" y="4" width="10" height="14" rx="2.5" fill="url(#g-ouro-48)" />
          <path d="M20.5 8h7M20.5 11.5h7" stroke="#6b4a24" strokeOpacity="0.35" strokeWidth="1" />
          <path d="M14 22a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v15.5a6.5 6.5 0 0 1-6.5 6.5h-7A6.5 6.5 0 0 1 14 37.5Z" fill="url(#g-rose-48)" {...contorno} />
          <path d="M18.5 24v10" stroke="#fff" strokeOpacity="0.65" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M38.5 26c1.8 2.4 2.7 4 2.7 5.2a2.7 2.7 0 0 1-5.4 0c0-1.2.9-2.8 2.7-5.2Z" fill="url(#g-ouro-48)" />
        </svg>
      );
    case "manicure":
      return (
        <svg {...t}>
          <Unha x={2} y={8} s={0.72} />
          <Unha x={17} y={4} s={0.72} />
          <path d="M8 43.5 41 10.5" stroke="url(#g-ouro-48)" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M14 37.5l1.3 1.3M19 32.5l1.3 1.3M24 27.5l1.3 1.3M29 22.5l1.3 1.3M34 17.5l1.3 1.3" stroke="#6b4a24" strokeOpacity="0.45" strokeWidth="0.9" />
        </svg>
      );
    case "sobrancelha":
      return (
        <svg {...t}>
          <path d="M5 21c6-8.5 19-11 33-5.5 1.8.7 3.4 1.8 4.5 3.2-11-2.6-23.4-1.6-37.5 2.3Z" fill="url(#g-ouro-48)" />
          <path d="M8 33c4.5-5.5 9.8-8 16-8s11.5 2.5 16 8c-4.5 5.5-9.8 8-16 8S12.5 38.5 8 33Z" {...contorno} />
          <circle cx="24" cy="33" r="4.8" fill="url(#g-rose-48)" {...contorno} />
          <circle cx="22.5" cy="31.5" r="1.2" fill="#fff" fillOpacity="0.8" />
          <path d="M12 39.5l-2 3M17 41l-1 3.2M24 41.8v3.3M31 41l1 3.2M36 39.5l2 3" {...contorno} strokeWidth="1.3" />
        </svg>
      );
    case "curso":
      return (
        <svg {...t}>
          <path d="M4 18 24 8l20 10-20 10Z" fill="url(#g-ouro-48)" />
          <path d="M12 23v9.5c0 3.3 5.4 6 12 6s12-2.7 12-6V23" {...contorno} />
          <path d="M44 18v11" {...contorno} />
          <circle cx="44" cy="31" r="2" fill="url(#g-rose-48)" />
        </svg>
      );
    default:
      return null;
  }
}
