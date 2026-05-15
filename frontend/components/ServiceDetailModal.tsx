"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Clock,
  FileCode2,
  FolderOpen,
  Hash,
  MemoryStick,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import type { Service, ServiceDetail } from "@/types";
import LoadingSpinner from "./LoadingSpinner";

type Action = "start" | "stop" | "restart";

type Props = {
  service: Service | null;
  serverId: number;
  isOpen: boolean;
  onClose: () => void;
  onAction: () => void;
};

// ─── animation helpers ───────────────────────────────────────────────────────

function useModalAnimation(isOpen: boolean) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Two RAFs ensure the element is painted before the transition starts
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  return { mounted, visible };
}

// ─── formatters ──────────────────────────────────────────────────────────────

function formatUptime(startTime: string): string {
  const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function formatCpuTime(seconds: number): string {
  // Total processor time accumulated since process start — not a live % metric.
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}min ${Math.floor(seconds % 60)}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}min`;
}

// ─── sub-components ──────────────────────────────────────────────────────────

const START_MODE_MAP: Record<string, string> = {
  auto: "Automático",
  manual: "Manual",
  disabled: "Desabilitado",
  boot: "Boot",
  system: "Sistema",
};

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string; dot: string }> = {
    running: {
      label: "RUNNING",
      cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      dot: "bg-green-500 animate-pulse",
    },
    stopped: {
      label: "STOPPED",
      cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      dot: "bg-red-500",
    },
    "start pending": {
      label: "INICIANDO",
      cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      dot: "bg-blue-500 animate-pulse",
    },
    "stop pending": {
      label: "PARANDO",
      cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      dot: "bg-orange-500 animate-pulse",
    },
    paused: {
      label: "PAUSADO",
      cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      dot: "bg-yellow-500",
    },
  };
  const c = cfg[status?.toLowerCase()] ?? {
    label: status?.toUpperCase() ?? "UNKNOWN",
    cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    dot: "bg-gray-400",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide", c.cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <Icon className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200 break-all">{value}</span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 text-center">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
      {children}
    </h3>
  );
}

// ─── main modal ──────────────────────────────────────────────────────────────

export default function ServiceDetailModal({ service, serverId, isOpen, onClose, onAction }: Props) {
  const { mounted, visible } = useModalAnimation(isOpen);
  const qc = useQueryClient();
  const [pending, setPending] = useState<Action | null>(null);

  const { data: detail, isLoading, error, refetch } = useQuery({
    queryKey: ["service-detail", serverId, service?.service_name],
    queryFn: async () => {
      const res = await api.get<ServiceDetail>(
        ENDPOINTS.servers.serviceDetail(serverId, service!.service_name)
      );
      // Keep the service list in sync with live WinRM data
      if (res.data.data_source === "live") {
        qc.setQueryData<Service[]>(["services", serverId], (old) =>
          old?.map((s) =>
            s.service_name === service!.service_name
              ? {
                  ...s,
                  status: res.data.status,
                  memory_mb: res.data.memory_mb ?? s.memory_mb,
                  start_mode: res.data.start_mode ?? s.start_mode,
                  start_time: res.data.start_time ?? s.start_time,
                }
              : s
          ) ?? []
        );
      }
      return res.data;
    },
    enabled: isOpen && !!service,
    staleTime: 0,          // always refetch when modal opens
    refetchOnMount: true,
  });

  const execute = async (action: Action) => {
    if (!service) return;
    setPending(action);
    const endpointMap: Record<Action, string> = {
      start: ENDPOINTS.servers.startService(serverId, service.service_name),
      stop: ENDPOINTS.servers.stopService(serverId, service.service_name),
      restart: ENDPOINTS.servers.restartService(serverId, service.service_name),
    };
    const labelMap: Record<Action, string> = { start: "iniciado", stop: "parado", restart: "reiniciado" };
    try {
      await api.post(endpointMap[action]);
      toast.success(`${service.service_name} ${labelMap[action]}`);
      qc.invalidateQueries({ queryKey: ["service-detail", serverId, service.service_name] });
      onAction();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPending(null);
    }
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [isOpen, onClose]);

  if (!mounted || !service) return null;

  const status = detail?.status ?? service.status;
  const isRunning = status === "running";
  const isStopped = status === "stopped";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full sm:max-w-2xl bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl",
          "border border-gray-200 dark:border-gray-700 flex flex-col max-h-[92vh]",
          "transition-all duration-300 ease-out",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {service.service_name}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Serviço Tomcat</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              title="Atualizar informações"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Fallback warning */}
          {!isLoading && detail?.data_source === "db" && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Não foi possível conectar via WinRM. As informações abaixo são do último sync (podem estar desatualizadas).
              </span>
            </div>
          )}

          {/* SERVICE INFO */}
          <div>
            <SectionTitle>Informações do Serviço</SectionTitle>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <LoadingSpinner text="Conectando ao servidor..." className="py-6" />
              ) : (
                <>
                  <InfoRow icon={FileCode2} label="Descrição" value={detail?.description} />
                  <InfoRow icon={FolderOpen} label="Caminho" value={detail?.path} />
                  <InfoRow
                    icon={Activity}
                    label="Modo início"
                    value={
                      detail?.start_mode
                        ? START_MODE_MAP[detail.start_mode.toLowerCase()] ?? detail.start_mode
                        : null
                    }
                  />
                </>
              )}
            </div>
          </div>

          {/* RUNTIME */}
          <div>
            <SectionTitle>Execução Atual</SectionTitle>
            {isLoading ? (
              <LoadingSpinner className="py-4" />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <StatCard
                    label="Uptime"
                    value={detail?.start_time ? formatUptime(detail.start_time) : "—"}
                    sub={detail?.start_time ? "em execução" : undefined}
                  />
                  <StatCard
                    label="Memória"
                    value={detail?.memory_mb != null ? `${detail.memory_mb} MB` : "—"}
                    sub={detail?.memory_mb != null ? "working set" : undefined}
                  />
                  <StatCard
                    label="CPU acumulado"
                    value={detail?.cpu_seconds != null ? formatCpuTime(detail.cpu_seconds) : "—"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Hash className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">PID</span>
                    <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                      {detail?.pid ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">Iniciado</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">
                      {detail?.start_time ? formatDate(detail.start_time) : "—"}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* HISTORY */}
          <div>
            <SectionTitle>Histórico de Ações</SectionTitle>
            {isLoading ? (
              <LoadingSpinner className="py-4" />
            ) : !detail?.history?.length ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Nenhuma ação registrada.</p>
            ) : (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                {detail.history.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300 truncate">
                        {entry.action}
                      </span>
                      {entry.username && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                          por {entry.username}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-3">
                      {entry.timestamp ? timeAgo(entry.timestamp) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-2 shrink-0">
          {/* Start */}
          {(isStopped || status === "unknown") && (
            <button
              onClick={() => execute("start")}
              disabled={!!pending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
            >
              {pending === "start" ? <LoadingSpinner size="sm" /> : <Play className="h-4 w-4" />}
              Iniciar Serviço
            </button>
          )}

          {/* Stop */}
          {isRunning && (
            <button
              onClick={() => execute("stop")}
              disabled={!!pending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
            >
              {pending === "stop" ? <LoadingSpinner size="sm" /> : <Square className="h-4 w-4" />}
              Parar Serviço
            </button>
          )}

          {/* Restart */}
          <button
            onClick={() => execute("restart")}
            disabled={!!pending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white transition-colors disabled:opacity-50"
          >
            {pending === "restart" ? <LoadingSpinner size="sm" /> : <RotateCcw className="h-4 w-4" />}
            Reiniciar
          </button>

          {/* Deploy */}
          <Link
            href="/deploy"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Fazer Deploy
          </Link>

          {/* Close */}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
