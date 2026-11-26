import { hojeISO } from "./formato";

// Tema de época ativo hoje (ex.: "natal") ou null para o visual padrão
export function temaDoDia(temas = {}, iso = hojeISO()) {
  const md = iso.slice(5);
  for (const [nome, t] of Object.entries(temas || {})) {
    if ((t.extra || []).some((p) => iso >= p.inicio && iso <= p.fim)) return nome;
    const a = t.anual;
    if (a && (a.inicio <= a.fim ? md >= a.inicio && md <= a.fim : md >= a.inicio || md <= a.fim)) return nome;
  }
  return null;
}
