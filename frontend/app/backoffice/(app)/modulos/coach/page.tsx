import type { Metadata } from "next";
import CoachModulo from "@/components/backoffice/coach/CoachModulo";

export const metadata: Metadata = {
  title: "Administrar club | ChileCombatREC",
};

export default function coachPage() {
  return <CoachModulo />;
}
