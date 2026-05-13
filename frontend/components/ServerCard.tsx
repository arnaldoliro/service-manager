"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  MemoryStick,
  Pencil,
  RotateCcw,
  Server,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Server as ServerType } from "@/types";

function maskIp(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.**`;
  }
  const idx = hostname.indexOf(".");
  if (idx !== -1) return hostname.slice(0, idx + 1) + "***";
  return hostname.slice(0, 3) + "***";
}

function formatMemory(mb: number | null | undefined): string | null {
  if (mb == null) return null;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

type Props = {
  server: ServerType;
  showIp: boolean;
  onToggleIp: () => void;
  onUpdate?: (updated: ServerType) => void;
  onHide?: (server: ServerType) => void;
  onRestore?: (server: ServerType) => void;
  compact?: boolean;
  isHidden?: boolean;
};

export default function ServerCard({
  server,
  showIp,
  onToggleIp,
  onUpdate,
  onHide,
  onRestore,
  compact = false,
  isHidden = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(server.name ?? server.hostname);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = server.name || server.hostname;
  const displayIp = showIp ? server.hostname : maskIp(server.hostname);
  const memFree = formatMemory(server.memory_available);
  const memTotal = formatMemory(server.memory_total);

  const startEdit = () => {
    setEditName(server.name ?? server.hostname);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditName(server.name ?? server.hostname);
  };

  const saveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === (server.name ?? server.hostname)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch<ServerType>(ENDPOINTS.servers.patch(server.id), {
        name: trimmed,
      });
      setEditing(false);
      onUpdate?.(res.data);
      toast.success("Nome atualizado");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveName();
    if (e.key === "Escape") cancelEdit();
  };

  const isOnline = server.status === "online";
  const isOffline = server.status === "offline";

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-900 rounded-xl border shadow-sm transition-shadow",
        isHidden
          ? "border-dashed border-gray-300 dark:border-gray-700 opacity-70"
          : "border-gray-200 dark:border-gray-700 hover:shadow-md"
      )}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                isHidden
                  ? "bg-gray-100 dark:bg-gray-800"
                  : "bg-blue-100 dark:bg-blue-900/30"
              )}
            >
              <Server
                className={cn(
                  "h-4 w-4",
                  isHidden
                    ? "text-gray-400 dark:text-gray-500"
                    : "text-blue-600 dark:text-blue-400"
                )}
              />
            </div>

            {/* Name / edit */}
            <div className="min-w-0">
              {editing ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={inputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={onKeyDown}
                    disabled={saving}
                    className="w-36 text-sm font-semibold bg-transparent border-b border-blue-500 outline-none text-gray-900 dark:text-gray-100"
                  />
                  <button
                    onClick={saveName}
                    disabled={saving}
                    className="p-0.5 text-green-600 hover:text-green-700 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-0.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate max-w-[140px]">
                    {displayName}
                  </h3>
                  {!compact && !isHidden && (
                    <button
                      onClick={startEdit}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status badge */}
          {isHidden ? (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Oculto
            </span>
          ) : (
            <span
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                isOnline && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                isOffline && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                !isOnline && !isOffline && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isOnline && "bg-green-500",
                  isOffline && "bg-red-500",
                  !isOnline && !isOffline && "bg-gray-400"
                )}
              />
              {isOnline ? "Online" : isOffline ? "Offline" : "—"}
            </span>
          )}
        </div>

        {/* Info rows */}
        <div className="mt-4 space-y-1.5">
          {/* IP */}
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="w-12 shrink-0 font-medium text-gray-500 dark:text-gray-500">IP</span>
            <span className="font-mono">{displayIp}</span>
            <button
              onClick={onToggleIp}
              className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title={showIp ? "Ocultar IP" : "Mostrar IP"}
            >
              {showIp ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* WinRM port */}
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="w-12 shrink-0 font-medium text-gray-500 dark:text-gray-500">WinRM</span>
            <span>{server.winrm_port}</span>
          </div>

          {/* Memory */}
          {memFree && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="w-12 shrink-0 font-medium text-gray-500 dark:text-gray-500">RAM</span>
              <MemoryStick className="h-3 w-3 shrink-0" />
              <span>
                {memFree} livre{memTotal ? ` / ${memTotal}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      {!compact && (
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
          {isHidden ? (
            <button
              onClick={() => onRestore?.(server)}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar
            </button>
          ) : (
            <>
              <button
                onClick={() => onHide?.(server)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:underline"
              >
                Remover da lista
              </button>
              <Link
                href={`/servers/${server.id}`}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Ver Detalhes
                <ExternalLink className="h-3 w-3" />
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
