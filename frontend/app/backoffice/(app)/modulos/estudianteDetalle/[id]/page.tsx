import type { Metadata } from "next";
import EstudianteDetalleModulo from "@/components/backoffice/estudiantedetalle/EstudianteDetalleModulo";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Administrar club | ChileCombatREC",
};

export default function estudianteDetallePage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm">Cargando ficha…</p>}>
      <EstudianteDetalleModulo />;
    </Suspense>
  ) 
}
