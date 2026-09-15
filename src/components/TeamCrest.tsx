export default function TeamCrest({
  src,
  name,
  size = 20,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
}) {
  if (!src) {
    return (
      <span
        aria-hidden
        className="inline-flex items-center justify-center rounded-full bg-forest/10 text-forest font-semibold shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        {name.charAt(0)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small external crest thumbnails, not worth next/image remote-pattern config
    <img
      src={src}
      alt={`${name} crest`}
      width={size}
      height={size}
      loading="lazy"
      className="inline-block shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}
