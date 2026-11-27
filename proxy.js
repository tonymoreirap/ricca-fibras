import { NextResponse } from "next/server";
import { ehPlataforma, ehRotaSite, SITE } from "./lib/plataforma";

// tonsdellas.com.br é o site de vendas. Caminhos de salão que chegarem lá
// (links antigos da Rica Fibras, app instalado) vão para /mudou, que leva a
// cliente para o endereço novo sem perder o login.
// Nos salões, as páginas de venda apontam para o site principal.
export function proxy(req) {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim().toLowerCase();
  const { pathname, search } = req.nextUrl;
  const local = host.includes("localhost");

  if (ehPlataforma(host)) {
    if (host.startsWith("www.")) return NextResponse.redirect(`${SITE}${pathname}${search}`, 308);
    if (ehRotaSite(pathname)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/mudou";
    url.search = `?para=${encodeURIComponent(pathname + search)}`;
    return NextResponse.rewrite(url);
  }

  if (/^\/(criar|termos|contato)(\/|$)/.test(pathname)) {
    const base = local ? `http://tonsdellas.localhost${host.match(/:\d+$/)?.[0] || ""}` : SITE;
    return NextResponse.redirect(`${base}${pathname}${search}`, 307);
  }
  return NextResponse.next();
}

export const config = {
  // tudo, menos arquivos do Next e arquivos com extensão (imagens, sw.js, manifest...)
  matcher: ["/((?!_next/|api/|.*\\.[a-z0-9]+$).*)"],
};
