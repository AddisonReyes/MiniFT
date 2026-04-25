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
    <Card className="space-y-3">
      <p className="text-xs uppercase tracking-[0.22em] text-mist">{label}</p>
      <div className="text-3xl font-semibold text-white">{value}</div>
      {meta ? <p className="text-sm text-mist">{meta}</p> : null}
    </Card>
  );
}

