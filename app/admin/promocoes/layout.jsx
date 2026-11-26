import { exigirModulo } from "../../../lib/modulo";

export default async function Layout({ children }) {
  await exigirModulo("promocoes");
  return children;
}
