"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useTeam, useTeamMembers } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { api, getErrorMessage } from "@/lib/api";
import { TEAMS_ENDPOINTS } from "@/lib/constants";
import { canManageTeam } from "@/lib/rbac";
import TeamMemberList from "@/components/TeamMemberList";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { TeamMemberRole } from "@/types";

export default function MyTeamMembersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: team } = useTeam();
  const { data: members, isLoading } = useTeamMembers();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my-team", "members"] });
    qc.invalidateQueries({ queryKey: ["my-team"] });
  };

  if (!canManageTeam(user)) {
    return (
      <div className="p-8 text-center text-gray-500">
        Apenas líderes do time podem gerenciar membros.
      </div>
    );
  }

  const handleRoleChange = async (userId: number, role: TeamMemberRole) => {
    try {
      await api.put(TEAMS_ENDPOINTS.myTeam.updateMember(userId), { role });
      toast.success("Papel atualizado");
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRemove = async (userId: number) => {
    if (!confirm("Remover este membro do time?")) return;
    try {
      await api.delete(TEAMS_ENDPOINTS.myTeam.removeMember(userId));
      toast.success("Membro removido");
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

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
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gerencie os papéis dos membros do time
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (
          <TeamMemberList
            members={members ?? []}
            canEdit
            canRemove
            onRoleChange={handleRoleChange}
            onRemove={handleRemove}
          />
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Para adicionar novos membros, entre em contato com um administrador.
      </p>
    </div>
  );
}
