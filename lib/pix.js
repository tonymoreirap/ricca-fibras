// Pix "copia e cola" estático no padrão BR Code (EMV) do Banco Central.

function campo(id, valor) {
  const v = String(valor);
  return id + String(v.length).padStart(2, "0") + v;
}

function semAcento(texto, max) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .slice(0, max);
}

// CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF)
export function crc16(texto) {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function pixCopiaECola({ chave, nome, cidade, valor, identificador }) {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", chave);
  const txid = (identificador || "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const semCrc =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", Number(valor).toFixed(2)) +
    campo("58", "BR") +
    campo("59", semAcento(nome, 25)) +
    campo("60", semAcento(cidade, 15)) +
    campo("62", campo("05", txid)) +
    "6304";
  return semCrc + crc16(semCrc);
}
