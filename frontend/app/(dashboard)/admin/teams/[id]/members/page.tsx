"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useAdminTeam } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { api, getErrorMessage } from "@/lib/api";
import { TEAMS_ENDPOINTS } from "@/lib/constants";
import TeamMemberList from "@/components/TeamMemberList";
import RoleSelector from "@/components/RoleSelector";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { TeamMemberRole } from "@/types";

type Params = { id: string };

export default function TeamMembersPage({ params }: { params: Params }) {
  const { id } = params;
  const teamId = parseInt(id);
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: team, isLoading } = useAdminTeam(teamId);

  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<TeamMemberRole>("viewer");
  const [addLoading, setAddLoading] = useState(false);

  if (!user?.is_admin) {
    return <div className="p-8 text-center text-gray-500">Acesso restrito a administradores.</div>;
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "teams", teamId] });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserId.trim()) return;
    setAddLoading(true);
    try {
      await api.post(TEAMS_ENDPOINTS.admin.addMember(teamId), {
        user_id: parseInt(addUserId),
        role: addRole,
      });
      toast.success("Membro adicionado");
      setAddUserId("");
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAddLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, role: TeamMemberRole) => {
    try {
      await api.put(TEAMS_ENDPOINTS.admin.updateMember(teamId, userId), { role });
      toast.success("Papel atualizado");
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRemove = async (userId: number) => {
    if (!confirm("Remover este membro do time?")) return;
    try {
      await api.delete(TEAMS_ENDPOINTS.admin.removeMember(teamId, userId));
      toast.success("Membro removido");
      invalidate();
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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Membros — {team?.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie quem faz parte deste time</p>
        </div>
      </div>

      {/* Add member form */}
      <form
        onSubmit={handleAdd}
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4 shadow-sm"
      >
        <h2 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Adicionar Membro
        </h2>
        <div className="flex gap-3 flex-wrap">
          <input
            type="number"
            value={addUserId}
            onChange={(e) => setAddUserId(e.target.value)}
            placeholder="ID do usuário"
            className="flex-1 min-w-[120px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <RoleSelector value={addRole} onChange={setAddRole} />
          <button
            type="submit"
            disabled={addLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {addLoading ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </form>

      {/* Member list */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <TeamMemberList
          members={team?.members ?? []}
          canEdit
          canRemove
          onRoleChange={handleRoleChange}
          onRemove={handleRemove}
        />
      </div>
    </div>
  );
}
