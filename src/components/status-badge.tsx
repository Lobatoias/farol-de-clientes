import { cn, statusConfig } from "@/lib/utils";
import type { Status } from "@/lib/types";

interface StatusBadgeProps {
  status: Status;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function StatusBadge({ status, size = "md", showLabel = true, className }: StatusBadgeProps) {
  const cfg = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset font-medium",
        cfg.bg,
        cfg.ring,
        cfg.text,
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        className
      )}
    >
      <span className={cn("rounded-full", cfg.dot, size === "sm" ? "size-1.5" : "size-2")} />
      {showLabel && <span className="uppercase tracking-wide">{cfg.label}</span>}
    </span>
  );
}

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  const cfg = statusConfig[status];
  return <span className={cn("rounded-full size-2.5 inline-block", cfg.dot, className)} />;
}
