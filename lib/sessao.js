// Sessões guardadas no aparelho. O token é aleatório e só o servidor sabe validá-lo.
const CHAVES = { cliente: "rica:sessao", admin: "rica:admin" };

export function lerSessao(tipo = "cliente") {
  try {
    return JSON.parse(localStorage.getItem(CHAVES[tipo]) || "null");
  } catch {
    return null;
  }
}

export function salvarSessao(tipo, dados) {
  try {
    localStorage.setItem(CHAVES[tipo], JSON.stringify(dados));
    if (tipo === "cliente" && dados?.celular) {
      localStorage.setItem("rica:cliente", JSON.stringify({ nome: dados.nome, celular: dados.celular }));
    }
  } catch {}
}

export function limparSessao(tipo = "cliente") {
  try {
    localStorage.removeItem(CHAVES[tipo]);
  } catch {}
}

export const sessaoExpirada = (e) => /sess[aã]o expirada/i.test(e?.message || "");
