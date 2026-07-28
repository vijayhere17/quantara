import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button
        type="button"
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 my-4 w-full rounded-xl border border-line bg-surface-2 shadow-2xl animate-fade-up",
          wide ? "max-w-5xl" : "max-w-3xl",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
            ) : null}
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function FlowStep({
  label,
  detail,
  tone = "default",
  last,
}: {
  label: string;
  detail?: string;
  tone?: "default" | "ok" | "warn" | "muted";
  last?: boolean;
}) {
  const color =
    tone === "ok"
      ? "border-ok text-ok"
      : tone === "warn"
        ? "border-warn text-warn"
        : tone === "muted"
          ? "border-line text-muted"
          : "border-accent text-ink";
  return (
    <div className="flex flex-col items-start">
      <div className={cn("rounded-lg border bg-surface px-3 py-2 text-sm", color)}>
        <div className="font-medium">{label}</div>
        {detail ? <div className="mt-0.5 text-xs text-muted">{detail}</div> : null}
      </div>
      {!last ? <div className="ml-4 h-4 w-px bg-line" /> : null}
    </div>
  );
}
