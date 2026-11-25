/** @type {import('next').NextConfig} */
const nextConfig = {
  // fontes e monograma usados no PDF do recibo vão junto com a função no servidor
  outputFileTracingIncludes: {
    "/recibo/[codigo]/pdf": ["./assets/pdf/**/*"],
    "/certificado/[codigo]/pdf": ["./assets/pdf/**/*"],
  },
};
export default nextConfig;
