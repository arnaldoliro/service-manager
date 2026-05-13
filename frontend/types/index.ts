export type User = {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  role?: string;
  team_id?: number | null;
  team_role?: string | null;
  team_name?: string | null;
};

export type TeamMemberRole = "leader" | "manager" | "operator" | "viewer";

export type Team = {
  id: number;
  name: string;
  description?: string | null;
  status: "active" | "archived";
  leader_id?: number | null;
  leader?: { id: number; username: string } | null;
  member_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type TeamDetail = Team & {
  members?: TeamMemberItem[];
  servers?: TeamServerItem[];
  applications?: TeamApplicationItem[];
};

export type TeamMemberItem = {
  id?: number;
  team_id?: number;
  user_id: number;
  username?: string | null;
  email?: string | null;
  role: TeamMemberRole;
  joined_at?: string;
};

export type TeamServerItem = {
  server_id: number;
  hostname?: string | null;
  description?: string | null;
  permissions: Record<string, boolean>;
  assigned_at?: string;
};

export type TeamApplicationItem = {
  application_id: number;
  app_name?: string | null;
  status?: string | null;
  permissions: Record<string, boolean>;
  assigned_at?: string;
};

export type Server = {
  id: number;
  hostname: string;
  name?: string | null;
  username: string;
  winrm_port: number;
  description?: string | null;
  visible: boolean;
  status: string;
  memory_available?: number | null;
  memory_total?: number | null;
};

export type Service = {
  id: number;
  server_id: number;
  service_name: string;
  status: string;
};

export type Deployment = {
  id: number;
  server_id: number;
  app_name: string;
  war_file: string;
  status: "in_progress" | "success" | "failed";
  output?: string | null;
  timestamp: string;
};

export type AuditLog = {
  id: number;
  action: string;
  details?: string | null;
  timestamp: string;
  user_id: number;
};

export type ServerLogs = {
  server_id: number;
  lines: number;
  content: string;
};

export type SyncResult = {
  synced: number;
};

export type ServiceActionResult = {
  status: string;
  output: string;
};

export type DeployResult = {
  deployment_id: number;
  status: string;
  output: string;
};
