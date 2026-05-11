"use client";

import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { Server } from "@/types";

type Props = {
  servers: Server[];
  onEdit: (server: Server) => void;
  onDelete: (server: Server) => void;
};

export default function ServerTable({ servers, onEdit, onDelete }: Props) {
  if (servers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Nenhum servidor cadastrado ainda.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
            <th className="pb-3 font-medium pl-2">Hostname</th>
            <th className="pb-3 font-medium">Usuário</th>
            <th className="pb-3 font-medium">Porta</th>
            <th className="pb-3 font-medium">WinRM</th>
            <th className="pb-3 font-medium">Descrição</th>
            <th className="pb-3 font-medium text-right pr-2">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {servers.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="py-3 pl-2 font-medium text-gray-900 dark:text-gray-100">
                {s.hostname}
              </td>
              <td className="py-3 text-gray-600 dark:text-gray-400">{s.username}</td>
              <td className="py-3 text-gray-600 dark:text-gray-400">{s.port}</td>
              <td className="py-3 text-gray-600 dark:text-gray-400">{s.winrm_port}</td>
              <td className="py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                {s.description ?? "—"}
              </td>
              <td className="py-3 pr-2">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/servers/${s.id}`}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Ver detalhes"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => onEdit(s)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(s)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Deletar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
