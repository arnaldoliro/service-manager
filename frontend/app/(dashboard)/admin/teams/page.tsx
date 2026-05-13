"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useAdminTeams } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { api, getErrorMessage } from "@/lib/api";
import { TEAMS_ENDPOINTS } from "@/lib/constants";
import TeamCard from "@/components/TeamCard";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AdminTeamsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: teams, isLoading } = useAdminTeams();
  const [search, setSearch] = useState("");

  if (!user?.is_admin) {
    return (
      <div className="p-8 text-center text-gray-500">Acesso restrito a administradores.</div>
    );
  }

  const filtered = (teams ?? []).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Excluir time "${name}"? Esta ação é irreversível.`)) return;
    try {
      await api.delete(TEAMS_ENDPOINTS.admin.delete(id));
      toast.success("Time excluído");
      qc.invalidateQueries({ queryKey: ["admin", "teams"] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Times</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gerencie times e suas permissões
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/teams/create")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Time
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar times..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {search ? "Nenhum time encontrado." : "Nenhum time cadastrado ainda."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onEdit={() => router.push(`/admin/teams/${team.id}`)}
              onDelete={() => handleDelete(team.id, team.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
