"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  MemoryStick,
  Plus,
  RefreshCw,
  ScanSearch,
  Server,
  Timer,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { Server as ServerType, Service, ServiceDetail, DiscoveredService, AuditLog, Deployment } from "@/types";
import ServiceStatus from "@/components/ServiceStatus";
import ServiceDetailModal from "@/components/ServiceDetailModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import Alert from "@/components/Alert";

const PAGE_SIZE = 10;

const START_MODE_MAP: Record<string, string> = {
  auto: "Automático",
  manual: "Manual",
  disabled: "Desabilitado",
  boot: "Boot",
  system: "Sistema",
};

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

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const serverId = Number(id);
  const [syncing, setSyncing] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<DiscoveredService[] | null>(null);
  const [addingDiscovered, setAddingDiscovered] = useState<Set<string>>(new Set());
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Remove service state
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  // Add service state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);

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

  // Reset to page 1 whenever the services list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [services]);

  // Sort: running first, then by memory desc within each group
  const sortedServices = useMemo(() => {
    if (!services) return [];
    return [...services].sort((a, b) => {
      const aRank = a.status === "running" ? 0 : 1;
      const bRank = b.status === "running" ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;
      return (b.memory_mb ?? -1) - (a.memory_mb ?? -1);
    });
  }, [services]);

  const totalPages = Math.ceil(sortedServices.length / PAGE_SIZE);
  const paginatedServices = sortedServices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const syncServices = async () => {
    setSyncing(true);
    try {
      const res = await api.post<{ synced: number }>(ENDPOINTS.servers.syncServices(serverId));
      toast.success(`${res.data.synced} serviço(s) sincronizado(s)`);
      await qc.refetchQueries({ queryKey: ["services", serverId] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const removeService = async (svc: Service) => {
    setRemovingId(svc.id);
    try {
      await api.delete(ENDPOINTS.servers.deleteService(serverId, svc.id));
      toast.success(`"${svc.service_name}" removido da lista`);
      qc.invalidateQueries({ queryKey: ["services", serverId] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRemovingId(null);
      setConfirmRemoveId(null);
    }
  };

  const addServiceByName = async (name: string): Promise<boolean> => {
    try {
      await api.post(ENDPOINTS.servers.createService(serverId), { service_name: name });
      await qc.refetchQueries({ queryKey: ["services", serverId] });
      // Non-blocking: pull real status from WinRM and patch cache when it arrives
      api.get<ServiceDetail>(ENDPOINTS.servers.serviceDetail(serverId, name))
        .then((res) => {
          if (res.data.data_source === "live") {
            qc.setQueryData<Service[]>(["services", serverId], (old) =>
              old?.map((s) =>
                s.service_name === name
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
        })
        .catch(() => {});
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return false;
    }
  };

  const addService = async () => {
    const name = addName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const ok = await addServiceByName(name);
      if (ok) {
        toast.success(`"${name}" adicionado à lista`);
        setAddName("");
        setShowAddForm(false);
      }
    } finally {
      setAdding(false);
    }
  };

  const discoverServices = async () => {
    setDiscovering(true);
    try {
      const res = await api.post<DiscoveredService[]>(ENDPOINTS.servers.discoverServices(serverId));
      setDiscoverResult(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDiscovering(false);
    }
  };

  const addDiscoveredService = async (name: string) => {
    setAddingDiscovered((prev) => new Set(prev).add(name));
    try {
      const ok = await addServiceByName(name);
      if (ok) {
        toast.success(`"${name}" adicionado à lista`);
        setDiscoverResult((prev) =>
          prev?.map((s) => (s.name === name ? { ...s, already_added: true } : s)) ?? null
        );
      }
    } finally {
      setAddingDiscovered((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  const openServiceModal = (svc: Service) => {
    setSelectedService(svc);
    setModalOpen(true);
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
              {server.name}
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
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Serviços Tomcat</h2>
            {services?.length ? (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                ({services.length})
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAddForm((v) => !v); setAddName(""); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
            <button
              onClick={discoverServices}
              disabled={discovering}
              title="Varrer o servidor em busca de serviços Tomcat/Catalina/Webrun não cadastrados"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-violet-600 dark:text-violet-400 border border-violet-300 dark:border-violet-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-50"
            >
              <ScanSearch className={`h-4 w-4 ${discovering ? "animate-pulse" : ""}`} />
              Descobrir
            </button>
            <button
              onClick={syncServices}
              disabled={syncing}
              title="Atualizar status dos serviços já cadastrados"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sincronizar
            </button>
          </div>
        </div>

        {/* Add service inline form */}
        {showAddForm && (
          <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-900/10 border-b border-emerald-200 dark:border-emerald-800">
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-2 font-medium">
              Adiciona apenas à lista da aplicação web — não cria nem afeta o serviço real no servidor.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); addService(); }}
              className="flex items-center gap-2"
            >
              <input
                autoFocus
                type="text"
                placeholder="Nome do serviço (ex: Tomcat9)"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                pattern="^[A-Za-z0-9_\-\. ]{1,256}$"
                title="Apenas letras, números, hífen, underscore, ponto e espaço"
                className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={adding || !addName.trim()}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Check className="h-4 w-4" />
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {loadingServices ? (
          <LoadingSpinner text="Carregando serviços..." className="py-8" />
        ) : !services?.length ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
            Nenhum serviço encontrado. Clique em "Sincronizar" para buscar do servidor ou "Adicionar" para incluir manualmente.
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedServices.map((svc) => (
                <div
                  key={svc.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  {/* Clickable info area */}
                  <button
                    onClick={() => openServiceModal(svc)}
                    className="flex flex text-left gap-1 flex-1 min-w-0 hover:opacity-75 transition-opacity"
                  >
                    <div className="flex items-center gap-2.5">
                      <ServiceStatus status={svc.status} />
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate mr-3">
                        {svc.service_name}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {svc.memory_mb != null && (
                        <span className="flex items-center gap-1">
                          <MemoryStick className="h-3 w-3 shrink-0" />
                          {svc.memory_mb} MB
                        </span>
                      )}
                      {svc.start_mode && (
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3 shrink-0" />
                          {START_MODE_MAP[svc.start_mode.toLowerCase()] ?? svc.start_mode}
                        </span>
                      )}
                      {svc.start_time && svc.status === "running" && (
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3 shrink-0" />
                          {formatUptime(svc.start_time)}
                        </span>
                      )}
                      {svc.memory_mb == null && !svc.start_mode && !svc.start_time && (
                        <span className="italic text-gray-400 dark:text-gray-600">
                          Sincronize para ver detalhes
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Delete control */}
                  {confirmRemoveId === svc.id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-red-600 dark:text-red-400">Remover?</span>
                      <button
                        onClick={() => removeService(svc)}
                        disabled={removingId === svc.id}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemoveId(svc.id)}
                      title="Remover da lista (não afeta o serviço real)"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, sortedServices.length)} de{" "}
                  {sortedServices.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      currentPage === 1
                        ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-gray-600 dark:text-gray-400 px-2 tabular-nums">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      currentPage === totalPages
                        ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    )}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
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

      <ServiceDetailModal
        service={selectedService}
        serverId={serverId}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAction={onServiceAction}
      />

      {/* Discovery Modal */}
      {discoverResult !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            onClick={() => setDiscoverResult(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <div className="relative w-full sm:max-w-xl bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <ScanSearch className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                    Serviços Descobertos
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {discoverResult.length === 0
                      ? "Nenhum serviço encontrado"
                      : (() => {
                          const newCount = discoverResult.filter((s) => !s.already_added).length;
                          const existingCount = discoverResult.length - newCount;
                          return [
                            `${discoverResult.length} encontrado${discoverResult.length !== 1 ? "s" : ""}`,
                            newCount > 0 && `${newCount} novo${newCount !== 1 ? "s" : ""}`,
                            existingCount > 0 && `${existingCount} já cadastrado${existingCount !== 1 ? "s" : ""}`,
                          ]
                            .filter(Boolean)
                            .join(" · ");
                        })()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDiscoverResult(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              {discoverResult.length === 0 ? (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                  Nenhum serviço Tomcat / Catalina / Webrun encontrado no servidor.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {discoverResult.map((svc) => (
                    <div key={svc.name} className="flex items-start gap-3 px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {svc.name}
                          </span>
                          {svc.display_name && svc.display_name !== svc.name && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {svc.display_name}
                            </span>
                          )}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                              svc.status === "running"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : svc.status === "stopped"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                svc.status === "running"
                                  ? "bg-green-500"
                                  : svc.status === "stopped"
                                  ? "bg-red-500"
                                  : "bg-gray-400"
                              )}
                            />
                            {svc.status.toUpperCase()}
                          </span>
                        </div>
                        {svc.path && (
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 truncate" title={svc.path}>
                            {svc.path}
                          </p>
                        )}
                      </div>

                      {svc.already_added ? (
                        <span className="shrink-0 mt-0.5 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                          Cadastrado
                        </span>
                      ) : (
                        <button
                          onClick={() => addDiscoveredService(svc.name)}
                          disabled={addingDiscovered.has(svc.name)}
                          className="shrink-0 mt-0.5 flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          {addingDiscovered.has(svc.name) ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          Adicionar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end shrink-0">
              <button
                onClick={() => setDiscoverResult(null)}
                className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
