
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,

} from "react";
import {
  X,
} from "lucide-react";

import IconButton from "./IconButton";
import Panel from "./Panel";

export default function Modal({
  title,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[rgba(20,35,58,0.5)] p-5 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full outline-none ${wide ? "max-w-[560px]" : "max-w-[420px]"}`}
      >
        <Panel innerClassName="max-h-[90dvh] overflow-y-auto px-6 pb-6 pt-5 max-[480px]:px-[18px]">
          <div className="flex items-center justify-between gap-3">
            <h2
              id={titleId}
              className="text-2xl font-normal leading-[1.1] tracking-[0.005em] text-[color:var(--ink)] [font-family:var(--font-display-stack)]"
            >
              {title}
            </h2>
            <IconButton onClick={onClose} aria-label="Cerrar">
              <X size={16} aria-hidden="true" />
            </IconButton>
          </div>
          <div className="my-4 border-t border-dashed border-[color:var(--line)]" />
          {children}
        </Panel>
      </div>
    </div>
  );
}