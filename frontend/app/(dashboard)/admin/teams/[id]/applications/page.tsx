"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useAdminTeam } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { api, getErrorMessage } from "@/lib/api";
import { TEAMS_ENDPOINTS } from "@/lib/constants";
import PermissionMatrix from "@/components/PermissionMatrix";
import LoadingSpinner from "@/components/LoadingSpinner";

type Params = { id: string };
type AppItem = { id: number; app_name: string; status: string };
const DEFAULT_PERMS = { view: true, deploy: false, restart: false };

export default function TeamApplicationsPage({ params }: { params: Params }) {
  const { id } = params;
  const teamId = parseInt(id);
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: team, isLoading: teamLoading } = useAdminTeam(teamId);
  const { data: allApps } = useQuery<AppItem[]>({
    queryKey: ["applications"],
    queryFn: () => api.get<AppItem[]>("/api/applications/").then((r) => r.data),
    enabled: !!user?.is_admin,
  });

  const [selectedAppId, setSelectedAppId] = useState("");
  const [newPerms, setNewPerms] = useState<Record<string, boolean>>(DEFAULT_PERMS);
  const [saving, setSaving] = useState(false);

  if (!user?.is_admin) {
    return <div className="p-8 text-center text-gray-500">Acesso restrito a administradores.</div>;
  }

  const assignedAppIds = new Set((team?.applications ?? []).map((a) => a.application_id));
  const availableApps = (allApps ?? []).filter((a) => !assignedAppIds.has(a.id));

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "teams", teamId] });

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) return;
    setSaving(true);
    try {
      await api.post(TEAMS_ENDPOINTS.admin.assignApp(teamId), {
        application_id: parseInt(selectedAppId),
        permissions: newPerms,
      });
      toast.success("Aplicação atribuída ao time");
      setSelectedAppId("");
      setNewPerms(DEFAULT_PERMS);
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (appId: number) => {
    if (!confirm("Remover esta aplicação do time?")) return;
    try {
      await api.delete(TEAMS_ENDPOINTS.admin.removeApp(teamId, appId));
      toast.success("Aplicação removida do time");
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handlePermUpdate = async (appId: number, perms: Record<string, boolean>) => {
    try {
      await api.put(TEAMS_ENDPOINTS.admin.updateAppPerms(teamId, appId), { permissions: perms });
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Aplicações — {team?.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Atribua aplicações e defina permissões</p>
        </div>
      </div>

      {availableApps.length > 0 && (
        <form onSubmit={handleAssign} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4 shadow-sm">
          <h2 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Aplicação
          </h2>
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione uma aplicação...</option>
            {availableApps.map((a) => (
              <option key={a.id} value={a.id}>{a.app_name}</option>
            ))}
          </select>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Permissões:</p>
            <PermissionMatrix permissions={newPerms} onChange={setNewPerms} />
          </div>
          <button
            type="submit"
            disabled={saving || !selectedAppId}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Atribuindo..." : "Atribuir Aplicação"}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
        <h2 className="font-medium text-gray-900 dark:text-gray-100">Aplicações Atribuídas</h2>
        {(team?.applications ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma aplicação atribuída ainda.</p>
        ) : (
          <div className="space-y-3">
            {team!.applications!.map((ta) => (
              <div key={ta.application_id} className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {ta.app_name ?? `App #${ta.application_id}`}
                  </p>
                  <PermissionMatrix
                    permissions={ta.permissions}
                    onChange={(perms) => handlePermUpdate(ta.application_id, perms)}
                  />
                </div>
                <button onClick={() => handleRemove(ta.application_id)} className="text-red-500 hover:text-red-700 transition-colors p-1">
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
