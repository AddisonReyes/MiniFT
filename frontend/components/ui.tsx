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
  return <div className={cn("panel p-6", className)} {...props} />;
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-signal text-ink hover:bg-signal/90",
    secondary: "border border-white/10 bg-white/5 text-white hover:bg-white/10",
    ghost: "bg-transparent text-mist hover:bg-white/5 hover:text-white",
    danger: "bg-hazard text-ink hover:bg-hazard/90",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition",
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
    neutral: "bg-white/10 text-white",
    success: "bg-signal/15 text-signal",
    danger: "bg-hazard/15 text-hazard",
    amber: "bg-amber/15 text-amber",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#0f1420] p-6 shadow-panel">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
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
