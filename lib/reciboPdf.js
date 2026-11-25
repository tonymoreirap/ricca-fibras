import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { real, hora, dataLonga, dataCurta } from "./formato";

const hex = (h) => {
  const n = parseInt(h.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const C = {
  cafe: hex("#1a100c"),
  chocolate: hex("#2b1a13"),
  marfim: hex("#fbf6ee"),
  marfim2: hex("#f3e9db"),
  champanhe: hex("#f5ece1"),
  claro: hex("#c9b7a5"),
  ouro: hex("#d2aa5e"),
  ouroClaro: hex("#ecd49a"),
  ouroEscuro: hex("#9a6c2c"),
  tinta: hex("#2a180c"),
  suave: hex("#7a5f48"),
  rose: hex("#e4afab"),
  roseEscuro: hex("#8a3f37"),
  verde: hex("#1e5a2c"),
  verdeClaro: hex("#cfeed6"),
};

const STATUS = {
  aguardando_sinal: { texto: "Aguardando confirmação do sinal", fundo: hex("#f6dcd8"), cor: C.roseEscuro },
  confirmado: { texto: "Confirmado pela Luana", fundo: C.verdeClaro, cor: C.verde },
  cancelado: { texto: "Cancelado", fundo: hex("#e8e2dc"), cor: C.suave },
  concluido: { texto: "Atendimento concluído", fundo: C.verdeClaro, cor: C.verde },
};

const primeiraMaiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Caminho SVG de retângulo arredondado (origem no canto superior esquerdo)
const arredondado = (w, h, r) =>
  `M${r} 0 H${w - r} Q${w} 0 ${w} ${r} V${h - r} Q${w} ${h} ${w - r} ${h} H${r} Q0 ${h} 0 ${h - r} V${r} Q0 0 ${r} 0 Z`;

/**
 * Gera o PDF do recibo.
 * @param {object} a  agendamento (consultar_agendamento)
 * @param {object} r  recursos: { marcellus, jostLight, jostRegular, jostMedium, monograma } (Uint8Array)
 * @param {object} o  opções: { pix: {exibicao}, urlRecibo }
 */
export async function gerarReciboPdf(a, r, o) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Recibo ${a.codigo} — Rica Fibras`);
  pdf.setAuthor("Rica Fibras");
  pdf.setSubject("Recibo de agendamento");
  pdf.setCreator("Rica Fibras");

  const fDisplay = await pdf.embedFont(r.marcellus, { subset: true });
  const fLight = await pdf.embedFont(r.jostLight, { subset: true });
  const fReg = await pdf.embedFont(r.jostRegular, { subset: true });
  const fMed = await pdf.embedFont(r.jostMedium, { subset: true });
  const mono = await pdf.embedPng(r.monograma);
  const qrPng = await pdf.embedPng(
    await QRCode.toBuffer(o.urlRecibo, { margin: 0, width: 240, color: { dark: "#2a180cff", light: "#00000000" } })
  );

  const W = 420;
  const H = 712;
  const M = 30;
  const page = pdf.addPage([W, H]);
  const topo = (y) => H - y; // converte "distância do topo" para o eixo do PDF

  const texto = (t, x, y, font, size, color, opts = {}) => {
    let xx = x;
    const largura = font.widthOfTextAtSize(t, size);
    if (opts.alinhar === "centro") xx = x - largura / 2;
    if (opts.alinhar === "direita") xx = x - largura;
    page.drawText(t, { x: xx, y: topo(y), font, size, color, characterSpacing: opts.espaco || 0 });
    return largura;
  };
  const caixa = (x, y, w, h, raio, cor, borda) =>
    page.drawSvgPath(arredondado(w, h, raio), {
      x,
      y: topo(y),
      color: cor,
      borderColor: borda,
      borderWidth: borda ? 0.8 : 0,
    });

  // fundo
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.marfim });

  // faixa café com linhas finas douradas na diagonal
  const faixa = 214;
  page.drawRectangle({ x: 0, y: topo(faixa), width: W, height: faixa, color: C.cafe });
  for (let i = -faixa; i < W; i += 14) {
    page.drawLine({
      start: { x: i, y: topo(faixa) },
      end: { x: i + faixa * 0.55, y: H },
      thickness: 0.35,
      color: C.ouro,
      opacity: 0.07,
    });
  }
  page.drawImage(mono, { x: W / 2 - 48, y: topo(24 + 96), width: 96, height: 96 });
  texto("Rica Fibras", W / 2, 150, fDisplay, 26, C.champanhe, { alinhar: "centro" });
  texto("Recibo de agendamento", W / 2, 172, fLight, 11, C.ouroClaro, { alinhar: "centro", espaco: 1.2 });

  // fio de ouro com losango
  const yFio = faixa;
  page.drawRectangle({ x: 0, y: topo(yFio) - 1, width: W, height: 2.2, color: C.ouro });
  page.drawSvgPath("M0 -7 L5 0 L0 7 L-5 0 Z", { x: W / 2, y: topo(yFio), color: C.ouroClaro, borderColor: C.ouroEscuro, borderWidth: 0.6 });

  // código + status
  let y = yFio + 42;
  texto("Código do agendamento", M, y, fReg, 9.5, C.suave);
  texto(a.codigo, W - M, y + 2, fDisplay, 20, C.tinta, { alinhar: "direita", espaco: 1.5 });
  y += 26;
  const st = STATUS[a.status] || STATUS.aguardando_sinal;
  const larguraSt = fMed.widthOfTextAtSize(st.texto, 9.5) + 24;
  caixa(M, y - 4, larguraSt, 22, 11, st.fundo);
  texto(st.texto, M + 12, y + 11, fMed, 9.5, st.cor);

  // bloco do serviço
  y += 34;
  const hServ = 74;
  caixa(M, y, W - 2 * M, hServ, 12, C.chocolate);
  page.drawRectangle({ x: M + 18, y: topo(y + hServ - 16), width: 2, height: hServ - 32, color: C.ouro });
  texto(a.servico_nome, M + 32, y + 30, fDisplay, 17, C.champanhe);
  texto(primeiraMaiuscula(dataLonga(a.inicio)), M + 32, y + 50, fReg, 10.5, C.claro);
  texto(`${hora(a.inicio)} às ${hora(a.fim)}`, M + 32, y + 64, fMed, 10.5, C.ouroClaro);

  // linhas de valores
  y += hServ + 30;
  const linha = (rotulo, valor, destaque = false) => {
    texto(rotulo, M, y, destaque ? fMed : fReg, destaque ? 11.5 : 10.5, destaque ? C.tinta : C.suave);
    texto(valor, W - M, y, destaque ? fDisplay : fMed, destaque ? 19 : 11, C.tinta, { alinhar: "direita" });
    if (!destaque) {
      for (let x = M; x < W - M; x += 5) {
        page.drawLine({ start: { x, y: topo(y + 11) }, end: { x: x + 2, y: topo(y + 11) }, thickness: 0.5, color: C.suave, opacity: 0.35 });
      }
    }
    y += destaque ? 34 : 28;
  };
  linha("Cliente", a.cliente_nome);
  linha("Valor do serviço", real(a.valor));
  linha("Sinal de 30% via Pix", real(a.sinal));
  y += 4;
  linha("Restante a pagar no dia", real(Number(a.valor) - Number(a.sinal)), true);

  // caixa do Pix + QR
  y += 4;
  const hPix = 96;
  caixa(M, y, W - 2 * M, hPix, 12, C.marfim2, C.ouro);
  texto("Sinal pago via Pix para", M + 18, y + 26, fReg, 9.5, C.suave);
  texto(o.pix.exibicao, M + 18, y + 48, fDisplay, 17, C.tinta);
  texto("Chave celular · Luana · Rica Fibras", M + 18, y + 66, fReg, 9.5, C.suave);
  texto("Confira este recibo online pelo QR", M + 18, y + 82, fLight, 8.5, C.suave);
  const q = 72;
  page.drawImage(qrPng, { x: W - M - 12 - q, y: topo(y + 12 + q), width: q, height: q });

  // rodapé
  y += hPix + 30;
  texto(
    `Emitido em ${dataCurta(a.criado_em)} às ${hora(a.criado_em)}`,
    W / 2, y, fReg, 9, C.suave, { alinhar: "centro" }
  );
  texto("Comprovante de agendamento, sem valor fiscal.", W / 2, y + 14, fLight, 8.5, C.suave, { alinhar: "centro" });

  // borda picotada embaixo
  for (let x = 7; x < W; x += 14) {
    page.drawCircle({ x, y: 0, size: 5, color: C.cafe });
  }
  page.drawRectangle({ x: 0, y: 0, width: W, height: 1.5, color: C.ouro, opacity: 0.6 });

  return pdf.save();
}
