"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { FormError } from "@/components/form-error";
import { MonthPicker } from "@/components/month-picker";
import { PageFrame } from "@/components/page-frame";
import { Button, Card, Input, Modal, ModalActions } from "@/components/ui";
import { api } from "@/lib/api";
import { useSessionQuery } from "@/lib/auth";
import {
  currentMonthInput,
  firstDayToMonthInput,
  formatCurrency,
  monthInputToDate,
} from "@/lib/format";
import type { Budget } from "@/lib/types";
import { useTranslation } from "react-i18next";

const createInitialForm = (month: string) => ({
  category: "",
  limit_amount: "",
  month,
});

export default function BudgetsPage() {
  const { t } = useTranslation();
  const session = useSessionQuery();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonthInput());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState(createInitialForm(currentMonthInput()));
  const isSessionReady = Boolean(session.data);

  const budgetsQuery = useQuery({
    queryKey: ["budgets", month],
    queryFn: () =>
      api.get<Budget[]>(
        `/budgets?month=${encodeURIComponent(monthInputToDate(month))}`,
      ),
    enabled: isSessionReady,
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
      title={t("budgets.title")}
      description={t("budgets.description")}
      actions={
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
          <MonthPicker
            className="min-w-0 sm:min-w-[280px]"
            value={month}
            onChange={setMonth}
          />
          <Button onClick={handleCreate}>{t("budgets.addBudget")}</Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {(budgetsQuery.data || []).map((budget) => {
          const spent = Number(budget.spent_amount);
          const limit = Math.max(Number(budget.limit_amount), 1);
          const progress = Math.min((spent / limit) * 100, 100);

          return (
            <Card
              key={budget.id}
              className="space-y-5 transition hover:border-white/15 hover:bg-white/[0.035]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.22em] text-mist">
                    {budget.month}
                  </div>
                  <h2 className="mobile-safe-text mt-2 text-2xl font-semibold">
                    {budget.category}
                  </h2>
                </div>
                <div className="text-sm text-mist sm:text-right">
                  <div>{t("budgets.spent")}</div>
                  <div className="mt-1 font-medium text-white">
                    {formatCurrency(budget.spent_amount, currency)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-mist">{t("budgets.limit")}</span>
                  <span className="mobile-safe-text text-right text-white">
                    {formatCurrency(budget.limit_amount, currency)}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-signal transition"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mobile-safe-text text-sm text-mist">
                  {t("budgets.remaining")}: {formatCurrency(budget.remaining_amount, currency)}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => handleEdit(budget)}
                >
                  {t("common.edit")}
                </Button>
                <Button
                  className="flex-1"
                  variant="ghost"
                  onClick={() => {
                    if (
                      window.confirm(`${t("budgets.deleteConfirm")} ${budget.category}?`)
                    ) {
                      deleteMutation.mutate(budget.id);
                    }
                  }}
                >
                  {t("common.delete")}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {!budgetsQuery.data?.length ? (
        <Card className="empty-state mt-6">
          <div className="font-medium text-white">{t("budgets.noBudgetsTitle")}</div>
          <p className="mt-1 text-sm text-mist">
            {t("budgets.noBudgetsBody")}
          </p>
        </Card>
      ) : null}

      <Modal
        open={open}
        title={editing ? t("budgets.editTitle") : t("budgets.addTitle")}
        subtitle={t("budgets.description")}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setForm(createInitialForm(month));
        }}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="category">{t("budgets.category")}</label>
            <Input
              id="category"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              placeholder={t("budgets.categoryPlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="limit_amount">{t("budgets.limitAmount")}</label>
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
            <label>{t("budgets.month")}</label>
            <MonthPicker
              value={form.month}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  month: value,
                }))
              }
            />
          </div>

          <FormError
            error={saveMutation.error}
            fallbackMessage={t("budgets.errorFallbackAdd")}
          />

          <ModalActions>
            <Button
              className="flex-1 sm:flex-none"
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setEditing(null);
                setForm(createInitialForm(month));
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button className="flex-1 sm:flex-none" type="submit">
              {saveMutation.isPending
                ? t("budgets.saving")
                : editing
                  ? t("common.save")
                  : t("budgets.add")}
            </Button>
          </ModalActions>
        </form>
      </Modal>
    </PageFrame>
  );
}
