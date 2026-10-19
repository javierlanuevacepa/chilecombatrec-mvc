
import {

  type InputHTMLAttributes

} from "react";


export default function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-[2px] border border-[color:var(--control-border)] bg-white px-3 py-2.5 text-base leading-[1.3] text-[color:var(--ink)] outline outline-2 outline-transparent transition-[border-color,box-shadow] duration-150 [font-family:var(--font-sans-stack)] placeholder:text-[#6b7788] focus:border-[color:var(--corner)] focus:shadow-[0_0_0_1px_var(--corner)] aria-[invalid=true]:border-[color:var(--corner)] motion-reduce:transition-none ${className}`}
    />
  );
}