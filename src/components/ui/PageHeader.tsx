import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** "as-of" / "last-updated" slot, rendered top-right. */
  asOf?: React.ReactNode;
  /** Action buttons / controls, rendered top-right next to `asOf`. */
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  asOf,
  actions,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 border-b border-border pb-5", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {(asOf || actions) && (
          <div className="flex shrink-0 items-center gap-3">
            {asOf && <div className="text-xs text-muted-foreground">{asOf}</div>}
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
