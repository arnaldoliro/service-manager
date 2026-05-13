export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Tomcat Manager";

export const ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    me: "/api/auth/me",
  },
  servers: {
    list: "/api/servers/",
    create: "/api/servers/",
    get: (id: number) => `/api/servers/${id}`,
    update: (id: number) => `/api/servers/${id}`,
    delete: (id: number) => `/api/servers/${id}`,
    services: (id: number) => `/api/servers/${id}/services`,
    syncServices: (id: number) => `/api/servers/${id}/services/sync`,
    startService: (id: number, name: string) => `/api/servers/${id}/services/${name}/start`,
    stopService: (id: number, name: string) => `/api/servers/${id}/services/${name}/stop`,
    restartService: (id: number, name: string) => `/api/servers/${id}/services/${name}/restart`,
    logs: (id: number) => `/api/servers/${id}/logs`,
    audit: (id: number) => `/api/servers/${id}/audit`,
  },
  deploy: {
    upload: "/api/deploy/",
    history: (serverId: number) => `/api/deploy/history/${serverId}`,
  },
};

export const TEAMS_ENDPOINTS = {
  admin: {
    list: "/api/admin/teams",
    create: "/api/admin/teams",
    get: (id: number) => `/api/admin/teams/${id}`,
    update: (id: number) => `/api/admin/teams/${id}`,
    delete: (id: number) => `/api/admin/teams/${id}`,
    members: (id: number) => `/api/admin/teams/${id}/members`,
    addMember: (id: number) => `/api/admin/teams/${id}/members`,
    updateMember: (teamId: number, userId: number) => `/api/admin/teams/${teamId}/members/${userId}`,
    removeMember: (teamId: number, userId: number) => `/api/admin/teams/${teamId}/members/${userId}`,
    servers: (id: number) => `/api/admin/teams/${id}/servers`,
    assignServer: (id: number) => `/api/admin/teams/${id}/servers`,
    updateServerPerms: (teamId: number, serverId: number) => `/api/admin/teams/${teamId}/servers/${serverId}`,
    removeServer: (teamId: number, serverId: number) => `/api/admin/teams/${teamId}/servers/${serverId}`,
    applications: (id: number) => `/api/admin/teams/${id}/applications`,
    assignApp: (id: number) => `/api/admin/teams/${id}/applications`,
    updateAppPerms: (teamId: number, appId: number) => `/api/admin/teams/${teamId}/applications/${appId}`,
    removeApp: (teamId: number, appId: number) => `/api/admin/teams/${teamId}/applications/${appId}`,
  },
  myTeam: {
    info: "/api/my-team",
    members: "/api/my-team/members",
    updateMember: (userId: number) => `/api/my-team/members/${userId}`,
    removeMember: (userId: number) => `/api/my-team/members/${userId}`,
    servers: "/api/my-team/servers",
    applications: "/api/my-team/applications",
    activity: "/api/my-team/activity",
  },
};

export const TOKEN_KEY = "tmgr_token";
export const TOKEN_COOKIE = "tmgr_token";

export const STATUS_COLORS = {
  running: "green",
  stopped: "red",
  unknown: "yellow",
  success: "green",
  failed: "red",
  in_progress: "blue",
  online: "green",
  offline: "red",
} as const;
