"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Server } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Server as ServerType, Service, AuditLog, Deployment } from "@/types";
import ServiceStatus from "@/components/ServiceStatus";
import ServiceActions from "@/components/ServiceActions";
import LoadingSpinner from "@/components/LoadingSpinner";
import Alert from "@/components/Alert";

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const serverId = Number(id);
  const [syncing, setSyncing] = useState(false);

  const { data: server, isLoading: loadingServer } = useQuery({
    queryKey: ["server", serverId],
    queryFn: () => api.get<ServerType>(ENDPOINTS.servers.get(serverId)).then((r) => r.data),
  });

  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ["services", serverId],
    queryFn: () => api.get<Service[]>(ENDPOINTS.servers.services(serverId)).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: logs } = useQuery({
    queryKey: ["audit", serverId],
    queryFn: () => api.get<AuditLog[]>(ENDPOINTS.servers.audit(serverId)).then((r) => r.data),
  });

  const { data: deployments } = useQuery({
    queryKey: ["deployments", serverId],
    queryFn: () =>
      api.get<Deployment[]>(ENDPOINTS.deploy.history(serverId)).then((r) => r.data),
  });

  const syncServices = async () => {
    setSyncing(true);
    try {
      const res = await api.post<{ synced: number }>(ENDPOINTS.servers.syncServices(serverId));
      toast.success(`${res.data.synced} serviço(s) sincronizado(s)`);
      qc.invalidateQueries({ queryKey: ["services", serverId] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const onServiceAction = () => {
    qc.invalidateQueries({ queryKey: ["services", serverId] });
    qc.invalidateQueries({ queryKey: ["audit", serverId] });
  };

  if (loadingServer) return <LoadingSpinner text="Carregando servidor..." className="py-20" />;
  if (!server) return <Alert variant="error" message="Servidor não encontrado" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {server.hostname}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              WinRM {server.winrm_port}
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Informações</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {[
            ["Hostname", server.hostname],
            ["Usuário", server.username],
            ["Porta WinRM", String(server.winrm_port)],
            ["Descrição", server.description ?? "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">
                {label}
              </dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Services */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Serviços Tomcat
          </h2>
          <button
            onClick={syncServices}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sincronizar
          </button>
        </div>

        {loadingServices ? (
          <LoadingSpinner text="Carregando serviços..." className="py-8" />
        ) : !services?.length ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
            Nenhum serviço encontrado. Clique em "Sincronizar" para buscar do servidor.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {services.map((svc) => (
              <div key={svc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-3">
                  <ServiceStatus status={svc.status} />
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {svc.service_name}
                  </span>
                </div>
                <ServiceActions
                  serverId={serverId}
                  serviceName={svc.service_name}
                  onSuccess={onServiceAction}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Deploys */}
      {deployments && deployments.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Deploys Recentes</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {deployments.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.app_name}</p>
                  <p className="text-xs text-gray-500">{d.war_file}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      d.status === "success"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : d.status === "failed"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    {d.status}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(d.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log */}
      {logs && logs.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Histórico de Ações</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.action}</p>
                  {log.details && (
                    <p className="text-xs text-gray-500 truncate max-w-sm">{log.details}</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 shrink-0 ml-4">{formatDate(log.timestamp)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
