// Paletas do app. Cada salão escolhe uma; a cor principal pode ser trocada à mão.
// Tudo vira variáveis CSS (:root) — o visual inteiro segue.

export const PALETAS = {
  "cafe-ouro": { nome: "Café e ouro", fundo: "#1a100c", superficie: "#2b1a13", texto: "#f5ece1", acento: "#d2aa5e", acento2: "#e4afab" },
  "noite-champanhe": { nome: "Noite e champanhe", fundo: "#11131a", superficie: "#1c1f29", texto: "#f3eee6", acento: "#d9c39b", acento2: "#b7c3d9" },
  "vinho-ouro": { nome: "Vinho e ouro", fundo: "#1a0a10", superficie: "#2a111b", texto: "#f7e9ea", acento: "#d6b067", acento2: "#eaa7b4" },
  "verde-salvia": { nome: "Verde sálvia", fundo: "#111a15", superficie: "#1b2820", texto: "#eef2ea", acento: "#b9cba2", acento2: "#e5c7a4" },
  lavanda: { nome: "Lavanda", fundo: "#16121f", superficie: "#221c2f", texto: "#f2ecf7", acento: "#c8b4e8", acento2: "#f1bfd1" },
  terracota: { nome: "Terracota", fundo: "#1c110d", superficie: "#2c1a13", texto: "#f7ebe2", acento: "#dd9169", acento2: "#ebc59c" },
  "grafite-prata": { nome: "Grafite e prata", fundo: "#111214", superficie: "#1c1e22", texto: "#eceef1", acento: "#c5cad2", acento2: "#e2b9b0" },
  "perola-rose": { nome: "Pérola e rosé", fundo: "#f7f0ec", superficie: "#fffaf7", texto: "#3b2623", acento: "#b8766c", acento2: "#c89a5a", claro: true },
};

export const PALETA_PADRAO = "cafe-ouro";

const hexRgb = (h) => {
  const n = parseInt(String(h).replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mistura = (a, b, t) => {
  const x = hexRgb(a), y = hexRgb(b);
  return rgbHex(x.map((v, i) => v + (y[i] - v) * t));
};
const canais = (h) => hexRgb(h).join(" ");
const luz = (h) => {
  const [r, g, b] = hexRgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const corValida = (c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);

// Variáveis CSS da paleta (+ cor principal opcional)
export function variaveisPaleta(paleta = PALETA_PADRAO, cor = null) {
  const p = PALETAS[paleta] || PALETAS[PALETA_PADRAO];
  const ac = corValida(cor) ? cor.toLowerCase() : p.acento;
  const original = paleta === PALETA_PADRAO && !corValida(cor);
  // em paleta clara, o "ouro claro" vira texto de destaque: precisa ser mais escuro que o fundo
  const brilho = mistura(ac, "#ffffff", p.claro ? 0.38 : 0.42);
  const claro = p.claro ? mistura(ac, p.texto, 0.32) : brilho;
  const escuro = mistura(ac, "#000000", 0.32);
  const tinta = luz(ac) > 0.32 ? mistura(p.fundo, "#000000", p.claro ? 0.7 : 0.25) : "#fffaf6";
  const v = {
    "--cafe": p.fundo,
    "--cafe-2": mistura(p.fundo, p.superficie, 0.45),
    "--superficie": p.superficie,
    "--superficie-2": mistura(p.superficie, p.texto, p.claro ? 0.06 : 0.07),
    "--superficie-3": mistura(p.superficie, ac, p.claro ? 0.14 : 0.2),
    "--fundo-fora": mistura(p.fundo, p.claro ? "#e8ded6" : "#000000", 0.45),
    "--champanhe": p.texto,
    "--claro-suave": mistura(p.texto, p.fundo, 0.25),
    "--apagado": mistura(p.texto, p.fundo, 0.45),
    "--ouro": ac,
    "--ouro-claro": claro,
    "--ouro-escuro": escuro,
    "--rose": p.acento2,
    "--rose-claro": p.claro ? mistura(p.acento2, "#000000", 0.45) : mistura(p.acento2, "#ffffff", 0.6),
    "--tinta": tinta,
    "--tinta-2": mistura(tinta, ac, 0.3),
    "--ouro-rgb": canais(ac),
    "--ouro-luz-rgb": canais(brilho),
    "--rose-rgb": canais(p.acento2),
    "--cafe-rgb": canais(p.fundo),
    "--champanhe-rgb": canais(p.texto),
    "--claro-rgb": canais(p.claro ? mistura(p.texto, ac, 0.2) : mistura(p.texto, ac, 0.25)),
    "--fio": `rgb(${canais(ac)} / 0.26)`,
    "--fio-forte": `rgb(${canais(ac)} / 0.55)`,
    "--folha-ouro": `linear-gradient(118deg, ${mistura(escuro, "#000000", 0.08)} 0%, ${mistura(ac, escuro, 0.15)} 18%, ${mistura(brilho, "#ffffff", 0.3)} 38%, ${ac} 52%, ${mistura(ac, escuro, 0.45)} 70%, ${brilho} 86%, ${escuro} 100%)`,
    // verde de "confirmado": claro no fundo escuro, escuro no fundo claro
    "--ok": p.claro ? "#1d6b38" : "#b5ecc2",
    "--ok-rgb": p.claro ? "29 107 56" : "159 220 171",
    "--esquema": p.claro ? "light" : "dark",
  };
  if (original) {
    // Rica: os tons exatos do desenho original
    Object.assign(v, {
      "--cafe-2": "#23150f", "--superficie-2": "#3a2419", "--superficie-3": "#573623", "--fundo-fora": "#0f0907",
      "--claro-suave": "#c9b7a5", "--apagado": "#94806f", "--ouro-claro": "#ecd49a", "--ouro-escuro": "#9a6c2c",
      "--rose-claro": "#ffd9d4", "--tinta": "#2a180c", "--tinta-2": "#4a2e15", "--ouro-luz-rgb": "246 227 176",
      "--claro-rgb": "255 236 210",
      "--folha-ouro": "linear-gradient(118deg, #8c6428 0%, #c9a35a 18%, #f6e3b0 38%, #d9b46a 52%, #b8893e 70%, #f1dca5 86%, #a57a38 100%)",
    });
  }
  return v;
}

export function cssPaleta(paleta, cor) {
  const v = variaveisPaleta(paleta, cor);
  return `:root{${Object.entries(v).map(([k, x]) => `${k}:${x}`).join(";")};color-scheme:${v["--esquema"]}}`;
}

export function aplicarPaleta(paleta, cor) {
  const v = variaveisPaleta(paleta, cor);
  const r = document.documentElement.style;
  for (const [k, x] of Object.entries(v)) r.setProperty(k, x);
}

export function corDeFundo(paleta) {
  return (PALETAS[paleta] || PALETAS[PALETA_PADRAO]).fundo;
}
