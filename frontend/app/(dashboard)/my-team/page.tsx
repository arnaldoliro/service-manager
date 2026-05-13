"use client";

import Link from "next/link";
import { Users, Server, AppWindow, Activity } from "lucide-react";
import { useTeam, useTeamMembers, useTeamServers, useTeamApplications } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { getRoleLabel, getRoleBadgeClass, isTeamLeader } from "@/lib/rbac";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function MyTeamPage() {
  const { user } = useAuth();
  const { data: team, isLoading } = useTeam();
  const { data: members } = useTeamMembers();
  const { data: servers } = useTeamServers();
  const { data: apps } = useTeamApplications();

  if (user?.is_admin) {
    return (
      <div className="p-8 text-center text-gray-500">
        Você é um administrador.{" "}
        <Link href="/admin/teams" className="text-blue-600 hover:underline">
          Gerenciar todos os times →
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!team) {
    return (
      <div className="p-8 text-center text-gray-500">
        Você ainda não faz parte de nenhum time. Peça ao administrador para te adicionar.
      </div>
    );
  }

  const myRole = user?.team_role;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{team.name}</h1>
          {myRole && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(myRole)}`}>
              {getRoleLabel(myRole)}
            </span>
          )}
        </div>
        {team.description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{team.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Membros", value: members?.length ?? 0, icon: Users, href: "/my-team/members" },
          { label: "Servidores", value: servers?.length ?? 0, icon: Server },
          { label: "Aplicações", value: apps?.length ?? 0, icon: AppWindow },
          { label: "Atividade", value: "Ver", icon: Activity, href: "/my-team/settings" },
        ].map(({ label, value, icon: Icon, href }) => (
          <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </div>
            {href ? (
              <Link href={href} className="text-xl font-bold text-blue-600 dark:text-blue-400 hover:underline">
                {value}
              </Link>
            ) : (
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Servers */}
      {(servers ?? []).length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Meus Servidores</h2>
          <div className="space-y-2">
            {servers!.map((s) => (
              <div key={s.server_id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.hostname}</p>
                  {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                </div>
                <div className="flex gap-1.5">
                  {Object.entries(s.permissions ?? {}).map(([k, v]) =>
                    v ? (
                      <span key={k} className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
                        {k}
                      </span>
                    ) : null
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Applications */}
      {(apps ?? []).length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Minhas Aplicações</h2>
          <div className="space-y-2">
            {apps!.map((a) => (
              <div key={a.application_id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.app_name}</p>
                <div className="flex gap-1.5">
                  {Object.entries(a.permissions ?? {}).map(([k, v]) =>
                    v ? (
                      <span key={k} className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                        {k}
                      </span>
                    ) : null
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions for leader */}
      {isTeamLeader(user) && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-5">
          <h2 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Ações do Líder</h2>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/my-team/members"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Gerenciar Membros
            </Link>
            <Link
              href="/my-team/settings"
              className="rounded-lg border border-blue-300 dark:border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              Ver Atividade
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
