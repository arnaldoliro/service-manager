"use client";

import { useState, useRef, DragEvent } from "react";
import { Upload, X, FileCheck } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { ENDPOINTS } from "@/lib/constants";
import type { Server, DeployResult } from "@/types";
import LoadingSpinner from "./LoadingSpinner";
import { cn } from "@/lib/utils";

type Props = {
  servers: Server[];
  onSuccess?: (result: DeployResult) => void;
};

export default function DeployForm({ servers, onSuccess }: Props) {
  const [serverId, setServerId] = useState("");
  const [appName, setAppName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".war")) {
      toast.error("Apenas arquivos .war são aceitos");
      return;
    }
    setFile(f);
    if (!appName) {
      setAppName(f.name.replace(".war", ""));
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !serverId || !appName) return;

    const form = new FormData();
    form.append("server_id", serverId);
    form.append("app_name", appName);
    form.append("war_file", file);

    setLoading(true);
    try {
      const res = await api.post<DeployResult>(ENDPOINTS.deploy.upload, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Deploy de "${appName}" concluído com status: ${res.data.status}`);
      onSuccess?.(res.data);
      setFile(null);
      setAppName("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Servidor *
        </label>
        <select
          className={inputClass}
          value={serverId}
          onChange={(e) => setServerId(e.target.value)}
          required
        >
          <option value="">Selecione um servidor</option>
          {servers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.hostname}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nome da Aplicação *
        </label>
        <input
          className={inputClass}
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          placeholder="minha-app"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Arquivo WAR *
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors",
            dragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".war"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {file ? (
            <>
              <FileCheck className="h-10 w-10 text-green-500" />
              <div className="text-center">
                <p className="font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="flex items-center gap-1 text-xs text-red-600 hover:underline"
              >
                <X className="h-3 w-3" /> Remover
              </button>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Arraste um arquivo .war aqui
                </p>
                <p className="text-xs text-gray-500 mt-1">ou clique para selecionar</p>
              </div>
            </>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !file || !serverId || !appName}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />}
        {loading ? "Realizando deploy..." : "Fazer Deploy"}
      </button>
    </form>
  );
}
