import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line/80 bg-surface-2/80 backdrop-blur shadow-[0_0_0_1px_rgba(255,255,255,0.02)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pb-2", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold tracking-wide text-ink", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-muted mt-1", className)} {...props} />;
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-2", className)} {...props} />;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  onClick,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "accent";
  onClick?: () => void;
  className?: string;
}) {
  const toneCls =
    tone === "ok"
      ? "text-ok"
      : tone === "warn"
        ? "text-warn"
        : tone === "accent"
          ? "text-accent"
          : "text-ink";
  return (
    <Card
      className={cn(
        "animate-fade-up",
        onClick &&
          "cursor-pointer transition hover:border-accent/50 hover:bg-surface-3/40",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <CardContent className="pt-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
          {label}
        </div>
        <div className={cn("mt-2 text-xl font-semibold font-mono", toneCls)}>
          {value}
        </div>
        {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
