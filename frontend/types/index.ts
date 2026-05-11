export type User = {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
};

export type Server = {
  id: number;
  hostname: string;
  username: string;
  port: number;
  winrm_port: number;
  description?: string | null;
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
