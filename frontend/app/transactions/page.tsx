"use client";

import { startTransition, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageFrame } from "@/components/page-frame";
import { Button, Card } from "@/components/ui";
import { RecurringRulesSection } from "@/components/transactions/recurring-rules";
import { TransactionFiltersCard } from "@/components/transactions/transaction-filters";
import { TransactionListSection } from "@/components/transactions/transaction-list";
import { api } from "@/lib/api";
import { useSessionQuery } from "@/lib/auth";
import {
  createRecurringForm,
  createTransactionFilters,
  createTransactionForm,
  createTransactionQueryPath,
  createTransferForm,
  recurringToFormValues,
  transactionToFormValues,
} from "@/lib/transactions";
import type {
  Account,
  RecurringTransaction,
  Transaction,
  TransactionType,
} from "@/lib/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useTranslation } from "react-i18next";

const TransactionFormModal = dynamic(
  () =>
    import("@/components/transactions/transaction-form-modal").then(
      (module) => module.TransactionFormModal,
    ),
  { ssr: false },
);

const TransferFormModal = dynamic(
  () =>
    import("@/components/transactions/transfer-form-modal").then(
      (module) => module.TransferFormModal,
    ),
  { ssr: false },
);

const RecurringFormModal = dynamic(
  () =>
    import("@/components/transactions/recurring-form-modal").then(
      (module) => module.RecurringFormModal,
    ),
  { ssr: false },
);

function getQueryErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

