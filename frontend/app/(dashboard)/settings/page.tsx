"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, getErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import { User, Lock, Save } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import Alert from "@/components/Alert";

export default function SettingsPage() {
  const { user, refetchUser } = useAuth();
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  const inputClass =
    "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (pwForm.next !== pwForm.confirm) {
      setPwError("As senhas não coincidem");
      return;
    }
    if (pwForm.next.length < 6) {
      setPwError("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    setPwLoading(true);
    try {
      await api.put("/api/auth/password", {
        current_password: pwForm.current,
        new_password: pwForm.next,
      });
      toast.success("Senha alterada com sucesso");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwError(getErrorMessage(err));
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gerencie seu perfil e preferências
        </p>
      </div>

      {/* Profile */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Perfil</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold">
              {user?.username?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                {user?.username}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
              {user?.is_admin && (
                <span className="mt-1 inline-block text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                  Administrador
                </span>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">ID</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100 font-medium">#{user?.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Função</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100 font-medium">
                {user?.is_admin ? "Administrador" : "Usuário"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
            <Lock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Alterar Senha</h2>
        </div>

        {pwError && (
          <Alert variant="error" message={pwError} dismissible className="mb-4" />
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Senha Atual
            </label>
            <input
              type="password"
              className={inputClass}
              value={pwForm.current}
              onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nova Senha
            </label>
            <input
              type="password"
              className={inputClass}
              value={pwForm.next}
              onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              className={inputClass}
              value={pwForm.confirm}
              onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
              placeholder="••••••••"
              required
            />
            {pwForm.confirm && pwForm.next !== pwForm.confirm && (
              <p className="text-xs text-red-500 mt-1">Senhas não coincidem</p>
            )}
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {pwLoading ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
            Salvar Senha
          </button>
        </form>
      </div>
    </div>
  );
}
