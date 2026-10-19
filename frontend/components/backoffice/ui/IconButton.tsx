

import {
  type ButtonHTMLAttributes
} from "react";



export default function IconButton({
  danger = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`grid h-9 w-9 cursor-pointer place-items-center rounded-[2px] border border-[color:var(--control-border)] bg-transparent text-[color:var(--muted)] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--corner)] motion-reduce:transition-none ${
        danger
          ? "hover:border-[color:var(--corner)] hover:text-[color:var(--corner)]"
          : "hover:border-[color:var(--ink)] hover:text-[color:var(--ink)]"
      } ${className}`}
    />
  );
}