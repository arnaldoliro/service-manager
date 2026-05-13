export type ApiError = {
  detail: string;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  username: string;
  is_admin: boolean;
};

export type ServerCreateRequest = {
  hostname: string;
  username: string;
  password: string;
  winrm_port: number;
  description?: string;
};

export type ServerUpdateRequest = Partial<ServerCreateRequest>;

export type DeployRequest = {
  server_id: number;
  app_name: string;
  war_file: File;
};
