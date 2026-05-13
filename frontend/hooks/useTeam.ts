"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TEAMS_ENDPOINTS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import type { TeamDetail, TeamMemberItem, TeamServerItem, TeamApplicationItem } from "@/types";

export function useTeam() {
  const { user } = useAuth();
  return useQuery<TeamDetail>({
    queryKey: ["my-team"],
    queryFn: () => api.get<TeamDetail>(TEAMS_ENDPOINTS.myTeam.info).then((r) => r.data),
    enabled: !!user && !user.is_admin,
    staleTime: 30_000,
  });
}

export function useTeamMembers() {
  const { user } = useAuth();
  return useQuery<TeamMemberItem[]>({
    queryKey: ["my-team", "members"],
    queryFn: () => api.get<TeamMemberItem[]>(TEAMS_ENDPOINTS.myTeam.members).then((r) => r.data),
    enabled: !!user && !user.is_admin,
    staleTime: 30_000,
  });
}

export function useTeamServers() {
  const { user } = useAuth();
  return useQuery<TeamServerItem[]>({
    queryKey: ["my-team", "servers"],
    queryFn: () => api.get<TeamServerItem[]>(TEAMS_ENDPOINTS.myTeam.servers).then((r) => r.data),
    enabled: !!user && !user.is_admin,
    staleTime: 30_000,
  });
}

export function useTeamApplications() {
  const { user } = useAuth();
  return useQuery<TeamApplicationItem[]>({
    queryKey: ["my-team", "applications"],
    queryFn: () => api.get<TeamApplicationItem[]>(TEAMS_ENDPOINTS.myTeam.applications).then((r) => r.data),
    enabled: !!user && !user.is_admin,
    staleTime: 30_000,
  });
}

export function useAdminTeams() {
  const { user } = useAuth();
  return useQuery<TeamDetail[]>({
    queryKey: ["admin", "teams"],
    queryFn: () => api.get<TeamDetail[]>(TEAMS_ENDPOINTS.admin.list).then((r) => r.data),
    enabled: !!user?.is_admin,
    staleTime: 30_000,
  });
}

export function useAdminTeam(teamId: number) {
  const { user } = useAuth();
  return useQuery<TeamDetail>({
    queryKey: ["admin", "teams", teamId],
    queryFn: () => api.get<TeamDetail>(TEAMS_ENDPOINTS.admin.get(teamId)).then((r) => r.data),
    enabled: !!user?.is_admin && !!teamId,
    staleTime: 30_000,
  });
}
