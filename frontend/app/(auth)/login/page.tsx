"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      await login({ username, password });
      toast.success("Login realizado com sucesso!");
      router.push("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors";

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Entrar</h1>
        <p className="text-sm text-gray-400 mt-1">Acesse o painel de controle</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Usuário
          </label>
          <input
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="seu_usuario"
            autoComplete="username"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Senha
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              className={`${inputClass} pr-10`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? <LoadingSpinner size="sm" /> : <LogIn className="h-4 w-4" />}
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Não tem conta?{" "}
        <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
