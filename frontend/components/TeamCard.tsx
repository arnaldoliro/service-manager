"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import type { Team } from "@/types";

type Props = {
  team: Team;
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function TeamCard({ team, onEdit, onDelete }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{team.name}</p>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                team.status === "active"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {team.status === "active" ? "Ativo" : "Arquivado"}
            </span>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Link
            href={`/admin/teams/${team.id}`}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Ver
          </Link>
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
            >
              Editar
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-red-600 dark:text-red-400 hover:underline"
            >
              Excluir
            </button>
          )}
        </div>
      </div>

      {team.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{team.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {team.member_count ?? 0} membros
        </span>
        {team.leader && (
          <span>Líder: <strong className="text-gray-700 dark:text-gray-300">{team.leader.username}</strong></span>
        )}
      </div>
    </div>
  );
}
