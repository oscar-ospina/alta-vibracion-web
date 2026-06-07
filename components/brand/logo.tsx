import Link from "next/link";

type LogoVariant = "horizontal" | "mark";

/** Intrinsic SVG dimensions (from each asset's viewBox) — set on the <img> to
 *  reserve space and avoid layout shift; scale via `className`. */
const VARIANTS: Record<LogoVariant, { src: string; width: number; height: number }> = {
  horizontal: { src: "/logo-horizontal.svg", width: 549, height: 74 },
  mark: { src: "/logo-mark.svg", width: 123, height: 74 },
};

type LogoProps = {
  /** Full wordmark lockup (default) or the compact mark. */
  variant?: LogoVariant;
  /** Where the lockup links. Defaults to Home; pass `null` to render unlinked. */
  href?: string | null;
  /** Classes on the <img> — drives the rendered size. Defaults to `h-9 w-auto`. */
  className?: string;
};

/**
 * Alta Vibración logo lockup. Renders the brand SVG (orange gradient mark +
 * violet→orange swoosh) and, by default, links to Home (AC oscar-ospina/saas-planner#20).
 * Server component — no interactivity, no client boundary needed.
 */
export function Logo({ variant = "horizontal", href = "/", className }: LogoProps) {
  const { src, width, height } = VARIANTS[variant];
  const img = (
    // Static, trusted brand SVG with baked-in gradients. We use <img> over
    // next/image deliberately: next/image needs `dangerouslyAllowSVG`, and a
    // plain tag keeps each SVG its own document (no gradient-id collisions).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={width}
      height={height}
      alt="Alta Vibración"
      className={className ?? "h-9 w-auto"}
    />
  );

  if (href === null) return img;

  return (
    <Link href={href} className="inline-flex shrink-0">
      {img}
    </Link>
  );
}
