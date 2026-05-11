"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Server, AuditLog } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import Alert from "@/components/Alert";

export default function AuditPage() {
  const [serverId, setServerId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: servers } = useQuery({
    queryKey: ["servers"],
    queryFn: () => api.get<Server[]>(ENDPOINTS.servers.list).then((r) => r.data),
  });

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["audit", serverId],
    queryFn: () =>
      serverId
        ? api.get<AuditLog[]>(ENDPOINTS.servers.audit(serverId)).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!serverId,
    refetchInterval: 30_000,
  });

  const filtered = logs?.filter((l) => {
    if (!search) return true;
    return (
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Log</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Histórico de todas as ações realizadas no sistema
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3">
          <select
            value={serverId ?? ""}
            onChange={(e) => setServerId(e.target.value ? Number(e.target.value) : null)}
            className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:border-blue-500 outline-none"
          >
            <option value="">Selecionar servidor</option>
            {servers?.map((s) => (
              <option key={s.id} value={s.id}>{s.hostname}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ação ou detalhes..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Table */}
        {!serverId ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            Selecione um servidor para ver o audit log
          </div>
        ) : isLoading ? (
          <LoadingSpinner text="Carregando logs..." className="py-10" />
        ) : error ? (
          <div className="p-4">
            <Alert variant="error" message="Erro ao carregar audit log" />
          </div>
        ) : !filtered?.length ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            {search ? "Nenhum resultado encontrado" : "Nenhuma ação registrada"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                  <th className="px-5 pb-3 pt-1 font-medium">#</th>
                  <th className="px-3 pb-3 pt-1 font-medium">Ação</th>
                  <th className="px-3 pb-3 pt-1 font-medium">Detalhes</th>
                  <th className="px-3 pb-3 pt-1 font-medium">Usuário</th>
                  <th className="px-3 pb-3 pt-1 font-medium">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 text-gray-400">{log.id}</td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-900 dark:text-gray-100">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {log.details ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400">
                      #{log.user_id}
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
            {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
