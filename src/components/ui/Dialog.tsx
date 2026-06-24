"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name when there's no visible title element to reference. */
  ariaLabel?: string;
  /** id of a visible header element that names the dialog. */
  labelledBy?: string;
  /** Sizing/styling for the panel (e.g. `max-w-5xl`). */
  className?: string;
  children: React.ReactNode;
}

/**
 * Minimal accessible modal: backdrop + centered panel, focus trap, Esc/backdrop
 * close, body-scroll-lock, focus-restore on close. Renders null while closed
 * (so it's hydration-safe and adds no layout). Mirrors the CommandPalette's
 * modal a11y, factored out for reuse.
 */
export function Dialog({
  open,
  onClose,
  ariaLabel,
  labelledBy,
  className,
  children,
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);

  // Focus the first interactive element on open; lock scroll; restore on close.
  React.useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      (panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();
    });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    // Trap focus within the panel.
    const panel = panelRef.current;
    if (!panel) return;
    const nodes = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => el.offsetParent !== null);
    if (nodes.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const activeEl = document.activeElement;
    if (e.shiftKey && activeEl === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && activeEl === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-labelledby={labelledBy}
    >
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        onKeyDown={onKeyDown}
        tabIndex={-1}
        className={cn(
          "relative mt-[6vh] flex max-h-[88vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
