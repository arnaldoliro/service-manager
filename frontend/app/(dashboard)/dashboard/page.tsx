"use client";

import { useQuery } from "@tanstack/react-query";
import { Server, Upload, Activity, ClipboardList, Users } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ENDPOINTS, DASHBOARD_ENDPOINTS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Server as ServerType, AuditLog } from "@/types";
import ServerCard from "@/components/ServerCard";
import { useAuth } from "@/hooks/useAuth";
import { useTeam, useTeamMembers } from "@/hooks/useTeam";
import type { TeamMemberRole } from "@/types";

const ROLE_CONFIG: Record<TeamMemberRole, { label: string; className: string }> = {
  leader: {
    label: "Líder",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  manager: {
    label: "Gerente",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  operator: {
    label: "Operador",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  viewer: {
    label: "Visualizador",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  },
};

const CARD_CLASS =
  "flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm";
const CARD_LINK_CLASS =
  `${CARD_CLASS} hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all`;
const ICON_CLASS =
  "shrink-0 p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400";

function TeamSection() {
  const { user } = useAuth();
  const { data: team, isLoading, isError } = useTeam();
  const { data: members } = useTeamMembers();

  const title = (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Meu Time</h2>
    </div>
  );

  if (user?.is_admin) {
    const href = user.team_id ? `/admin/teams/${user.team_id}` : "/admin/teams";
    return (
      <div>
        {title}
        <Link href={href} className={CARD_LINK_CLASS}>
          <div className={ICON_CLASS}><Users className="h-4 w-4" /></div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">Cargo</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Administrador Global</p>
          </div>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        {title}
        <div className="h-[60px] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse" />
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div>
        {title}
        <div className={CARD_CLASS}>
          <div className={ICON_CLASS}><Users className="h-4 w-4" /></div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Sem time atribuído</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fale com um administrador</p>
          </div>
        </div>
      </div>
    );
  }

  const myRole = members?.find((m) => m.user_id === user?.id)?.role;
  const roleInfo = myRole ? ROLE_CONFIG[myRole] : null;

  return (
    <div>
      {title}
      <Link href="/my-team" className={`group ${CARD_LINK_CLASS}`}>
        <div className={ICON_CLASS}><Users className="h-4 w-4" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 transition-colors">
            {team.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {team.description || `${team.member_count ?? 0} ${team.member_count === 1 ? "membro" : "membros"}`}
          </p>
        </div>
        {roleInfo && (
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${roleInfo.className}`}>
            {roleInfo.label}
          </span>
        )}
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { data: servers, isLoading: loadingServers } = useQuery({
    queryKey: ["servers"],
    queryFn: () => api.get<ServerType[]>(ENDPOINTS.servers.list()).then((r) => r.data),
  });

  const { data: activeServicesData } = useQuery({
    queryKey: ["dashboard", "active-services-count"],
    queryFn: () =>
      api
        .get<{ active_services: number }>(DASHBOARD_ENDPOINTS.activeServicesCount)
        .then((r) => r.data)
        .catch(() => ({ active_services: 0 })),
  });

  const firstServer = servers?.[0];
  const { data: recentLogs } = useQuery({
    queryKey: ["audit", firstServer?.id],
    queryFn: () =>
      firstServer
        ? api.get<AuditLog[]>(ENDPOINTS.servers.audit(firstServer.id)).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!firstServer,
  });

  const stats = [
    {
      label: "Servidores",
      value: servers?.length ?? 0,
      icon: Server,
      color: "blue",
      href: "/servers",
    },
    {
      label: "Serviços Ativos",
      value: activeServicesData?.active_services ?? 0,
      icon: Activity,
      color: "green",
      href: "/servers",
    },
    {
      label: "Deploys",
      value: "—",
      icon: Upload,
      color: "purple",
      href: "/deploy",
    },
    {
      label: "Ações Recentes",
      value: recentLogs?.length ?? 0,
      icon: ClipboardList,
      color: "orange",
      href: "/audit",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Visão geral do sistema Tomcat Manager
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${colorMap[color]}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Team + Servers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <TeamSection />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Servidores</h2>
            <Link href="/servers" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Ver todos →
            </Link>
          </div>

          {loadingServers ? (
            <div className="h-[60px] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse" />
          ) : !servers?.length ? (
            <div className={CARD_CLASS}>
              <div className="shrink-0 p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Server className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Nenhum servidor cadastrado</p>
                <Link href="/servers" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block">
                  + Adicionar servidor
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {servers.slice(0, 4).map((s) => (
                <Link key={s.id} href={`/servers/${s.id}`} className="block rounded-xl">
                  <ServerCard server={s} showIp={false} onToggleIp={() => {}} compact />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Audit */}
      {recentLogs && recentLogs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Ações Recentes
            </h2>
            <Link href="/audit" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden shadow-sm">
            {recentLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {log.action}
                  </p>
                  {log.details && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-sm">
                      {log.details}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-4">
                  {formatDate(log.timestamp)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Ações Rápidas
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { href: "/servers", label: "+ Adicionar Servidor", color: "blue" },
            { href: "/deploy", label: "Fazer Deploy", color: "purple" },
            { href: "/logs", label: "Ver Logs", color: "green" },
          ].map(({ href, label, color }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-center py-4 rounded-xl border-2 border-dashed text-sm font-medium transition-colors
                ${color === "blue" ? "border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20" : ""}
                ${color === "purple" ? "border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20" : ""}
                ${color === "green" ? "border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20" : ""}
              `}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
