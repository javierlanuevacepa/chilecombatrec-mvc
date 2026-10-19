
import {
  type ButtonHTMLAttributes
} from "react";


type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  size?: "md" | "sm";
};

export default function Button({ variant = "primary", size = "md", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[2px] border font-semibold leading-[1.2] transition-colors duration-150 [font-family:var(--font-sans-stack)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--corner)] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
        size === "sm" ? "px-4 py-[9px] text-sm" : "px-[22px] py-[13px] text-[15px]"
      } ${
        variant === "primary"
          ? "border-transparent bg-[color:var(--corner)] text-white hover:bg-[color:var(--corner-dark)]"
          : "border-[color:var(--ink)] bg-transparent text-[color:var(--ink)] hover:bg-[color:var(--surface-2)]"
      } ${className}`}
    />
  );
}