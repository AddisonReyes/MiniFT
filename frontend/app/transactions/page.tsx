"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageFrame } from "@/components/page-frame";
import { Button, Card, Input, Modal, Select, TextArea, Badge } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useSessionQuery } from "@/lib/auth";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  Account,
  RecurringFrequency,
  RecurringTransaction,
  Transaction,
  TransactionType,
} from "@/lib/types";

const today = new Date().toISOString().slice(0, 10);

const initialTransactionForm = {
  account_id: "",
  amount: "",
  type: "expense" as Exclude<TransactionType, "transfer">,
  category: "",
  note: "",
  date: today,
};

const initialTransferForm = {
  from_account_id: "",
  to_account_id: "",
  amount: "",
  note: "",
  date: today,
};

const initialRecurringForm = {
  account_id: "",
  amount: "",
  type: "expense" as Exclude<TransactionType, "transfer">,
  category: "",
  note: "",
  frequency: "monthly" as RecurringFrequency,
  next_run_date: today,
};

export default function TransactionsPage() {
  const session = useSessionQuery();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    type: "",
    category: "",
    account_id: "",
    start_date: "",
    end_date: "",
  });
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);
  const [transactionForm, setTransactionForm] = useState(initialTransactionForm);
  const [transferForm, setTransferForm] = useState(initialTransferForm);
  const [recurringForm, setRecurringForm] = useState(initialRecurringForm);

  const accountsQuery = useQuery({
    queryKey: ["transactions", "accounts"],
    queryFn: () => api.get<Account[]>("/accounts"),
  });

  const transactionParams = new URLSearchParams();
  if (filters.type) transactionParams.set("type", filters.type);
  if (filters.category) transactionParams.set("category", filters.category);
  if (filters.account_id) transactionParams.set("account_id", filters.account_id);
  if (filters.start_date) transactionParams.set("start_date", filters.start_date);
  if (filters.end_date) transactionParams.set("end_date", filters.end_date);

  const transactionsQuery = useQuery({
    queryKey: ["transactions", transactionParams.toString()],
    queryFn: () =>
      api.get<Transaction[]>(
        `/transactions${transactionParams.toString() ? `?${transactionParams.toString()}` : ""}`,
      ),
  });

  const recurringQuery = useQuery({
    queryKey: ["transactions", "recurring"],
    queryFn: () => api.get<RecurringTransaction[]>("/recurring-transactions"),
  });

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
        return api.put<Transaction>(`/transactions/${editingTransaction.id}`, payload);
      }

      return api.post<Transaction>("/transactions", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setTransactionOpen(false);
      setEditingTransaction(null);
      setTransactionForm(initialTransactionForm);
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
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setTransferOpen(false);
      setTransferForm(initialTransferForm);
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
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setRecurringOpen(false);
      setEditingRecurring(null);
      setRecurringForm(initialRecurringForm);
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (transaction: Transaction) =>
      transaction.transfer_id
        ? api.delete(`/transfers/${transaction.transfer_id}`)
        : api.delete(`/transactions/${transaction.id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: (recurringId: string) => api.delete(`/recurring-transactions/${recurringId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  function openNewTransaction(type: Exclude<TransactionType, "transfer">) {
    setEditingTransaction(null);
    setTransactionForm({ ...initialTransactionForm, type });
    setTransactionOpen(true);
  }

  function openEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction);
    setTransactionForm({
      account_id: transaction.account_id || "",
      amount: String(transaction.amount),
      type: transaction.type as Exclude<TransactionType, "transfer">,
      category: transaction.category,
      note: transaction.note || "",
      date: transaction.date,
    });
    setTransactionOpen(true);
  }

  function openEditRecurring(recurring: RecurringTransaction) {
    setEditingRecurring(recurring);
    setRecurringForm({
      account_id: recurring.account_id,
      amount: String(recurring.amount),
      type: recurring.type,
      category: recurring.category,
      note: recurring.note || "",
      frequency: recurring.frequency,
      next_run_date: recurring.next_run_date,
    });
    setRecurringOpen(true);
  }

  const currency = session.data?.currency || "USD";
  const accounts = accountsQuery.data || [];

  return (
    <PageFrame
      title="Transactions"
      description="Track one-off entries, internal transfers, and recurring items from the same workspace."
      actions={
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => openNewTransaction("expense")}>New expense</Button>
          <Button variant="secondary" onClick={() => openNewTransaction("income")}>
            New income
          </Button>
          <Button variant="ghost" onClick={() => setTransferOpen(true)}>
            New transfer
          </Button>
          <Button variant="ghost" onClick={() => setRecurringOpen(true)}>
            New recurring
          </Button>
        </div>
      }
    >
      <Card className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Filters</h2>
          <p className="mt-1 text-sm text-mist">Narrow the transaction list by type, category, account, or date range.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <label htmlFor="type">Type</label>
            <Select
              id="type"
              value={filters.type}
              onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
            >
              <option value="">All</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="category">Category</label>
            <Input
              id="category"
              placeholder="Search category"
              value={filters.category}
              onChange={(event) =>
                setFilters((current) => ({ ...current, category: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="account">Account</label>
            <Select
              id="account"
              value={filters.account_id}
              onChange={(event) =>
                setFilters((current) => ({ ...current, account_id: event.target.value }))
              }
            >
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="start_date">Start Date</label>
            <Input
              id="start_date"
              type="date"
              value={filters.start_date}
              onChange={(event) =>
                setFilters((current) => ({ ...current, start_date: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="end_date">End Date</label>
            <Input
              id="end_date"
              type="date"
              value={filters.end_date}
              onChange={(event) =>
                setFilters((current) => ({ ...current, end_date: event.target.value }))
              }
            />
          </div>
        </div>
      </Card>

      <Card className="mt-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Transaction list</h2>
            <p className="mt-1 text-sm text-mist">Transfers show as mirrored movements for each account involved.</p>
          </div>
          <Badge tone="neutral">{transactionsQuery.data?.length || 0} rows</Badge>
        </div>

        <div className="table-shell">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-mist">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactionsQuery.data?.length ? (
                transactionsQuery.data.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-4">
                      <Badge
                        tone={
                          transaction.display_type === "income"
                            ? "success"
                            : transaction.display_type === "expense"
                              ? "danger"
                              : "amber"
                        }
                      >
                        {transaction.display_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{transaction.category}</div>
                      {transaction.note ? (
                        <div className="mt-1 max-w-xs text-xs text-mist">{transaction.note}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-mist">{transaction.account_name || "Cash"}</td>
                    <td className="px-4 py-4 text-mist">{formatDate(transaction.date)}</td>
                    <td className="px-4 py-4 text-right font-medium text-white">
                      {formatCurrency(transaction.amount, currency)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {transaction.display_type !== "transfer" ? (
                          <Button variant="secondary" onClick={() => openEditTransaction(transaction)}>
                            Edit
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          onClick={() => {
                            const label =
                              transaction.display_type === "transfer" ? "transfer" : "transaction";
                            if (window.confirm(`Delete this ${label}?`)) {
                              deleteTransactionMutation.mutate(transaction);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-mist" colSpan={6}>
                    No transactions match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recurring transactions</h2>
            <p className="mt-1 text-sm text-mist">The backend worker materializes entries when their next run date arrives.</p>
          </div>
          <Badge tone="neutral">{recurringQuery.data?.length || 0} rules</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {recurringQuery.data?.length ? (
            recurringQuery.data.map((recurring) => (
              <div
                key={recurring.id}
                className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">{recurring.category}</div>
                    <div className="mt-1 text-sm text-mist">
                      {recurring.type} on {recurring.account_name}
                    </div>
                  </div>
                  <Badge tone={recurring.type === "income" ? "success" : "danger"}>
                    {recurring.frequency}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-sm text-mist">
                  <div>Amount: {formatCurrency(recurring.amount, currency)}</div>
                  <div>Next run: {formatDate(recurring.next_run_date)}</div>
                  {recurring.note ? <div>Note: {recurring.note}</div> : null}
                </div>

                <div className="mt-5 flex gap-3">
                  <Button className="flex-1" variant="secondary" onClick={() => openEditRecurring(recurring)}>
                    Edit
                  </Button>
                  <Button
                    className="flex-1"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm(`Delete recurring rule for ${recurring.category}?`)) {
                        deleteRecurringMutation.mutate(recurring.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-mist">
              No recurring transactions configured.
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={transactionOpen}
        title={editingTransaction ? "Edit transaction" : "New transaction"}
        subtitle="Regular transactions affect a single account."
        onClose={() => {
          setTransactionOpen(false);
          setEditingTransaction(null);
          setTransactionForm(initialTransactionForm);
        }}
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            transactionMutation.mutate();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="transaction_type">Type</label>
              <Select
                id="transaction_type"
                value={transactionForm.type}
                onChange={(event) =>
                  setTransactionForm((current) => ({
                    ...current,
                    type: event.target.value as Exclude<TransactionType, "transfer">,
                  }))
                }
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="transaction_account">Account</label>
              <Select
                id="transaction_account"
                value={transactionForm.account_id}
                onChange={(event) =>
                  setTransactionForm((current) => ({
                    ...current,
                    account_id: event.target.value,
                  }))
                }
              >
                <option value="">Default cash account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="transaction_amount">Amount</label>
              <Input
                id="transaction_amount"
                inputMode="decimal"
                value={transactionForm.amount}
                onChange={(event) =>
                  setTransactionForm((current) => ({ ...current, amount: event.target.value }))
                }
                placeholder="100.00"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="transaction_date">Date</label>
              <Input
                id="transaction_date"
                type="date"
                value={transactionForm.date}
                onChange={(event) =>
                  setTransactionForm((current) => ({ ...current, date: event.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="transaction_category">Category</label>
            <Input
              id="transaction_category"
              list="category-suggestions"
              value={transactionForm.category}
              onChange={(event) =>
                setTransactionForm((current) => ({ ...current, category: event.target.value }))
              }
              placeholder="Groceries"
              required
            />
            <datalist id="category-suggestions">
              {DEFAULT_CATEGORIES.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <label htmlFor="transaction_note">Note</label>
            <TextArea
              id="transaction_note"
              value={transactionForm.note}
              onChange={(event) =>
                setTransactionForm((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="Optional context"
            />
          </div>

          {transactionMutation.error ? (
            <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
              {transactionMutation.error instanceof ApiError
                ? transactionMutation.error.message
                : "Unable to save transaction"}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTransactionOpen(false);
                setEditingTransaction(null);
                setTransactionForm(initialTransactionForm);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {transactionMutation.isPending
                ? "Saving..."
                : editingTransaction
                  ? "Save changes"
                  : "Create transaction"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={transferOpen}
        title="New transfer"
        subtitle="Transfers create mirrored entries so account balances stay in sync."
        onClose={() => {
          setTransferOpen(false);
          setTransferForm(initialTransferForm);
        }}
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            transferMutation.mutate();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="from_account">From Account</label>
              <Select
                id="from_account"
                value={transferForm.from_account_id}
                onChange={(event) =>
                  setTransferForm((current) => ({
                    ...current,
                    from_account_id: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select source account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="to_account">To Account</label>
              <Select
                id="to_account"
                value={transferForm.to_account_id}
                onChange={(event) =>
                  setTransferForm((current) => ({
                    ...current,
                    to_account_id: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select destination account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="transfer_amount">Amount</label>
              <Input
                id="transfer_amount"
                inputMode="decimal"
                value={transferForm.amount}
                onChange={(event) =>
                  setTransferForm((current) => ({ ...current, amount: event.target.value }))
                }
                placeholder="100.00"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="transfer_date">Date</label>
              <Input
                id="transfer_date"
                type="date"
                value={transferForm.date}
                onChange={(event) =>
                  setTransferForm((current) => ({ ...current, date: event.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="transfer_note">Note</label>
            <TextArea
              id="transfer_note"
              value={transferForm.note}
              onChange={(event) =>
                setTransferForm((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="Optional transfer note"
            />
          </div>

          {transferMutation.error ? (
            <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
              {transferMutation.error instanceof ApiError
                ? transferMutation.error.message
                : "Unable to create transfer"}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTransferOpen(false);
                setTransferForm(initialTransferForm);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {transferMutation.isPending ? "Creating..." : "Create transfer"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={recurringOpen}
        title={editingRecurring ? "Edit recurring transaction" : "New recurring transaction"}
        subtitle="Recurring items generate real transactions when their schedule is due."
        onClose={() => {
          setRecurringOpen(false);
          setEditingRecurring(null);
          setRecurringForm(initialRecurringForm);
        }}
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            recurringMutation.mutate();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="recurring_account">Account</label>
              <Select
                id="recurring_account"
                value={recurringForm.account_id}
                onChange={(event) =>
                  setRecurringForm((current) => ({
                    ...current,
                    account_id: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="recurring_type">Type</label>
              <Select
                id="recurring_type"
                value={recurringForm.type}
                onChange={(event) =>
                  setRecurringForm((current) => ({
                    ...current,
                    type: event.target.value as Exclude<TransactionType, "transfer">,
                  }))
                }
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="recurring_amount">Amount</label>
              <Input
                id="recurring_amount"
                inputMode="decimal"
                value={recurringForm.amount}
                onChange={(event) =>
                  setRecurringForm((current) => ({ ...current, amount: event.target.value }))
                }
                placeholder="85.00"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="recurring_frequency">Frequency</label>
              <Select
                id="recurring_frequency"
                value={recurringForm.frequency}
                onChange={(event) =>
                  setRecurringForm((current) => ({
                    ...current,
                    frequency: event.target.value as RecurringFrequency,
                  }))
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="recurring_category">Category</label>
              <Input
                id="recurring_category"
                value={recurringForm.category}
                onChange={(event) =>
                  setRecurringForm((current) => ({ ...current, category: event.target.value }))
                }
                placeholder="Rent"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="next_run_date">Next Run Date</label>
              <Input
                id="next_run_date"
                type="date"
                value={recurringForm.next_run_date}
                onChange={(event) =>
                  setRecurringForm((current) => ({ ...current, next_run_date: event.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="recurring_note">Note</label>
            <TextArea
              id="recurring_note"
              value={recurringForm.note}
              onChange={(event) =>
                setRecurringForm((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="Optional context"
            />
          </div>

          {recurringMutation.error ? (
            <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
              {recurringMutation.error instanceof ApiError
                ? recurringMutation.error.message
                : "Unable to save recurring transaction"}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setRecurringOpen(false);
                setEditingRecurring(null);
                setRecurringForm(initialRecurringForm);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {recurringMutation.isPending
                ? "Saving..."
                : editingRecurring
                  ? "Save changes"
                  : "Create recurring"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageFrame>
  );
}

