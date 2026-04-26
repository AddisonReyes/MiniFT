"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { FormError } from "@/components/form-error";
import { PageFrame } from "@/components/page-frame";
import { Button, Card, Input, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { useSessionQuery } from "@/lib/auth";
import {
  currentMonthInput,
  firstDayToMonthInput,
  formatCurrency,
  monthInputToDate,
} from "@/lib/format";
import type { Budget } from "@/lib/types";

const createInitialForm = (month: string) => ({
  category: "",
  limit_amount: "",
  month,
});

export default function BudgetsPage() {
  const session = useSessionQuery();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonthInput());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState(createInitialForm(currentMonthInput()));

  const budgetsQuery = useQuery({
    queryKey: ["budgets", month],
    queryFn: () =>
      api.get<Budget[]>(
        `/budgets?month=${encodeURIComponent(monthInputToDate(month))}`,
      ),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        category: form.category,
        limit_amount: form.limit_amount,
        month: monthInputToDate(form.month),
      };

      if (editing) {
        return api.put<Budget>(`/budgets/${editing.id}`, payload);
      }

      return api.post<Budget>("/budgets", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setOpen(false);
      setEditing(null);
      setForm(createInitialForm(month));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (budgetId: string) =>
      api.delete<{ message: string }>(`/budgets/${budgetId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  function handleCreate() {
    setEditing(null);
    setForm(createInitialForm(month));
    setOpen(true);
  }

  function handleEdit(budget: Budget) {
    setEditing(budget);
    setForm({
      category: budget.category,
      limit_amount: String(budget.limit_amount),
      month: firstDayToMonthInput(budget.month),
    });
    setOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate();
  }

  const currency = session.data?.currency || "USD";

  return (
    <PageFrame
      title="Budgets"
      description="Set category caps per month and compare them against live expense totals."
      actions={
        <div className="flex flex-wrap gap-3">
          <Input
            className="min-w-0 sm:min-w-[180px]"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
          <Button onClick={handleCreate}>New budget</Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {(budgetsQuery.data || []).map((budget) => {
          const spent = Number(budget.spent_amount);
          const limit = Math.max(Number(budget.limit_amount), 1);
          const progress = Math.min((spent / limit) * 100, 100);

          return (
            <Card key={budget.id} className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.22em] text-mist">
                    {budget.month}
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold">
                    {budget.category}
                  </h2>
                </div>
                <div className="text-sm text-mist sm:text-right">
                  <div>Spent</div>
                  <div className="mt-1 font-medium text-white">
                    {formatCurrency(budget.spent_amount, currency)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-mist">Limit</span>
                  <span className="text-white">
                    {formatCurrency(budget.limit_amount, currency)}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-signal transition"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-sm text-mist">
                  Remaining: {formatCurrency(budget.remaining_amount, currency)}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => handleEdit(budget)}
                >
                  Edit
                </Button>
                <Button
                  className="flex-1"
                  variant="ghost"
                  onClick={() => {
                    if (
                      window.confirm(`Delete budget for ${budget.category}?`)
                    ) {
                      deleteMutation.mutate(budget.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {!budgetsQuery.data?.length ? (
        <Card className="mt-6 text-sm text-mist">
          No budgets found for {month}. Create one to start tracking category
          caps.
        </Card>
      ) : null}

      <Modal
        open={open}
        title={editing ? "Edit budget" : "Create budget"}
        subtitle="Budgets are monthly and tied to a category."
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setForm(createInitialForm(month));
        }}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="category">Category</label>
            <Input
              id="category"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              placeholder="Groceries"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="limit_amount">Limit Amount</label>
            <Input
              id="limit_amount"
              inputMode="decimal"
              value={form.limit_amount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  limit_amount: event.target.value,
                }))
              }
              placeholder="400.00"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="month">Month</label>
            <Input
              id="month"
              type="month"
              value={form.month}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  month: event.target.value,
                }))
              }
              required
            />
          </div>

          <FormError
            error={saveMutation.error}
            fallbackMessage="Unable to save budget"
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setEditing(null);
                setForm(createInitialForm(month));
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {saveMutation.isPending
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Create budget"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageFrame>
  );
}
