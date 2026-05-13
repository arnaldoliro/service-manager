"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useAdminTeam } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { api, getErrorMessage } from "@/lib/api";
import { TEAMS_ENDPOINTS, ENDPOINTS } from "@/lib/constants";
import PermissionMatrix from "@/components/PermissionMatrix";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Server } from "@/types";

type Params = { id: string };

const DEFAULT_PERMS = { view: true, deploy: false, restart: false };

export default function TeamServersPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const teamId = parseInt(id);
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: team, isLoading: teamLoading } = useAdminTeam(teamId);
  const { data: allServers } = useQuery<Server[]>({
    queryKey: ["servers"],
    queryFn: () => api.get<Server[]>(ENDPOINTS.servers.list()).then((r) => r.data),
    enabled: !!user?.is_admin,
  });

  const [selectedServerId, setSelectedServerId] = useState("");
  const [newPerms, setNewPerms] = useState<Record<string, boolean>>(DEFAULT_PERMS);
  const [saving, setSaving] = useState(false);

  if (!user?.is_admin) {
    return <div className="p-8 text-center text-gray-500">Acesso restrito a administradores.</div>;
  }

  const assignedServerIds = new Set((team?.servers ?? []).map((s) => s.server_id));
  const availableServers = (allServers ?? []).filter((s) => !assignedServerIds.has(s.id));

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "teams", teamId] });

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServerId) return;
    setSaving(true);
    try {
      await api.post(TEAMS_ENDPOINTS.admin.assignServer(teamId), {
        server_id: parseInt(selectedServerId),
        permissions: newPerms,
      });
      toast.success("Servidor atribuído ao time");
      setSelectedServerId("");
      setNewPerms(DEFAULT_PERMS);
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (serverId: number) => {
    if (!confirm("Remover este servidor do time?")) return;
    try {
      await api.delete(TEAMS_ENDPOINTS.admin.removeServer(teamId, serverId));
      toast.success("Servidor removido do time");
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handlePermUpdate = async (serverId: number, perms: Record<string, boolean>) => {
    try {
      await api.put(TEAMS_ENDPOINTS.admin.updateServerPerms(teamId, serverId), { permissions: perms });
      toast.success("Permissões atualizadas");
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (teamLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Servidores — {team?.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Atribua servidores e defina permissões</p>
        </div>
      </div>

      {/* Assign form */}
      {availableServers.length > 0 && (
        <form onSubmit={handleAssign} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4 shadow-sm">
          <h2 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Servidor
          </h2>
          <select
            value={selectedServerId}
            onChange={(e) => setSelectedServerId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione um servidor...</option>
            {availableServers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.hostname} {s.description ? `— ${s.description}` : ""}
              </option>
            ))}
          </select>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Permissões:</p>
            <PermissionMatrix permissions={newPerms} onChange={setNewPerms} />
          </div>
          <button
            type="submit"
            disabled={saving || !selectedServerId}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Atribuindo..." : "Atribuir Servidor"}
          </button>
        </form>
      )}

      {/* Assigned servers */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
        <h2 className="font-medium text-gray-900 dark:text-gray-100">Servidores Atribuídos</h2>
        {(team?.servers ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum servidor atribuído ainda.</p>
        ) : (
          <div className="space-y-3">
            {team!.servers!.map((ts) => (
              <div key={ts.server_id} className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {ts.hostname ?? `Server #${ts.server_id}`}
                  </p>
                  <PermissionMatrix
                    permissions={ts.permissions}
                    onChange={(perms) => handlePermUpdate(ts.server_id, perms)}
                  />
                </div>
                <button
                  onClick={() => handleRemove(ts.server_id)}
                  className="text-red-500 hover:text-red-700 transition-colors p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
