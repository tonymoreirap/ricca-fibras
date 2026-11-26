import { PDFDocument, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { dataCompleta } from "./formato";
import { embutirLogo, iniciais } from "./reciboPdf";

const hex = (h) => {
  const n = parseInt(h.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const C = {
  marfim: hex("#fbf6ee"),
  marfim2: hex("#f1e6d5"),
  tinta: hex("#2a180c"),
  suave: hex("#7a5f48"),
  ouro: hex("#c9a35a"),
  ouroEscuro: hex("#9a6c2c"),
  cafe: hex("#2b1a13"),
  rose: hex("#b97c7a"),
};

/**
 * Certificado A4 paisagem.
 * @param {object} c  certificado (certificado_verificar)
 * @param {object} r  recursos { marcellus, jostLight, jostRegular, jostMedium, monograma }
 * @param {object} o  { curso, contato, salao, urlVerificar }
 */
export async function gerarCertificadoPdf(c, r, o) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Certificado ${c.codigo} — ${o.curso}`);
  pdf.setAuthor(o.salao);
  pdf.setCreator(o.salao);

  const fDisplay = await pdf.embedFont(r.marcellus, { subset: true });
  const fLight = await pdf.embedFont(r.jostLight, { subset: true });
  const fReg = await pdf.embedFont(r.jostRegular, { subset: true });
  const fMed = await pdf.embedFont(r.jostMedium, { subset: true });
  const mono = await embutirLogo(pdf, r);
  const qr = await pdf.embedPng(await QRCode.toBuffer(o.urlVerificar, { margin: 0, width: 360, color: { dark: "#2a180cff", light: "#00000000" } }));

  const W = 842, H = 595;
  const p = pdf.addPage([W, H]);
  const centro = (texto, fonte, tam, y, cor = C.tinta) => {
    const w = fonte.widthOfTextAtSize(texto, tam);
    p.drawText(texto, { x: (W - w) / 2, y, size: tam, font: fonte, color: cor });
  };

  // fundo e molduras
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.marfim });
  p.drawRectangle({ x: 22, y: 22, width: W - 44, height: H - 44, borderColor: C.ouro, borderWidth: 2.2 });
  p.drawRectangle({ x: 31, y: 31, width: W - 62, height: H - 62, borderColor: C.ouro, borderWidth: 0.6, opacity: 0 });
  // cantos em losango
  for (const [x, y] of [[31, 31], [W - 31, 31], [31, H - 31], [W - 31, H - 31]]) {
    p.drawRectangle({ x: x - 6, y: y - 6, width: 12, height: 12, color: C.ouro, rotate: degrees(45), xSkew: degrees(0) });
  }
  // faixa café no alto com monograma
  p.drawRectangle({ x: 31, y: H - 128, width: W - 62, height: 97, color: C.cafe });
  if (mono) p.drawImage(mono, { x: (W - 78) / 2, y: H - 120, width: 78, height: 78 });
  else centro(iniciais(o.salao), fDisplay, 40, H - 96, C.ouro);

  centro("C E R T I F I C A D O   D E   C O N C L U S Ã O", fMed, 11, H - 168, C.ouroEscuro);
  centro("Certificamos que", fLight, 14, H - 205, C.suave);

  // nome em destaque com fio de ouro
  let tamNome = 40;
  while (fDisplay.widthOfTextAtSize(c.nome, tamNome) > W - 220 && tamNome > 24) tamNome -= 2;
  centro(c.nome, fDisplay, tamNome, H - 262, C.tinta);
  const fio = 260;
  p.drawLine({ start: { x: (W - fio) / 2, y: H - 280 }, end: { x: (W + fio) / 2, y: H - 280 }, thickness: 0.9, color: C.ouro });
  p.drawRectangle({ x: W / 2 - 4, y: H - 284, width: 8, height: 8, color: C.ouro, rotate: degrees(45) });

  centro(`concluiu o curso ${o.curso}${c.turma ? ` (${c.turma})` : ""},`, fReg, 15, H - 318, C.tinta);
  centro(`ministrado por ${o.contato}, da ${o.salao}, em ${dataCompleta(c.certificada_em)}.`, fReg, 15, H - 340, C.tinta);
  centro([`${c.cidade} · ${c.uf}`, o.carga ? `Carga horária: ${o.carga}` : null].filter(Boolean).join("   ·   "), fLight, 12.5, H - 366, C.suave);
  if (o.texto) {
    let tam = 11.5;
    while (fLight.widthOfTextAtSize(o.texto, tam) > W - 200 && tam > 8.5) tam -= 0.5;
    centro(o.texto, fLight, tam, H - 388, C.suave);
  }

  // assinatura
  const ax = 150, ay = 118;
  p.drawLine({ start: { x: ax - 95, y: ay }, end: { x: ax + 95, y: ay }, thickness: 0.7, color: C.suave });
  const nomeAss = o.assinatura || `${o.contato} · ${o.salao}`;
  const cargo = o.cargo || "Instrutora responsável";
  p.drawText(nomeAss, { x: ax - fMed.widthOfTextAtSize(nomeAss, 11) / 2, y: ay - 16, size: 11, font: fMed, color: C.tinta });
  p.drawText(cargo, { x: ax - fLight.widthOfTextAtSize(cargo, 10) / 2, y: ay - 30, size: 10, font: fLight, color: C.suave });

  // selo central
  const sx = W / 2, sy = 100;
  p.drawCircle({ x: sx, y: sy, size: 40, color: C.ouro });
  p.drawCircle({ x: sx, y: sy, size: 34, borderColor: C.marfim, borderWidth: 0.8 });
  const selo = o.selo || ["CERTIFICADO", iniciais(o.salao)];
  for (const [t, y, f, s] of [[selo[0], sy + 7, fMed, selo[0].length > 8 ? 7 : 8.5], [selo[1], sy - 6, fDisplay, 13]]) {
    p.drawText(t, { x: sx - f.widthOfTextAtSize(t, s) / 2, y, size: s, font: f, color: C.marfim });
  }

  // QR e código
  const qx = W - 215, qy = 70;
  p.drawImage(qr, { x: qx, y: qy, width: 70, height: 70 });
  p.drawText("Verifique a autenticidade", { x: qx - 6, y: qy - 15, size: 8.5, font: fLight, color: C.suave });
  p.drawText(c.codigo, { x: qx + 80, y: qy + 40, size: 12, font: fMed, color: C.tinta });
  p.drawText("código do", { x: qx + 80, y: qy + 24, size: 8.5, font: fLight, color: C.suave });
  p.drawText("certificado", { x: qx + 80, y: qy + 13, size: 8.5, font: fLight, color: C.suave });

  if (c.demo) {
    p.drawText("EXEMPLO · SEM VALIDADE", { x: 190, y: 170, size: 46, font: fMed, color: C.rose, opacity: 0.22, rotate: degrees(18) });
  }
  return pdf.save();
}
