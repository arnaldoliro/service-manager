"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "error" | "success" | "info" | "warning";

type Props = {
  variant?: Variant;
  title?: string;
  message: string;
  dismissible?: boolean;
  className?: string;
};

const styles: Record<Variant, { container: string; icon: React.ReactNode }> = {
  error: {
    container: "bg-red-50 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400",
    icon: <AlertCircle className="h-5 w-5 text-red-500" />,
  },
  success: {
    container: "bg-green-50 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400",
    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
  },
  info: {
    container: "bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400",
    icon: <Info className="h-5 w-5 text-blue-500" />,
  },
  warning: {
    container: "bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-400",
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  },
};

export default function Alert({ variant = "info", title, message, dismissible, className }: Props) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const { container, icon } = styles[variant];

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-4", container, className)}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <p className="text-sm">{message}</p>
      </div>
      {dismissible && (
        <button onClick={() => setVisible(false)} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
