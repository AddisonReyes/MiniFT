"use client";

import { Turnstile } from "@marsidev/react-turnstile";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type TurnstileWidgetProps = {
  action: "login" | "register";
  onClear: () => void;
  onVerify: (token: string) => void;
};

export function TurnstileWidget({
  action,
  onClear,
  onVerify,
}: TurnstileWidgetProps) {
  if (!turnstileSiteKey) {
    return (
      <div className="rounded-2xl border border-hazard/20 bg-hazard/10 px-4 py-3 text-sm text-hazard">
        Security verification is not configured.
      </div>
    );
  }

  return (
    <div className="turnstile-shell h-[65px] overflow-hidden rounded-[18px] bg-[#303030]">
      <Turnstile
        siteKey={turnstileSiteKey}
        onError={onClear}
        onExpire={onClear}
        onSuccess={onVerify}
        onTimeout={onClear}
        options={{
          action,
          responseField: false,
          size: "flexible",
          theme: "dark",
        }}
      />
    </div>
  );
}
