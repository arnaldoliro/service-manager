"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Server, AppWindow, Edit, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useAdminTeam } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { api, getErrorMessage } from "@/lib/api";
import { TEAMS_ENDPOINTS } from "@/lib/constants";
import { getRoleLabel, getRoleBadgeClass } from "@/lib/rbac";
import LoadingSpinner from "@/components/LoadingSpinner";

type Params = { id: string };

export default function TeamDetailPage({ params }: { params: Params }) {
  const { id } = params;
  const teamId = parseInt(id);
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: team, isLoading } = useAdminTeam(teamId);
  const [activeTab, setActiveTab] = useState<"members" | "servers" | "applications">("members");

  if (!user?.is_admin) {
    return <div className="p-8 text-center text-gray-500">Acesso restrito a administradores.</div>;
  }

  const handleDelete = async () => {
    if (!team) return;
    if (!confirm(`Excluir time "${team.name}"? Esta ação é irreversível.`)) return;
    try {
      await api.delete(TEAMS_ENDPOINTS.admin.delete(teamId));
      toast.success("Time excluído");
      qc.invalidateQueries({ queryKey: ["admin", "teams"] });
      router.push("/admin/teams");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!team) {
    return <div className="p-8 text-center text-gray-500">Time não encontrado.</div>;
  }

  const tabs = [
    { key: "members", label: "Membros", icon: Users, count: team.members?.length ?? 0 },
    { key: "servers", label: "Servidores", icon: Server, count: team.servers?.length ?? 0 },
    { key: "applications", label: "Aplicações", icon: AppWindow, count: team.applications?.length ?? 0 },
  ] as const;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{team.name}</h1>
          {team.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{team.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/admin/teams/${teamId}/members`)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Gerenciar
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-600 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{team.members?.length ?? 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Membros</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{team.servers?.length ?? 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Servidores</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{team.applications?.length ?? 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Aplicações</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === key
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span className="ml-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "members" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => router.push(`/admin/teams/${teamId}/members`)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Gerenciar membros →
                </button>
              </div>
              {(team.members ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum membro ainda.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-2 font-medium">Usuário</th>
                      <th className="pb-2 font-medium">Papel</th>
                      <th className="pb-2 font-medium">Entrou em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {team.members!.map((m) => (
                      <tr key={m.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="py-2.5 font-medium text-gray-900 dark:text-gray-100">
                          {m.username ?? `User #${m.user_id}`}
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(m.role)}`}>
                            {getRoleLabel(m.role)}
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-500 dark:text-gray-400">
                          {m.joined_at ? new Date(m.joined_at).toLocaleDateString("pt-BR") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "servers" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => router.push(`/admin/teams/${teamId}/servers`)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Gerenciar servidores →
                </button>
              </div>
              {(team.servers ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum servidor atribuído.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-2 font-medium">Servidor</th>
                      <th className="pb-2 font-medium">Permissões</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {team.servers!.map((s) => (
                      <tr key={s.server_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="py-2.5 font-medium text-gray-900 dark:text-gray-100">
                          {s.hostname ?? `Server #${s.server_id}`}
                        </td>
                        <td className="py-2.5">
                          <div className="flex gap-1.5 flex-wrap">
                            {Object.entries(s.permissions ?? {}).map(([k, v]) =>
                              v ? (
                                <span key={k} className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
                                  {k}
                                </span>
                              ) : null
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "applications" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => router.push(`/admin/teams/${teamId}/applications`)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Gerenciar aplicações →
                </button>
              </div>
              {(team.applications ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma aplicação atribuída.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-2 font-medium">Aplicação</th>
                      <th className="pb-2 font-medium">Permissões</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {team.applications!.map((a) => (
                      <tr key={a.application_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="py-2.5 font-medium text-gray-900 dark:text-gray-100">
                          {a.app_name ?? `App #${a.application_id}`}
                        </td>
                        <td className="py-2.5">
                          <div className="flex gap-1.5 flex-wrap">
                            {Object.entries(a.permissions ?? {}).map(([k, v]) =>
                              v ? (
                                <span key={k} className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                                  {k}
                                </span>
                              ) : null
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
