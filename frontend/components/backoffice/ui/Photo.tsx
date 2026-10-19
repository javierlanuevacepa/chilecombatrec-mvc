export default function Photo({ src, alt }: { src: string; alt: string }) {
  // Las fotos son URLs locales (blob:), por eso no se usa next/image.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="h-full w-full object-cover" />;
}