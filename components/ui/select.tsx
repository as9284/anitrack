"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  placeholder?: string;
  align?: "left" | "right";
  side?: "top" | "bottom";
  className?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  ariaLabel,
  placeholder = "Select",
  align = "left",
  side = "bottom",
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const items =
      listRef.current?.querySelectorAll<HTMLButtonElement>("[data-opt]");
    items?.[selectedIndex]?.focus();
  }, [open, selectedIndex]);

  const choose = (next: string) => {
    onValueChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onOptionKey = (e: React.KeyboardEvent, index: number) => {
    const items = listRef.current
      ? Array.from(
          listRef.current.querySelectorAll<HTMLButtonElement>("[data-opt]"),
        )
      : [];
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[Math.min(index + 1, items.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[Math.max(index - 1, 0)]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 border border-line bg-surface px-3 py-2 text-xs text-ink transition-colors hover:border-ink focus:border-ink focus:outline-none"
      >
        <span className={cn(!selected && "text-muted")}>
          {selected?.label ?? placeholder}
        </span>
        <i
          className={cn(
            "ti ti-chevron-down text-muted transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          ref={listRef}
          className={cn(
            "absolute z-30 max-h-64 min-w-full overflow-auto border border-line bg-bg py-1 shadow-xl",
            side === "top" ? "bottom-full mb-1" : "top-full mt-1",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((option, index) => (
            <button
              key={option.value || "__all"}
              type="button"
              data-opt
              onClick={() => choose(option.value)}
              onKeyDown={(e) => onOptionKey(e, index)}
              className={cn(
                "flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-xs transition-colors",
                option.value === value
                  ? "text-ink"
                  : "text-muted hover:bg-surface hover:text-ink",
              )}
            >
              <span className="whitespace-nowrap">{option.label}</span>
              {option.value === value ? (
                <i className="ti ti-check text-accent" aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
