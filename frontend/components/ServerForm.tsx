"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Server } from "@/types";
import type { ServerCreateRequest } from "@/types/api";
import LoadingSpinner from "./LoadingSpinner";

type Props = {
  server?: Server;
  onSuccess: (server: Server) => void;
  onCancel: () => void;
};

const defaultForm: ServerCreateRequest = {
  hostname: "",
  username: "",
  password: "",
  port: 8080,
  winrm_port: 5985,
  description: "",
};

export default function ServerForm({ server, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<ServerCreateRequest>(
    server
      ? {
          hostname: server.hostname,
          username: server.username,
          password: "",
          port: server.port,
          winrm_port: server.winrm_port,
          description: server.description ?? "",
        }
      : defaultForm
  );
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const set = (key: keyof ServerCreateRequest, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = server
        ? await api.put<Server>(ENDPOINTS.servers.update(server.id), form)
        : await api.post<Server>(ENDPOINTS.servers.create, form);
      toast.success(server ? "Servidor atualizado" : "Servidor adicionado");
      onSuccess(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      await api.post(`/api/servers/test`, {
        hostname: form.hostname,
        username: form.username,
        password: form.password,
        winrm_port: form.winrm_port,
      });
      toast.success("Conexão WinRM bem-sucedida!");
    } catch (err) {
      toast.error(`Falha na conexão: ${getErrorMessage(err)}`);
    } finally {
      setTesting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Hostname / IP *
        </label>
        <input
          className={inputClass}
          value={form.hostname}
          onChange={(e) => set("hostname", e.target.value)}
          placeholder="192.168.1.100 ou servidor.dominio.com"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Usuário *
          </label>
          <input
            className={inputClass}
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            placeholder="administrador"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Senha {server ? "(deixe vazio para manter)" : "*"}
          </label>
          <input
            type="password"
            className={inputClass}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="••••••••"
            required={!server}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Porta Tomcat
          </label>
          <input
            type="number"
            className={inputClass}
            value={form.port}
            onChange={(e) => set("port", Number(e.target.value))}
            min={1}
            max={65535}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Porta WinRM
          </label>
          <input
            type="number"
            className={inputClass}
            value={form.winrm_port}
            onChange={(e) => set("winrm_port", Number(e.target.value))}
            min={1}
            max={65535}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descrição
        </label>
        <textarea
          className={inputClass}
          rows={2}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Descrição opcional do servidor"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={testConnection}
          disabled={testing || !form.hostname || !form.username}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? <LoadingSpinner size="sm" /> : null}
          Testar Conexão
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <LoadingSpinner size="sm" />}
            {server ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </form>
  );
}
