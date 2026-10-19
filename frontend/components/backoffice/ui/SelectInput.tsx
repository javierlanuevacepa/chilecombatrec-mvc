import {
  type SelectHTMLAttributes,

} from "react";
import {
  ChevronDown,

} from "lucide-react";


export default function SelectInput({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative flex items-center">
      <select
        {...props}
        className={`w-full appearance-none rounded-[2px] border border-[color:var(--control-border)] bg-white py-2.5 pl-3 pr-10 text-base leading-[1.3] text-[color:var(--ink)] outline outline-2 outline-transparent transition-[border-color,box-shadow] duration-150 [font-family:var(--font-sans-stack)] focus:border-[color:var(--corner)] focus:shadow-[0_0_0_1px_var(--corner)] motion-reduce:transition-none ${className}`}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 text-[color:var(--muted)]"
      />
    </div>
  );
}