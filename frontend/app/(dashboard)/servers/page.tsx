"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Server } from "@/types";
import ServerCard from "@/components/ServerCard";
import ServerForm from "@/components/ServerForm";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import Alert from "@/components/Alert";
import { cn } from "@/lib/utils";

export default function ServersPage() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [showIp, setShowIp] = useLocalStorage("tmgr_ip_visible", false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Server | undefined>();
  const [hideTarget, setHideTarget] = useState<Server | null>(null);
  const [hiding, setHiding] = useState(false);

  const { data: servers, isLoading, error } = useQuery({
    queryKey: showHidden ? ["servers", "all"] : ["servers"],
    queryFn: () =>
      api.get<Server[]>(ENDPOINTS.servers.list(showHidden)).then((r) => r.data),
  });

  const visibleServers = (servers ?? []).filter((s) => s.visible);
  const hiddenServers = showHidden ? (servers ?? []).filter((s) => !s.visible) : [];

  const filterFn = (s: Server) => {
    const q = search.toLowerCase();
    return (
      (s.name ?? s.hostname).toLowerCase().includes(q) ||
      s.hostname.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q)
    );
  };

  const filteredVisible = visibleServers.filter(filterFn);
  const filteredHidden = hiddenServers.filter(filterFn);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["servers"] });
    qc.invalidateQueries({ queryKey: ["servers", "all"] });
  };

  const handleNameUpdate = (updated: Server) => {
    const key = showHidden ? ["servers", "all"] : ["servers"];
    qc.setQueryData<Server[]>(key, (old) =>
      old?.map((s) => (s.id === updated.id ? updated : s)) ?? []
    );
  };

  const confirmHide = async () => {
    if (!hideTarget) return;
    setHiding(true);
    try {
      await api.patch(ENDPOINTS.servers.patch(hideTarget.id), { visible: false });
      invalidate();
      toast.success(`"${hideTarget.name ?? hideTarget.hostname}" removido da lista`);
      setHideTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setHiding(false);
    }
  };

  const handleRestore = async (server: Server) => {
    try {
      await api.patch(ENDPOINTS.servers.patch(server.id), { visible: true });
      invalidate();
      toast.success(`"${server.name ?? server.hostname}" restaurado`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openAdd = () => { setEditTarget(undefined); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(undefined); };

  const onFormSuccess = (server: Server) => {
    invalidate();
    closeModal();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Servidores</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie os servidores Windows monitorados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHidden((v) => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
              showHidden
                ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900"
                : "text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <EyeOff className="h-4 w-4" />
            Mostrar Ocultos
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar servidores..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Visible servers */}
      {isLoading ? (
        <LoadingSpinner text="Carregando servidores..." className="py-12" />
      ) : error ? (
        <Alert variant="error" message="Erro ao carregar servidores" />
      ) : filteredVisible.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            {search ? "Nenhum servidor encontrado para a busca." : "Nenhum servidor cadastrado."}
          </p>
          {!search && (
            <button
              onClick={openAdd}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Adicionar servidor
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisible.map((s) => (
            <ServerCard
              key={s.id}
              server={s}
              showIp={showIp}
              onToggleIp={() => setShowIp((v) => !v)}
              onUpdate={handleNameUpdate}
              onHide={setHideTarget}
            />
          ))}
        </div>
      )}

      {/* Hidden servers section */}
      {showHidden && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">
              Servidores Ocultos
            </h2>
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400">
              {filteredHidden.length}
            </span>
          </div>

          {filteredHidden.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
              Nenhum servidor oculto.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHidden.map((s) => (
                <ServerCard
                  key={s.id}
                  server={s}
                  showIp={showIp}
                  onToggleIp={() => setShowIp((v) => !v)}
                  onRestore={handleRestore}
                  isHidden
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? "Editar Servidor" : "Adicionar Servidor"}
        size="md"
      >
        <ServerForm server={editTarget} onSuccess={onFormSuccess} onCancel={closeModal} />
      </Modal>

      {/* Hide confirm modal */}
      <Modal
        open={!!hideTarget}
        onClose={() => setHideTarget(null)}
        title="Remover da Lista"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setHideTarget(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmHide}
              disabled={hiding}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              {hiding && <LoadingSpinner size="sm" />}
              Remover da Lista
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-gray-700 dark:text-gray-300">
            Deseja remover{" "}
            <strong className="text-gray-900 dark:text-gray-100">
              {hideTarget?.name ?? hideTarget?.hostname}
            </strong>{" "}
            da lista?
          </p>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            Isso vai apenas remover da lista web. O servidor real não será deletado e pode ser restaurado depois.
          </div>
        </div>
      </Modal>
    </div>
  );
}