export default function TransactionsPage() {
  const { t } = useTranslation();
  const session = useSessionQuery();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(createTransactionFilters);
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
  const [isTransferModalOpen, setTransferModalOpen] = useState(false);
  const [isRecurringModalOpen, setRecurringModalOpen] = useState(false);
  const [isMobileActionMenuOpen, setMobileActionMenuOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editingRecurring, setEditingRecurring] =
    useState<RecurringTransaction | null>(null);
  const [transactionForm, setTransactionForm] = useState(() =>
    createTransactionForm(),
  );
  const [transferForm, setTransferForm] = useState(createTransferForm);
  const [recurringForm, setRecurringForm] = useState(createRecurringForm);
  const debouncedFilters = useDebouncedValue(filters, 250);
  const isSessionReady = Boolean(session.data);

  const transactionQueryPath = createTransactionQueryPath(debouncedFilters);

  const accountsQuery = useQuery({
    queryKey: ["transactions", "accounts"],
    queryFn: () => api.get<Account[]>("/accounts"),
    enabled: isSessionReady,
    placeholderData: (previousData) => previousData,
  });

  const transactionsQuery = useQuery({
    queryKey: ["transactions", transactionQueryPath],
    queryFn: () => api.get<Transaction[]>(transactionQueryPath),
    enabled: isSessionReady,
    placeholderData: (previousData) => previousData,
  });

  const recurringQuery = useQuery({
    queryKey: ["transactions", "recurring"],
    queryFn: () => api.get<RecurringTransaction[]>("/recurring-transactions"),
    enabled: isSessionReady,
    placeholderData: (previousData) => previousData,
  });

  async function refreshTransactionsWorkspace() {
    await queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }

  function closeTransactionModal() {
    setTransactionModalOpen(false);
    setEditingTransaction(null);
    setTransactionForm(createTransactionForm());
  }

  function closeTransferModal() {
    setTransferModalOpen(false);
    setTransferForm(createTransferForm());
  }

  function closeRecurringModal() {
    setRecurringModalOpen(false);
    setEditingRecurring(null);
    setRecurringForm(createRecurringForm());
  }

  function openNewTransaction(type: Exclude<TransactionType, "transfer">) {
    setMobileActionMenuOpen(false);
    setEditingTransaction(null);
    setTransactionForm(createTransactionForm(type));
    setTransactionModalOpen(true);
  }

  function openEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction);
    setTransactionForm(transactionToFormValues(transaction));
    setTransactionModalOpen(true);
  }

  function openNewRecurring() {
    setMobileActionMenuOpen(false);
    setEditingRecurring(null);
    setRecurringForm(createRecurringForm());
    setRecurringModalOpen(true);
  }

  function openNewTransfer() {
    setMobileActionMenuOpen(false);
    setTransferModalOpen(true);
  }

  function openEditRecurring(recurringTransaction: RecurringTransaction) {
    setEditingRecurring(recurringTransaction);
    setRecurringForm(recurringToFormValues(recurringTransaction));
    setRecurringModalOpen(true);
  }

  const transactionMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        account_id: transactionForm.account_id || null,
        amount: transactionForm.amount,
        type: transactionForm.type,
        category: transactionForm.category,
        note: transactionForm.note || null,
        date: transactionForm.date,
      };

      if (editingTransaction) {
        return api.put<Transaction>(
          `/transactions/${editingTransaction.id}`,
          payload,
        );
      }

      return api.post<Transaction>("/transactions", payload);
    },
    onSuccess: async () => {
      await refreshTransactionsWorkspace();
      closeTransactionModal();
    },
  });

  const transferMutation = useMutation({
    mutationFn: () =>
      api.post("/transfers", {
        from_account_id: transferForm.from_account_id,
        to_account_id: transferForm.to_account_id,
        amount: transferForm.amount,
        note: transferForm.note || null,
        date: transferForm.date,
      }),
    onSuccess: async () => {
      await refreshTransactionsWorkspace();
      closeTransferModal();
    },
  });

  const recurringMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        account_id: recurringForm.account_id,
        amount: recurringForm.amount,
        type: recurringForm.type,
        category: recurringForm.category,
        note: recurringForm.note || null,
        frequency: recurringForm.frequency,
        next_run_date: recurringForm.next_run_date,
      };

      if (editingRecurring) {
        return api.put<RecurringTransaction>(
          `/recurring-transactions/${editingRecurring.id}`,
          payload,
        );
      }

      return api.post<RecurringTransaction>("/recurring-transactions", payload);
    },
    onSuccess: async () => {
      await refreshTransactionsWorkspace();
      closeRecurringModal();
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (transaction: Transaction) =>
      transaction.transfer_id
        ? api.delete(`/transfers/${transaction.transfer_id}`)
        : api.delete(`/transactions/${transaction.id}`),
    onSuccess: async () => {
      await refreshTransactionsWorkspace();
    },
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: (recurringId: string) =>
      api.delete(`/recurring-transactions/${recurringId}`),
    onSuccess: async () => {
      await refreshTransactionsWorkspace();
    },
  });

  const accounts = accountsQuery.data ?? [];
  const currency = session.data?.currency || "USD";

  return (
    <PageFrame
      title={t("transactions.title")}
      description={t("transactions.description")}
      actions={
        <>
          <div className="grid w-full gap-3 sm:hidden">
            <Button onClick={() => setMobileActionMenuOpen((current) => !current)}>
              {isMobileActionMenuOpen ? t("common.close") : t("transactions.add")}
            </Button>
          </div>

          <div className="hidden w-full sm:grid sm:grid-cols-2 sm:gap-3 sm:w-auto lg:flex lg:flex-wrap">
            <Button
              variant="danger"
              onClick={() => openNewTransaction("expense")}
            >
              {t("transactions.addExpense")}
            </Button>
            <Button onClick={() => openNewTransaction("income")}>
              {t("transactions.addIncome")}
            </Button>
            <Button variant="secondary" onClick={openNewTransfer}>
              {t("transactions.addTransfer")}
            </Button>
            <Button variant="secondary" onClick={openNewRecurring}>
              {t("transactions.addRecurring")}
            </Button>
          </div>
        </>
      }
    >
      {isMobileActionMenuOpen ? (
        <Card className="mb-6 space-y-4 p-4 sm:hidden">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              {t("transactions.actions")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              className="w-full"
              variant="danger"
              onClick={() => openNewTransaction("expense")}
            >
              {t("transactions.addExpense")}
            </Button>
            <Button className="w-full" onClick={() => openNewTransaction("income")}>
              {t("transactions.addIncome")}
            </Button>
            <Button className="w-full" variant="secondary" onClick={openNewTransfer}>
              {t("transactions.addTransfer")}
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              onClick={openNewRecurring}
            >
              {t("transactions.addRecurring")}
            </Button>
          </div>
        </Card>
      ) : null}

      <TransactionFiltersCard
        filters={filters}
        accounts={accounts}
        onReset={() =>
          startTransition(() => {
            setFilters(createTransactionFilters());
          })
        }
        onChange={(patch) =>
          startTransition(() => {
            setFilters((current) => ({ ...current, ...patch }));
          })
        }
      />

      <TransactionListSection
        transactions={transactionsQuery.data ?? []}
        currency={currency}
        isLoading={transactionsQuery.isLoading}
        errorMessage={
          transactionsQuery.error
            ? getQueryErrorMessage(
                transactionsQuery.error,
                t("transactions.list.errorTitle"),
              )
            : undefined
        }
        onEdit={openEditTransaction}
        onDelete={(transaction) => {
          const confirmKey =
            transaction.display_type === "transfer"
              ? "transactions.deleteTransferConfirm"
              : "transactions.deleteTransactionConfirm";

          if (window.confirm(t(confirmKey))) {
            deleteTransactionMutation.mutate(transaction);
          }
        }}
      />

      <RecurringRulesSection
        recurringTransactions={recurringQuery.data ?? []}
        currency={currency}
        isLoading={recurringQuery.isLoading}
        errorMessage={
          recurringQuery.error
            ? getQueryErrorMessage(
                recurringQuery.error,
                t("transactions.recurring.errorTitle"),
              )
            : undefined
        }
        onEdit={openEditRecurring}
        onDelete={(recurringTransaction) => {
          if (
            window.confirm(
              t("transactions.deleteRecurringConfirm", {
                category: recurringTransaction.category,
              }),
            )
          ) {
            deleteRecurringMutation.mutate(recurringTransaction.id);
          }
        }}
      />

      {isTransactionModalOpen ? (
        <TransactionFormModal
          open
          editingTransaction={editingTransaction}
          form={transactionForm}
          accounts={accounts}
          isPending={transactionMutation.isPending}
          error={transactionMutation.error}
          onChange={(patch) =>
            setTransactionForm((current) => ({
              ...current,
              ...patch,
            }))
          }
          onClose={closeTransactionModal}
          onSubmit={() => transactionMutation.mutate()}
        />
      ) : null}

      {isTransferModalOpen ? (
        <TransferFormModal
          open
          form={transferForm}
          accounts={accounts}
          isPending={transferMutation.isPending}
          error={transferMutation.error}
          onChange={(patch) =>
            setTransferForm((current) => ({
              ...current,
              ...patch,
            }))
          }
          onClose={closeTransferModal}
          onSubmit={() => transferMutation.mutate()}
        />
      ) : null}

      {isRecurringModalOpen ? (
        <RecurringFormModal
          open
          editingLabel={editingRecurring?.category}
          form={recurringForm}
          accounts={accounts}
          isPending={recurringMutation.isPending}
          error={recurringMutation.error}
          onChange={(patch) =>
            setRecurringForm((current) => ({
              ...current,
              ...patch,
            }))
          }
          onClose={closeRecurringModal}
          onSubmit={() => recurringMutation.mutate()}
        />
      ) : null}
    </PageFrame>
  );
}
