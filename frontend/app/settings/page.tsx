"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { PageFrame } from "@/components/page-frame";
import { Button, Card } from "@/components/ui";
import { logout, sessionQueryKey, useSessionQuery } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSessionQuery();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.removeQueries({ queryKey: sessionQueryKey });
      router.replace("/login");
    },
  });

  const user = session.data;

  return (
    <PageFrame
      title="Settings"
      description="Review profile details, preferences, and your current session."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
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
                  Currency
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
