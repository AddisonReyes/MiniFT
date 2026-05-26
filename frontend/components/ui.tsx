"use client";

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useTranslation } from "react-i18next";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("panel min-w-0 p-4 sm:p-6", className)} {...props} />
  );
}

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-signal text-ink shadow-soft hover:bg-signal/90",
    secondary:
      "border border-white/10 bg-white/[0.055] text-white hover:border-white/15 hover:bg-white/10",
    ghost:
      "border border-transparent bg-transparent text-mist hover:border-white/10 hover:bg-white/[0.055] hover:text-white",
    danger: "bg-hazard text-ink shadow-soft hover:bg-hazard/90",
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-12 min-w-0 items-center justify-center rounded-2xl px-4 py-3 text-center text-sm font-medium leading-tight transition active:translate-y-px focus:outline-none focus:ring-2 focus:ring-signal/40 focus:ring-offset-2 focus:ring-offset-ink",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} />;
}

export function SegmentedControl({
  className,
  options,
  value,
  onChange,
}: {
  className?: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 rounded-[20px] border border-white/10 bg-ink/35 p-1",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "min-h-10 whitespace-normal rounded-[16px] px-2 py-2 text-center text-xs font-medium leading-tight transition sm:min-h-11 sm:px-3 sm:text-sm",
              active
                ? "bg-white text-ink shadow-sm"
                : "text-mist hover:bg-white/[0.06] hover:text-white",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "danger" | "amber";
}) {
  const tones = {
    neutral: "border-white/10 bg-white/[0.055] text-white",
    success: "border-signal/20 bg-signal/10 text-signal",
    danger: "border-hazard/20 bg-hazard/10 text-hazard",
    amber: "border-amber/20 bg-amber/10 text-amber",
  };

  return (
    <span
      className={cn(
        "inline-flex max-w-full rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] sm:tracking-[0.18em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/88 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,20,32,0.985),rgba(11,16,24,0.992))] p-5 pb-0 shadow-panel backdrop-blur-xl sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl sm:rounded-[32px] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15 sm:hidden" />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
            {subtitle ? (
              <p className="mt-2 text-sm text-mist">{subtitle}</p>
            ) : null}
          </div>
          <Button
            className="hidden shrink-0 px-3 sm:inline-flex sm:px-4"
            variant="ghost"
            onClick={onClose}
          >
            {t("common.close")}
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-5 -mb-px mt-8 grid grid-cols-2 gap-3 border-t border-white/10 bg-[linear-gradient(180deg,rgba(13,18,29,0.98),rgba(10,14,24,0.995))] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl sm:static sm:mx-0 sm:mb-0 sm:mt-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0",
        className,
      )}
      {...props}
    />
  );
}
