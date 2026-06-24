"use client";

import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
  className?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  ariaLabel,
  className,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex h-5 w-5 flex-none items-center justify-center border transition-colors focus:outline-none",
        checked
          ? "border-accent bg-accent text-white"
          : "border-line bg-surface text-transparent hover:border-ink",
        className,
      )}
    >
      <i className="ti ti-check text-sm" aria-hidden="true" />
    </button>
  );
}
