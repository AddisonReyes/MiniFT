import Link from "next/link";

const brandLinkClassName =
  "inline-flex shrink-0 rounded-full border border-white/10 bg-ink/60 px-3 py-1.5 text-xs uppercase tracking-[0.28em] text-signal shadow-soft backdrop-blur transition hover:border-signal/40 hover:bg-signal/10 hover:text-white";

export function BrandLink({
  href = "/",
  className,
  onClick,
}: {
  href?: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      className={[brandLinkClassName, className]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      <span className="sm:hidden">MiniFT</span>
      <span className="hidden sm:inline">Mini Finance Tracker</span>
    </Link>
  );
}
