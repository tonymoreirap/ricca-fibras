// Avisos no celular da equipe (Web Push)
import { rpc } from "./supabase";

const paraBytes = (b64) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bruto = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
};

const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalado = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

// "ativo" | "inativo" | "negado" | "instalar-ios" | "indisponivel"
export async function estadoPush() {
  if (typeof window === "undefined") return "indisponivel";
  if (ehIOS() && !instalado()) return "instalar-ios";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "indisponivel";
  if (Notification.permission === "denied") return "negado";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  return sub && Notification.permission === "granted" ? "ativo" : "inativo";
}

export async function ativarPush(token) {
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") throw new Error("Permissão de notificação não concedida.");
  const reg = await navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready);
  let chave = await rpc("push_chave_publica");
  if (!chave) {
    await fetch("/api/avisos/configurar").catch(() => {});
    chave = await rpc("push_chave_publica");
  }
  if (!chave) throw new Error("Os avisos ainda não estão prontos no servidor. Tente de novo em instantes.");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: paraBytes(chave) });
  const r = await rpc("admin_push_salvar", { p_token: token, p_inscricao: sub.toJSON() });
  if (!r.ok) throw new Error(r.erro);
}

export async function desativarPush(token) {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (!sub) return;
  await rpc("admin_push_remover", { p_token: token, p_endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}

export const testarPush = (token) => rpc("admin_push_teste", { p_token: token });
