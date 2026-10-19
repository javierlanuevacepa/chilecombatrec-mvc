import type { Metadata } from "next";
import AdminClubModulo from "@/components/backoffice/adminclub/AdminClubModulo";

export const metadata: Metadata = {
  title: "Administrar club | ChileCombatREC",
};

export default function adminClubPage() {
  return <AdminClubModulo />;
}
