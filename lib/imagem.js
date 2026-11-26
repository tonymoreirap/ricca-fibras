// Reduz a imagem no próprio celular antes de enviar (capa e logo)
function carregar(arquivo) {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => ok({ img, url });
    img.onerror = () => falha(new Error("Não consegui abrir essa imagem. Tente outra (JPG ou PNG)."));
    img.src = url;
  });
}

const paraBlob = (canvas, tipo, q) => new Promise((ok) => canvas.toBlob(ok, tipo, q));

const base64 = (blob) =>
  new Promise((ok) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1]);
    r.readAsDataURL(blob);
  });

// capa: até 1080 de altura, WebP (ou JPEG se o navegador não fizer WebP)
// logo: quadrado de 512, PNG (mantém o fundo transparente e serve no PDF)
export async function prepararImagem(arquivo, tipo) {
  if (!arquivo?.type?.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  const { img, url } = await carregar(arquivo);
  try {
    const c = document.createElement("canvas");
    const g = c.getContext("2d");
    if (tipo === "logo") {
      const lado = 512;
      c.width = c.height = lado;
      const escala = Math.min(lado / img.width, lado / img.height);
      const w = img.width * escala, h = img.height * escala;
      g.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h);
      const b = await paraBlob(c, "image/png");
      return { mime: "image/png", base64: await base64(b), previa: URL.createObjectURL(b) };
    }
    const escala = Math.min(1, 1080 / img.height, 1440 / img.width);
    c.width = Math.round(img.width * escala);
    c.height = Math.round(img.height * escala);
    g.drawImage(img, 0, 0, c.width, c.height);
    let b = await paraBlob(c, "image/webp", 0.82);
    let mime = "image/webp";
    if (!b || b.type !== "image/webp") {
      b = await paraBlob(c, "image/jpeg", 0.85);
      mime = "image/jpeg";
    }
    return { mime, base64: await base64(b), previa: URL.createObjectURL(b) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
