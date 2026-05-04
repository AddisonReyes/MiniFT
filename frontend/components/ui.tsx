"use client";

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

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
    secondary: "border border-white/10 bg-white/[0.055] text-white hover:border-white/15 hover:bg-white/10",
    ghost: "border border-transparent bg-transparent text-mist hover:border-white/10 hover:bg-white/[0.055] hover:text-white",
    danger: "bg-hazard text-ink shadow-soft hover:bg-hazard/90",
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-signal/40 focus:ring-offset-2 focus:ring-offset-ink",
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
        "inline-flex max-w-full rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]",
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
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-3 backdrop-blur-sm sm:p-4">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-white/10 bg-[#0f1420] p-5 shadow-panel sm:max-h-[calc(100dvh-2rem)] sm:rounded-[32px] sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
            {subtitle ? (
              <p className="mt-2 text-sm text-mist">{subtitle}</p>
            ) : null}
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
