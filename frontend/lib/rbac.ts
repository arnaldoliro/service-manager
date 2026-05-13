import type { User, TeamMemberRole } from "@/types";

export function isAdmin(user: User | null): boolean {
  return !!user?.is_admin;
}

export function isTeamLeader(user: User | null): boolean {
  return user?.team_role === "leader";
}

export function isTeamManager(user: User | null): boolean {
  return user?.team_role === "manager";
}

export function isTeamOperator(user: User | null): boolean {
  return user?.team_role === "operator";
}

export function canDeploy(user: User | null): boolean {
  if (!user) return false;
  if (user.is_admin) return true;
  return user.team_role === "leader" || user.team_role === "manager";
}

export function canManageServices(user: User | null): boolean {
  if (!user) return false;
  if (user.is_admin) return true;
  return ["leader", "manager", "operator"].includes(user.team_role ?? "");
}

export function canViewAudit(user: User | null): boolean {
  if (!user) return false;
  return user.is_admin || user.team_role === "leader";
}

export function canManageTeam(user: User | null): boolean {
  if (!user) return false;
  return user.is_admin || user.team_role === "leader";
}

export function getRoleLabel(role: TeamMemberRole | string | null | undefined): string {
  const labels: Record<string, string> = {
    leader: "Líder",
    manager: "Gerente",
    operator: "Operador",
    viewer: "Visualizador",
  };
  return labels[role ?? ""] ?? (role ?? "-");
}

export function getRoleBadgeClass(role: TeamMemberRole | string | null | undefined): string {
  const classes: Record<string, string> = {
    leader: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    manager: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    operator: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    viewer: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  };
  return classes[role ?? ""] ?? classes.viewer;
}
