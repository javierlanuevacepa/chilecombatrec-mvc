import {
  type ReactNode
} from "react";


export default function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="border border-dashed border-[color:var(--control-border)] px-4 py-8 text-center text-[15px] text-[color:var(--ink-soft)]">
      {children}
    </p>
  );
}