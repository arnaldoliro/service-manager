"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useTeam } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { TEAMS_ENDPOINTS } from "@/lib/constants";
import { canViewAudit } from "@/lib/rbac";
import LoadingSpinner from "@/components/LoadingSpinner";

type ActivityItem = {
  id: number;
  user_id: number;
  username?: string;
  action: string;
  details?: string;
  timestamp: string;
};

export default function MyTeamSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: team } = useTeam();

  const { data: activity, isLoading } = useQuery<ActivityItem[]>({
    queryKey: ["my-team", "activity"],
    queryFn: () => api.get<ActivityItem[]>(TEAMS_ENDPOINTS.myTeam.activity).then((r) => r.data),
    enabled: canViewAudit(user),
    staleTime: 15_000,
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Atividade — {team?.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Histórico de ações do time</p>
        </div>
      </div>

      {!canViewAudit(user) ? (
        <div className="p-8 text-center text-gray-500">Apenas líderes e admins podem ver a atividade do time.</div>
      ) : isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : (activity ?? []).length === 0 ? (
        <div className="p-8 text-center text-gray-400">Nenhuma atividade registrada.</div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Usuário</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Ação</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Detalhes</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {activity!.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{log.username ?? `#${log.user_id}`}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{log.action}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{log.details ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
