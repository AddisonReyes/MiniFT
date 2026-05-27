"use client";

import { useState, type InputHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";

import { Input, cn } from "@/components/ui";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

function EyeIcon({ closed }: { closed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
      {closed ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const label = isVisible ? t("auth.hidePassword") : t("auth.viewPassword");

  return (
    <div className="relative">
      <Input
        className={cn("pr-12", className)}
        type={isVisible ? "text" : "password"}
        {...props}
      />
      <button
        type="button"
        className="absolute inset-y-1.5 right-1.5 inline-flex w-10 items-center justify-center rounded-xl text-mist transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-signal/40 focus:ring-offset-2 focus:ring-offset-ink"
        aria-label={label}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
      >
        <EyeIcon closed={!isVisible} />
      </button>
    </div>
  );
}
