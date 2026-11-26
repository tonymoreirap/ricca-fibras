// Entrar com Google. O Google só aceita endereços cadastrados, então o botão
// sempre passa pela página central (tonsdellas.com.br/google) e volta para o
// salão de origem com o comprovante, que o banco confere direto no Google.
const CENTRAL = "https://tonsdellas.com.br";
const CHAVE = "rica:google";

const dev = (h) => h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost") || h.endsWith(".vercel.app");

export function iniciarGoogle({ convite = "" } = {}) {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify({ nonce, convite, em: Date.now() }));
  } catch {}
  const central = dev(window.location.hostname) ? window.location.origin : CENTRAL;
  window.location.assign(`${central}/google?volta=${encodeURIComponent(window.location.origin)}&nonce=${nonce}`);
}

export function lerPedidoGoogle() {
  try {
    const p = JSON.parse(sessionStorage.getItem(CHAVE) || "null");
    return p && Date.now() - p.em < 30 * 60000 ? p : null;
  } catch {
    return null;
  }
}

export function limparPedidoGoogle() {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {}
}
