"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { FormError } from "@/components/form-error";
import { PageFrame } from "@/components/page-frame";
import { Button, Card, Select } from "@/components/ui";
import {
  logout,
  sessionQueryKey,
  updateDefaultCurrency,
  useSessionQuery,
} from "@/lib/auth";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSessionQuery();
  const user = session.data;
  const [draftCurrency, setDraftCurrency] = useState<string | null>(null);
  const currency = draftCurrency ?? user?.currency ?? "USD";

  const updateCurrencyMutation = useMutation({
    mutationFn: updateDefaultCurrency,
    onSuccess: async (updatedUser) => {
      await queryClient.setQueryData(sessionQueryKey, updatedUser);
      setDraftCurrency(updatedUser.currency);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.removeQueries({ queryKey: sessionQueryKey });
      router.replace("/login");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateCurrencyMutation.mutate({ currency });
  }

  return (
    <PageFrame
      title="Settings"
      description="Review profile details, update your default currency, and manage your current session."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-mist">
                Profile
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Account details</h2>
              <p className="mt-2 text-sm text-mist">
                This information comes from your current authenticated session.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-mist">
                  Email
                </div>
                <div className="mt-2 break-all font-medium text-white">
                  {user?.email || "Not available"}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-mist">
                    Default currency
                  </div>
                  <div className="mt-2 font-medium text-white">
                    {user?.currency || "USD"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-mist">
                    Joined
                  </div>
                  <div className="mt-2 font-medium text-white">
                    {user?.created_at ? formatDateTime(user.created_at) : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-signal/80">
                Preferences
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Default currency
              </h2>
              <p className="mt-2 text-sm text-mist">
                This becomes the suggested currency for new accounts and the
                base currency for converted totals across the app.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="default-currency">Currency</label>
                <Select
                  id="default-currency"
                  value={currency}
                  onChange={(event) => setDraftCurrency(event.target.value)}
                >
                  {SUPPORTED_CURRENCIES.map((supportedCurrency) => (
                    <option key={supportedCurrency} value={supportedCurrency}>
                      {supportedCurrency}
                    </option>
                  ))}
                </Select>
              </div>

              <FormError
                error={updateCurrencyMutation.error}
                fallbackMessage="Unable to update default currency"
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={updateCurrencyMutation.isPending}>
                  {updateCurrencyMutation.isPending
                    ? "Saving..."
                    : "Save default currency"}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <Card className="flex flex-col justify-between gap-6 border-hazard/20 bg-hazard/5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-hazard">
              Session
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Sign out</h2>
            <p className="mt-2 text-sm text-mist">
              End this session and return to the login page.
            </p>
          </div>

          <Button
            className="w-full"
            variant="danger"
            onClick={() => logoutMutation.mutate()}
          >
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </Button>
        </Card>
      </div>
    </PageFrame>
  );
}
