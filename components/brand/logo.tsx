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
 * Alta Vibración logo lockup. Renders the brand SVG and, by default, links to Home
 * (AC oscar-ospina/saas-planner#20). Both SVGs carry the exact paints of the Figma
 * component "Logo horizontal" (8:634): the orange gradient mark, and two violet→orange
 * gradients (#a43ff2 → #f37d3e) on the tail of the "A" and on the swoosh over "lt";
 * the rest of the wordmark is solid #f37d3e. `mark` is that same mark on its own;
 * the favicon (app/icon.svg) is a copy of public/logo-mark.svg, so change both together.
 * No "use client" and no state or effects: it renders as a server component in the
 * Footer and as part of the client tree inside TopBar (a client component), so keep
 * it free of server-only code and hooks.
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
    <Link
      href={href}
      className="inline-flex shrink-0 rounded-md focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {img}
    </Link>
  );
}
