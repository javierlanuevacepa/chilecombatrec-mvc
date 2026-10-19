
import Photo from "./Photo";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();



export default function Avatar({
  name,
  photo,
  className = "",
}: {
  name: string;
  photo?: string | null;
  className?: string;
}) {
  return (
    <div
      aria-hidden={photo ? undefined : "true"}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-[2px] bg-[color:var(--ink)] tracking-[0.02em] text-white [font-family:var(--font-display-stack)] ${className}`}
    >
      {photo ? <Photo src={photo} alt={name} /> : initials(name)}
    </div>
  );
}


