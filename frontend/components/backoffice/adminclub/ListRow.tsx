"use client";

import type { KeyboardEvent } from "react";
import Avatar from "../ui/Avatar";
import IconButton from "../ui/IconButton";
import { Pencil, Trash2 } from "lucide-react";

export default function ListRow({
  avatarText,
  title,
  subtitle,
  badge,
  onOpen,
  onEdit,
  onDelete,
}: {
  avatarText: string;
  title: string;
  subtitle: string;
  badge?: string;
  /** Si viene, TODA la fila es clickable (excepto los botones de acción). */
  onOpen?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const clickable = Boolean(onOpen);

  const handleKeyDown = (e: KeyboardEvent<HTMLLIElement>) => {
    if (!onOpen) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <li
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `Ver ${title}` : undefined}
      className={`flex flex-wrap items-center gap-3.5 border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 ${
        clickable
          ? "cursor-pointer transition-colors duration-150 hover:bg-[color:var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--corner)] motion-reduce:transition-none"
          : ""
      }`}
    >
      <Avatar name={avatarText} className="h-10 w-10 text-[15px]" />
      <div className="min-w-0 flex-[1_1_140px]">
        <p className="truncate text-[15px] font-medium">{title}</p>
        <p className="mt-0.5 truncate text-sm text-[color:var(--muted)]">
          {subtitle}
        </p>
      </div>
      {badge && (
        <span className="inline-block rounded-[2px] border border-[color:var(--corner)] bg-[color:var(--corner-tint)] px-2 py-px text-[13px] font-semibold text-[color:var(--corner-dark)]">
          {badge}
        </span>
      )}
      {/* Los botones cortan la propagación para no navegar al editar/eliminar */}
      <div
        className="ml-auto flex items-center gap-2 max-[480px]:ml-0 max-[480px]:basis-full max-[480px]:pl-[54px]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <IconButton onClick={onEdit} aria-label={`Editar ${title}`}>
          <Pencil size={14} aria-hidden="true" />
        </IconButton>
        <IconButton danger onClick={onDelete} aria-label={`Eliminar ${title}`}>
          <Trash2 size={14} aria-hidden="true" />
        </IconButton>
      </div>
    </li>
  );
}