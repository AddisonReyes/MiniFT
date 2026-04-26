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
    <Card className="space-y-3 p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-mist">{label}</p>
      <div className="break-words text-2xl font-semibold text-white sm:text-3xl">
        {value}
      </div>
      {meta ? <p className="text-sm text-mist">{meta}</p> : null}
    </Card>
  );
}
