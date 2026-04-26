const summaryItems = [
  { label: "Income", value: "$4,200", className: "text-signal" },
  { label: "Expenses", value: "$1,845", className: "text-hazard" },
  { label: "Net", value: "$2,355", className: "text-white" },
];

const activityItems = [
  { label: "Salary", meta: "Income · Main account", amount: "+$4,200" },
  { label: "Groceries", meta: "Expense · Food", amount: "-$184" },
  { label: "Savings move", meta: "Transfer · Internal", amount: "$750" },
];

const activityItemClassName =
  "flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3";

export function FinanceSnapshot({
  showActivity = false,
}: {
  showActivity?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-ink/45 p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-mist">
            April overview
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Cash flow</h2>
        </div>
        <div className="rounded-full border border-signal/20 bg-signal/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-signal">
          Healthy
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className="rounded-[18px] border border-white/10 bg-white/[0.035] p-4"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-mist">
              {item.label}
            </p>
            <div className={`mt-2 font-semibold ${item.className}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-mist">Budget health</span>
          <span className="text-white">68% used</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[68%] rounded-full bg-signal" />
        </div>
      </div>

      {showActivity ? (
        <div className="mt-6 space-y-3">
          {activityItems.map((item) => (
            <div
              key={item.label}
              className={activityItemClassName}
            >
              <div className="min-w-0">
                <div className="font-medium text-white">{item.label}</div>
                <div className="mt-1 truncate text-xs text-mist">
                  {item.meta}
                </div>
              </div>
              <div className="shrink-0 font-semibold text-white">
                {item.amount}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
