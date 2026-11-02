import type { Metadata } from "next";
import SuperAdminModulo from "@/components/backoffice/superadmin/SuperAdminModulo";

export const metadata: Metadata = {
  title: "Administrar club | ChileCombatREC",
};


export default function superAdminPage() {
  return <SuperAdminModulo />;
}
