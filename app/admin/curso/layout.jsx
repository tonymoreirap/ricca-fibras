import { exigirModulo } from "../../../lib/modulo";

export default async function Layout({ children }) {
  await exigirModulo("curso", "rede");
  return children;
}
