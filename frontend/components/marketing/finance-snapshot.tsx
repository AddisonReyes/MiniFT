"use client";

import { useState } from "react";

// --- Mock data ---

const summaryItems = [
  { label: "Income", value: "$4,200", className: "text-signal" },
  { label: "Expenses", value: "$1,845", className: "text-hazard" },
  { label: "Net", value: "$2,355", className: "text-white" },
];

const activityItems = [
  { label: "Salary", meta: "Income · Main account", amount: "+$4,200", amountClass: "text-signal" },
  { label: "Groceries", meta: "Expense · Food", amount: "-$184", amountClass: "text-hazard" },
  { label: "Savings move", meta: "Transfer · Internal", amount: "$750", amountClass: "text-amber" },
];

const budgetItems = [
  { category: "Food", used: 320, cap: 500 },
  { category: "Transport", used: 95, cap: 200 },
  { category: "Entertainment", used: 60, cap: 100 },
  { category: "Health", used: 140, cap: 150 },
];

const transactionItems = [
  { label: "Salary", meta: "Income · Main account", amount: "+$4,200", amountClass: "text-signal" },
  { label: "Groceries", meta: "Expense · Food", amount: "-$184", amountClass: "text-hazard" },
  { label: "Netflix", meta: "Expense · Entertainment", amount: "-$18", amountClass: "text-hazard" },
  { label: "Gym", meta: "Expense · Health", amount: "-$45", amountClass: "text-hazard" },
  { label: "Savings move", meta: "Transfer · Internal", amount: "$750", amountClass: "text-amber" },
  { label: "Freelance", meta: "Income · Business", amount: "+$800", amountClass: "text-signal" },
];

const reportItems = [
  { month: "Feb", income: 4200, expenses: 1620 },
  { month: "Mar", income: 5000, expenses: 1980 },
  { month: "Apr", income: 4200, expenses: 1845 },
];

const maxReportValue = 5500;

// --- Sub-views ---

function OverviewTab() {
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
          <span className="text-mist">Budget health</span>
          <span className="text-white">68% used</span>
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
            <div className="text-right text-xs text-mist">{pct}% used</div>
          </div>
        );
      })}
    </div>
  );
}

function TransactionsTab() {
  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-mist">
          April 2025
        </p>
        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-mist">
          6 entries
        </div>
      </div>
      {transactionItems.map((item) => (
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
  );
}

function ReportsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-mist">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-signal" />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-hazard" />
          Expenses
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
            <p className="text-sm font-semibold text-signal">+${(item.income - item.expenses).toLocaleString()}</p>
            <p className="text-xs text-mist">net</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Tabs config ---

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "budgets", label: "Budgets" },
  { id: "transactions", label: "Transactions" },
  { id: "reports", label: "Reports" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// --- Main component ---

export function FinanceSnapshot({
  showActivity = false,
}: {
  showActivity?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  void showActivity; // prop kept for backwards compatibility

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

      {/* Tab bar */}
      <div className="mt-5 flex gap-1 rounded-[18px] border border-white/10 bg-white/[0.03] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-[14px] px-2 py-1.5 text-xs font-medium transition ${
              activeTab === tab.id
                ? "bg-white/10 text-white"
                : "text-mist hover:text-white"
            }`}
          >
            {tab.label}
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
