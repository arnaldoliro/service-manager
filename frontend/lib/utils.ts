import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), "HH:mm:ss", { locale: ptBR });
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    running: "green",
    stopped: "red",
    unknown: "yellow",
    success: "green",
    failed: "red",
    in_progress: "blue",
    online: "green",
    offline: "red",
  };
  return map[status?.toLowerCase()] ?? "gray";
}

export function getStatusBadgeClass(status: string): string {
  const color = getStatusColor(status);
  const map: Record<string, string> = {
    green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return map[color] ?? map.gray;
}

export function getStatusDotClass(status: string): string {
  const color = getStatusColor(status);
  const map: Record<string, string> = {
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    blue: "bg-blue-500",
    gray: "bg-gray-500",
  };
  return map[color] ?? map.gray;
}
