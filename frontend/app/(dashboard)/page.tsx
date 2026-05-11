"use client";

import { useQuery } from "@tanstack/react-query";
import { Server, Upload, Activity, ClipboardList } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Server as ServerType, AuditLog } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import ServerCard from "@/components/ServerCard";

export default function DashboardPage() {
  const { data: servers, isLoading: loadingServers } = useQuery({
    queryKey: ["servers"],
    queryFn: () => api.get<ServerType[]>(ENDPOINTS.servers.list).then((r) => r.data),
  });

  const firstServer = servers?.[0];
  const { data: recentLogs } = useQuery({
    queryKey: ["audit", firstServer?.id],
    queryFn: () =>
      firstServer
        ? api.get<AuditLog[]>(ENDPOINTS.servers.audit(firstServer.id)).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!firstServer,
  });

  const stats = [
    {
      label: "Servidores",
      value: servers?.length ?? 0,
      icon: Server,
      color: "blue",
      href: "/servers",
    },
    {
      label: "Serviços Ativos",
      value: "—",
      icon: Activity,
      color: "green",
      href: "/servers",
    },
    {
      label: "Deploys",
      value: "—",
      icon: Upload,
      color: "purple",
      href: "/deploy",
    },
    {
      label: "Ações Recentes",
      value: recentLogs?.length ?? 0,
      icon: ClipboardList,
      color: "orange",
      href: "/audit",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Visão geral do sistema Tomcat Manager
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${colorMap[color]}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Servers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Servidores
          </h2>
          <Link
            href="/servers"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Ver todos →
          </Link>
        </div>

        {loadingServers ? (
          <LoadingSpinner text="Carregando servidores..." className="py-8" />
        ) : !servers?.length ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <Server className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum servidor cadastrado</p>
            <Link
              href="/servers"
              className="mt-3 inline-flex text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Adicionar servidor
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.slice(0, 6).map((s) => (
              <ServerCard key={s.id} server={s} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Audit */}
      {recentLogs && recentLogs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Ações Recentes
            </h2>
            <Link href="/audit" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden shadow-sm">
            {recentLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {log.action}
                  </p>
                  {log.details && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-sm">
                      {log.details}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-4">
                  {formatDate(log.timestamp)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Ações Rápidas
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { href: "/servers", label: "+ Adicionar Servidor", color: "blue" },
            { href: "/deploy", label: "Fazer Deploy", color: "purple" },
            { href: "/logs", label: "Ver Logs", color: "green" },
          ].map(({ href, label, color }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-center py-4 rounded-xl border-2 border-dashed text-sm font-medium transition-colors
                ${color === "blue" ? "border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20" : ""}
                ${color === "purple" ? "border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20" : ""}
                ${color === "green" ? "border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20" : ""}
              `}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
