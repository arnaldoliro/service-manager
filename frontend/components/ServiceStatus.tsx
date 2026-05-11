import { cn, getStatusBadgeClass, getStatusDotClass } from "@/lib/utils";

type Props = {
  status: string;
  showDot?: boolean;
  className?: string;
};

export default function ServiceStatus({ status, showDot = true, className }: Props) {
  const label = status === "running" ? "Rodando" : status === "stopped" ? "Parado" : status;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        getStatusBadgeClass(status),
        className
      )}
    >
      {showDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", getStatusDotClass(status))} />
      )}
      {label}
    </span>
  );
}
