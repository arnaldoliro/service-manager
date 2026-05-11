"use client";

import { useState } from "react";
import { Play, Square, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import LoadingSpinner from "./LoadingSpinner";

type Action = "start" | "stop" | "restart";

type Props = {
  serverId: number;
  serviceName: string;
  onSuccess?: (action: Action) => void;
};

export default function ServiceActions({ serverId, serviceName, onSuccess }: Props) {
  const [pending, setPending] = useState<Action | null>(null);

  const execute = async (action: Action) => {
    setPending(action);
    const endpointMap: Record<Action, string> = {
      start: ENDPOINTS.servers.startService(serverId, serviceName),
      stop: ENDPOINTS.servers.stopService(serverId, serviceName),
      restart: ENDPOINTS.servers.restartService(serverId, serviceName),
    };
    const labelMap: Record<Action, string> = {
      start: "iniciado",
      stop: "parado",
      restart: "reiniciado",
    };

    try {
      await api.post(endpointMap[action]);
      toast.success(`Serviço ${serviceName} ${labelMap[action]} com sucesso`);
      onSuccess?.(action);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPending(null);
    }
  };

  const btn = (action: Action, Icon: React.ElementType, label: string, colorClass: string) => (
    <button
      onClick={() => execute(action)}
      disabled={!!pending}
      title={label}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colorClass}`}
    >
      {pending === action ? (
        <LoadingSpinner size="sm" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {btn("start", Play, "Iniciar", "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50")}
      {btn("stop", Square, "Parar", "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50")}
      {btn("restart", RotateCcw, "Reiniciar", "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50")}
    </div>
  );
}
