// Ícones simples em traço, herdam a cor do texto.
const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const IconeConversa = () => (
  <svg {...base}>
    <path d="M20 11.5a8 8 0 0 1-11.7 7.1L4 20l1.4-4.1A8 8 0 1 1 20 11.5Z" />
    <path d="M9 10.5h6M9 13.5h4" />
  </svg>
);
export const IconeBrilho = () => (
  <svg {...base}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
    <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" />
  </svg>
);
export const IconeCurso = () => (
  <svg {...base}>
    <path d="M3 9l9-4 9 4-9 4-9-4Z" />
    <path d="M7 11v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V11" />
  </svg>
);
export const IconeInstagram = () => (
  <svg {...base}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
  </svg>
);
export const IconeSeta = () => (
  <svg {...base} width="18" height="18">
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const IconeVoltar = () => (
  <svg {...base}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);
export const IconeRelogio = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const IconeCasa = () => (
  <svg {...base}>
    <path d="M4 10.5 12 4l8 6.5V20h-5v-5.5H9V20H4Z" />
  </svg>
);
export const IconeLista = () => (
  <svg {...base}>
    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
  </svg>
);
export const IconeSair = () => (
  <svg {...base}>
    <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
    <path d="M10 8l-4 4 4 4M6 12h10" />
  </svg>
);
