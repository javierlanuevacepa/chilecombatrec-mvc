import type { Metadata } from "next";
import LoginModulo from "@/components/backoffice/login/LoginModulo";

export const metadata: Metadata = {
  title: "Ingresar | ChileCombatREC",
};

export default function LoginPage() {
  return <LoginModulo />;
}
