"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageFrame } from "@/components/page-frame";
import { Button, Card } from "@/components/ui";
import { RecurringFormModal } from "@/components/transactions/recurring-form-modal";
import { RecurringRulesSection } from "@/components/transactions/recurring-rules";
import { TransactionFiltersCard } from "@/components/transactions/transaction-filters";
import { TransactionFormModal } from "@/components/transactions/transaction-form-modal";
import { TransactionListSection } from "@/components/transactions/transaction-list";
import { TransferFormModal } from "@/components/transactions/transfer-form-modal";
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

function getQueryErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

export default function TransactionsPage() {
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

  const transactionQueryPath = createTransactionQueryPath(filters);

  const accountsQuery = useQuery({
    queryKey: ["transactions", "accounts"],
    queryFn: () => api.get<Account[]>("/accounts"),
  });

  const transactionsQuery = useQuery({
    queryKey: ["transactions", transactionQueryPath],
    queryFn: () => api.get<Transaction[]>(transactionQueryPath),
  });

  const recurringQuery = useQuery({
    queryKey: ["transactions", "recurring"],
    queryFn: () => api.get<RecurringTransaction[]>("/recurring-transactions"),
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
      title="Transactions"
      description="Track one-off entries, internal transfers, and recurring items from the same workspace."
      actions={
        <>
          <div className="grid w-full gap-3 sm:hidden">
            <Button onClick={() => setMobileActionMenuOpen((current) => !current)}>
              {isMobileActionMenuOpen ? "Close new activity" : "New activity"}
            </Button>
          </div>

          <div className="hidden w-full sm:grid sm:grid-cols-2 sm:gap-3 sm:w-auto lg:flex lg:flex-wrap">
            <Button
              variant="danger"
              onClick={() => openNewTransaction("expense")}
            >
              New expense
            </Button>
            <Button onClick={() => openNewTransaction("income")}>
              New income
            </Button>
            <Button variant="secondary" onClick={openNewTransfer}>
              New transfer
            </Button>
            <Button variant="secondary" onClick={openNewRecurring}>
              New recurring
            </Button>
          </div>
        </>
      }
    >
      {isMobileActionMenuOpen ? (
        <Card className="mb-6 space-y-4 p-4 sm:hidden">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
              Quick create
            </p>
            <p className="mt-2 text-sm text-mist">
              Pick the type of movement you want to add.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              className="w-full"
              variant="danger"
              onClick={() => openNewTransaction("expense")}
            >
              New expense
            </Button>
            <Button className="w-full" onClick={() => openNewTransaction("income")}>
              New income
            </Button>
            <Button className="w-full" variant="secondary" onClick={openNewTransfer}>
              New transfer
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              onClick={openNewRecurring}
            >
              New recurring
            </Button>
          </div>
        </Card>
      ) : null}

      <TransactionFiltersCard
        filters={filters}
        accounts={accounts}
        onReset={() => setFilters(createTransactionFilters())}
        onChange={(patch) =>
          setFilters((current) => ({ ...current, ...patch }))
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
                "Unable to load transactions for the current filters.",
              )
            : undefined
        }
        onEdit={openEditTransaction}
        onDelete={(transaction) => {
          const label =
            transaction.display_type === "transfer"
              ? "transfer"
              : "transaction";

          if (window.confirm(`Delete this ${label}?`)) {
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
                "Unable to load recurring transactions.",
              )
            : undefined
        }
        onEdit={openEditRecurring}
        onDelete={(recurringTransaction) => {
          if (
            window.confirm(
              `Delete recurring rule for ${recurringTransaction.category}?`,
            )
          ) {
            deleteRecurringMutation.mutate(recurringTransaction.id);
          }
        }}
      />

      <TransactionFormModal
        open={isTransactionModalOpen}
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

      <TransferFormModal
        open={isTransferModalOpen}
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

      <RecurringFormModal
        open={isRecurringModalOpen}
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
    </PageFrame>
  );
}
