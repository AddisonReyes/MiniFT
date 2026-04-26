"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { FormError } from "@/components/form-error";
import { PageFrame } from "@/components/page-frame";
import { Button, Card, Input, Modal, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { useSessionQuery } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import type { Account, AccountType } from "@/lib/types";

const initialForm = {
  name: "",
  type: "bank" as AccountType,
};

export default function AccountsPage() {
  const session = useSessionQuery();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(initialForm);

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<Account[]>("/accounts"),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return api.put<Account>(`/accounts/${editing.id}`, form);
      }

      return api.post<Account>("/accounts", form);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setOpen(false);
      setEditing(null);
      setForm(initialForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (accountId: string) =>
      api.delete<{ message: string }>(`/accounts/${accountId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(initialForm);
    setOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({
      name: account.name,
      type: account.type,
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
      title="Accounts"
      description="Manage the cash and bank containers that your transactions and transfers flow through."
      actions={<Button onClick={openCreate}>New account</Button>}
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {(accountsQuery.data || []).map((account) => (
          <Card
            key={account.id}
            className="space-y-5 transition hover:border-white/15 hover:bg-white/[0.035]"
          >
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.22em] text-mist">
                {account.type}
              </div>
              <h2 className="text-2xl font-semibold">{account.name}</h2>
              <p className="text-sm text-mist">Current balance</p>
              <div className="text-3xl font-semibold text-white">
                {formatCurrency(account.balance, currency)}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => openEdit(account)}
              >
                Edit
              </Button>
              <Button
                className="flex-1"
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Delete ${account.name}?`)) {
                    deleteMutation.mutate(account.id);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {!accountsQuery.data?.length ? (
        <Card className="empty-state mt-6">
          <div className="font-medium text-white">No accounts yet</div>
          <p className="mt-1 text-sm text-mist">
            Add a cash or bank account to start separating balances and tracking
            transfers.
          </p>
        </Card>
      ) : null}

      <Modal
        open={open}
        title={editing ? "Edit account" : "Create account"}
        subtitle="Accounts keep balances separate while transfers move money between them."
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setForm(initialForm);
        }}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="name">Name</label>
            <Input
              id="name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Banco Popular"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="type">Type</label>
            <Select
              id="type"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as AccountType,
                }))
              }
            >
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
            </Select>
          </div>

          <FormError
            error={saveMutation.error}
            fallbackMessage="Unable to save account"
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setEditing(null);
                setForm(initialForm);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {saveMutation.isPending
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Create account"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageFrame>
  );
}
