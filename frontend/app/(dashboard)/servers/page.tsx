"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Server } from "@/types";
import ServerTable from "@/components/ServerTable";
import ServerForm from "@/components/ServerForm";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import Alert from "@/components/Alert";

export default function ServersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Server | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Server | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: servers, isLoading, error } = useQuery({
    queryKey: ["servers"],
    queryFn: () => api.get<Server[]>(ENDPOINTS.servers.list).then((r) => r.data),
  });

  const filtered = servers?.filter((s) =>
    s.hostname.toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditTarget(undefined); setModalOpen(true); };
  const openEdit = (s: Server) => { setEditTarget(s); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(undefined); };

  const onSuccess = (server: Server) => {
    qc.setQueryData<Server[]>(["servers"], (old) => {
      if (!old) return [server];
      const exists = old.find((s) => s.id === server.id);
      return exists ? old.map((s) => (s.id === server.id ? server : s)) : [...old, server];
    });
    closeModal();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(ENDPOINTS.servers.delete(deleteTarget.id));
      qc.setQueryData<Server[]>(["servers"], (old) =>
        old?.filter((s) => s.id !== deleteTarget.id) ?? []
      );
      toast.success(`Servidor "${deleteTarget.hostname}" deletado`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Servidores</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie os servidores Windows monitorados
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar Servidor
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar servidores..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="p-4">
          {isLoading ? (
            <LoadingSpinner text="Carregando servidores..." className="py-10" />
          ) : error ? (
            <Alert variant="error" message="Erro ao carregar servidores" />
          ) : (
            <ServerTable
              servers={filtered ?? []}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? "Editar Servidor" : "Adicionar Servidor"}
        size="md"
      >
        <ServerForm
          server={editTarget}
          onSuccess={onSuccess}
          onCancel={closeModal}
        />
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirmar Exclusão"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting && <LoadingSpinner size="sm" />}
              Deletar
            </button>
          </>
        }
      >
        <p className="text-gray-700 dark:text-gray-300">
          Tem certeza que deseja deletar o servidor{" "}
          <strong className="text-gray-900 dark:text-gray-100">
            {deleteTarget?.hostname}
          </strong>
          ? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
