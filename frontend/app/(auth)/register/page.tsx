"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("As senhas não coincidem");
      return;
    }
    if (form.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      await register({ username: form.username, email: form.email, password: form.password });
      toast.success("Conta criada! Faça login para continuar.");
      router.push("/login");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors";

  const strength = (() => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6) return { label: "Fraca", color: "bg-red-500", width: "w-1/4" };
    if (p.length < 10) return { label: "Média", color: "bg-yellow-500", width: "w-2/4" };
    return { label: "Forte", color: "bg-green-500", width: "w-full" };
  })();

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Criar Conta</h1>
        <p className="text-sm text-gray-400 mt-1">Cadastre-se para acessar o painel</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Usuário</label>
          <input className={inputClass} value={form.username} onChange={set("username")} placeholder="seu_usuario" required autoFocus />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">E-mail</label>
          <input type="email" className={inputClass} value={form.email} onChange={set("email")} placeholder="voce@email.com" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              className={`${inputClass} pr-10`}
              value={form.password}
              onChange={set("password")}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {strength && (
            <div className="mt-1.5 space-y-1">
              <div className="h-1 rounded-full bg-gray-700 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
              </div>
              <p className="text-xs text-gray-500">Força: {strength.label}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirmar Senha</label>
          <input
            type="password"
            className={inputClass}
            value={form.confirm}
            onChange={set("confirm")}
            placeholder="••••••••"
            required
          />
          {form.confirm && form.password !== form.confirm && (
            <p className="text-xs text-red-400 mt-1">Senhas não coincidem</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? <LoadingSpinner size="sm" /> : <UserPlus className="h-4 w-4" />}
          {loading ? "Criando conta..." : "Criar Conta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Já tem conta?{" "}
        <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Entrar
        </Link>
      </p>
    </div>
  );
}
