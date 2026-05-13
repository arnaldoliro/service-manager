"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Server, Deployment, DeployResult } from "@/types";
import DeployForm from "@/components/DeployForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import Alert from "@/components/Alert";

export default function DeployPage() {
  const [selectedServer, setSelectedServer] = useState<number | null>(null);

  const { data: servers } = useQuery({
    queryKey: ["servers"],
    queryFn: () => api.get<Server[]>(ENDPOINTS.servers.list()).then((r) => r.data),
  });

  const { data: history, refetch: refetchHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ["deployments", selectedServer],
    queryFn: () =>
      selectedServer
        ? api.get<Deployment[]>(ENDPOINTS.deploy.history(selectedServer)).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!selectedServer,
  });

  const onDeploySuccess = (result: DeployResult) => {
    if (selectedServer) refetchHistory();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Deploy</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Faça upload e deploy de arquivos WAR nos servidores
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Deploy Form */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Novo Deploy
          </h2>
          {!servers ? (
            <LoadingSpinner text="Carregando servidores..." className="py-8" />
          ) : servers.length === 0 ? (
            <Alert variant="warning" message="Nenhum servidor disponível. Adicione um servidor primeiro." />
          ) : (
            <DeployForm
              servers={servers}
              onSuccess={(result) => {
                const sid = result.deployment_id;
                onDeploySuccess(result);
              }}
            />
          )}
        </div>

        {/* History */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Histórico</h2>
              <select
                value={selectedServer ?? ""}
                onChange={(e) => setSelectedServer(e.target.value ? Number(e.target.value) : null)}
                className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 focus:border-blue-500 outline-none"
              >
                <option value="">Selecionar servidor</option>
                {servers?.map((s) => (
                  <option key={s.id} value={s.id}>{s.hostname}</option>
                ))}
              </select>
            </div>
          </div>

          {!selectedServer ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
              Selecione um servidor para ver o histórico
            </div>
          ) : loadingHistory ? (
            <LoadingSpinner text="Carregando..." className="py-8" />
          ) : !history?.length ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
              Nenhum deploy encontrado
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-y-auto">
              {history.map((d) => (
                <div key={d.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{d.app_name}</p>
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
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{d.war_file}</p>
                  {d.output && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{d.output}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(d.timestamp)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
