"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

// --- Sub-views ---

function OverviewTab() {
  const { t } = useTranslation();

  const summaryItems = [
    { label: t("demo.income"), value: "$4,200", className: "text-signal" },
    { label: t("demo.expenses"), value: "$1,845", className: "text-hazard" },
    { label: t("demo.net"), value: "$2,355", className: "text-white" },
  ];

  const activityItems = [
    {
      label: t("demo.transactions.salary"),
      meta: `${t("demo.income")} · ${t("demo.transactions.mainAccount")}`,
      amount: "+$4,200",
      amountClass: "text-signal",
    },
    {
      label: t("demo.transactions.groceries"),
      meta: `${t("demo.expenses")} · ${t("demo.budgets.food")}`,
      amount: "-$184",
      amountClass: "text-hazard",
    },
    {
      label: t("demo.transactions.savingsMove"),
      meta: `Transfer · ${t("demo.transactions.internal")}`,
      amount: "$750",
      amountClass: "text-amber",
    },
  ];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
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

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-mist">{t("demo.budgetHealth")}</span>
          <span className="text-white">{t("demo.budgetUsed", { pct: 68 })}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[68%] rounded-full bg-signal" />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {activityItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <div className="min-w-0">
              <div className="font-medium text-white">{item.label}</div>
              <div className="mt-0.5 truncate text-xs text-mist">{item.meta}</div>
            </div>
            <div className={`shrink-0 font-semibold ${item.amountClass}`}>
              {item.amount}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function BudgetsTab() {
  const { t } = useTranslation();

  const budgetItems = [
    { category: t("demo.budgets.food"), used: 320, cap: 500 },
    { category: t("demo.budgets.transport"), used: 95, cap: 200 },
    { category: t("demo.budgets.entertainment"), used: 60, cap: 100 },
    { category: t("demo.budgets.health"), used: 140, cap: 150 },
  ];

  return (
    <div className="space-y-4">
      {budgetItems.map((item) => {
        const pct = Math.round((item.used / item.cap) * 100);
        const isOver = pct >= 90;
        return (
          <div key={item.category} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white">{item.category}</span>
              <span className={isOver ? "text-hazard" : "text-mist"}>
                ${item.used} / ${item.cap}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${isOver ? "bg-hazard" : "bg-signal"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-right text-xs text-mist">
              {t("demo.budgetUsed", { pct })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TransactionsTab() {
  const { t } = useTranslation();

  const transactionItems = [
    {
      label: t("demo.transactions.salary"),
      meta: `${t("demo.income")} · ${t("demo.transactions.mainAccount")}`,
      amount: "+$4,200",
      amountClass: "text-signal",
    },
    {
      label: t("demo.transactions.groceries"),
      meta: `${t("demo.expenses")} · ${t("demo.budgets.food")}`,
      amount: "-$184",
      amountClass: "text-hazard",
    },
    {
      label: t("demo.transactions.netflix"),
      meta: `${t("demo.expenses")} · ${t("demo.budgets.entertainment")}`,
      amount: "-$18",
      amountClass: "text-hazard",
    },
    {
      label: t("demo.transactions.gym"),
      meta: `${t("demo.expenses")} · ${t("demo.budgets.health")}`,
      amount: "-$45",
      amountClass: "text-hazard",
    },
    {
      label: t("demo.transactions.savingsMove"),
      meta: `Transfer · ${t("demo.transactions.internal")}`,
      amount: "$750",
      amountClass: "text-amber",
    },
    {
      label: t("demo.transactions.freelance"),
      meta: `${t("demo.income")} · ${t("demo.transactions.business")}`,
      amount: "+$800",
      amountClass: "text-signal",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-mist">
          {t("demo.transactions.month")}
        </p>
        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-mist">
          {t("demo.transactions.entries", { count: 6 })}
        </div>
      </div>
      {transactionItems.map((item) => (
        <div
          key={item.label + item.amount}
          className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <div className="min-w-0">
            <div className="font-medium text-white">{item.label}</div>
            <div className="mt-0.5 truncate text-xs text-mist">{item.meta}</div>
          </div>
          <div className={`shrink-0 font-semibold ${item.amountClass}`}>
            {item.amount}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsTab() {
  const { t } = useTranslation();

  const reportItems = [
    { month: "Feb", income: 4200, expenses: 1620 },
    { month: "Mar", income: 5000, expenses: 1980 },
    { month: "Apr", income: 4200, expenses: 1845 },
  ];

  const maxReportValue = 5500;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-mist">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-signal" />
          {t("demo.reports.legend.income")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-hazard" />
          {t("demo.reports.legend.expenses")}
        </span>
      </div>

      <div className="flex items-end gap-4">
        {reportItems.map((item) => (
          <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-end gap-1" style={{ height: 120 }}>
              <div
                className="flex-1 rounded-t-[6px] bg-signal/70"
                style={{ height: `${(item.income / maxReportValue) * 100}%` }}
              />
              <div
                className="flex-1 rounded-t-[6px] bg-hazard/70"
                style={{ height: `${(item.expenses / maxReportValue) * 100}%` }}
              />
            </div>
            <span className="text-xs text-mist">{item.month}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
        {reportItems.map((item) => (
          <div key={item.month} className="space-y-1 text-center">
            <p className="text-xs uppercase tracking-[0.14em] text-mist">{item.month}</p>
            <p className="text-sm font-semibold text-signal">
              +${(item.income - item.expenses).toLocaleString()}
            </p>
            <p className="text-xs text-mist">{t("demo.reports.net")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Tabs config ---

const TAB_KEYS = ["overview", "budgets", "transactions", "reports"] as const;
type TabId = (typeof TAB_KEYS)[number];

// --- Main component ---

export function FinanceSnapshot({
  showActivity = false,
}: {
  showActivity?: boolean;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  void showActivity; // prop kept for backwards compatibility

  return (
    <div className="rounded-[24px] border border-white/10 bg-ink/45 p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-mist">
            {t("demo.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{t("demo.title")}</h2>
        </div>
        <div className="rounded-full border border-signal/20 bg-signal/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-signal">
          {t("demo.badge")}
        </div>
      </div>

      {/* Tab bar */}
      <div className="mt-5 flex gap-1 rounded-[18px] border border-white/10 bg-white/[0.03] p-1">
        {TAB_KEYS.map((id) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 rounded-[14px] px-2 py-1.5 text-xs font-medium transition ${
              activeTab === id
                ? "bg-white/10 text-white"
                : "text-mist hover:text-white"
            }`}
          >
            {t(`demo.tabs.${id}`)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-5">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "budgets" && <BudgetsTab />}
        {activeTab === "transactions" && <TransactionsTab />}
        {activeTab === "reports" && <ReportsTab />}
      </div>
    </div>
  );
}
