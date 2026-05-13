"use client";

import { getRoleLabel, getRoleBadgeClass } from "@/lib/rbac";
import type { TeamMemberItem, TeamMemberRole } from "@/types";
import RoleSelector from "./RoleSelector";

type Props = {
  members: TeamMemberItem[];
  canEdit?: boolean;
  canRemove?: boolean;
  onRoleChange?: (userId: number, role: TeamMemberRole) => void;
  onRemove?: (userId: number) => void;
};

export default function TeamMemberList({
  members,
  canEdit,
  canRemove,
  onRoleChange,
  onRemove,
}: Props) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
        Nenhum membro no time.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
            <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Usuário</th>
            <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Papel</th>
            <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Entrou em</th>
            {(canEdit || canRemove) && (
              <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">Ações</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {members.map((m) => (
            <tr key={m.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold">
                    {(m.username?.[0] ?? "?").toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{m.username}</p>
                    {m.email && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-3">
                {canEdit && onRoleChange ? (
                  <RoleSelector
                    value={m.role}
                    onChange={(role) => onRoleChange(m.user_id, role)}
                    excludeLeader
                  />
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(m.role)}`}>
                    {getRoleLabel(m.role)}
                  </span>
                )}
              </td>
              <td className="py-3 text-gray-500 dark:text-gray-400">
                {m.joined_at ? new Date(m.joined_at).toLocaleDateString("pt-BR") : "-"}
              </td>
              {(canEdit || canRemove) && (
                <td className="py-3 text-right">
                  {canRemove && onRemove && (
                    <button
                      onClick={() => onRemove(m.user_id)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
