import { Card } from "@/components/ui";

export function SummaryCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta?: string;
}) {
  return (
    <Card className="space-y-3 p-5 transition hover:border-white/15 hover:bg-white/[0.035] sm:p-6">
      <p className="mobile-safe-text text-xs uppercase tracking-[0.18em] text-mist sm:tracking-[0.22em]">{label}</p>
      <div className="mobile-safe-text text-2xl font-semibold text-white sm:text-3xl">
        {value}
      </div>
      {meta ? <p className="mobile-safe-text text-sm text-mist">{meta}</p> : null}
    </Card>
  );
}
