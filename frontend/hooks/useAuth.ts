"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { saveToken, clearToken, isAuthenticated } from "@/lib/auth";
import { ENDPOINTS } from "@/lib/constants";
import type { User } from "@/types";
import type { LoginRequest, RegisterRequest, TokenResponse } from "@/types/api";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const fetchMe = useCallback(async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<User>(ENDPOINTS.auth.me);
      setUser(res.data);
      setAuthenticated(true);
    } catch {
      clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(
    async (payload: LoginRequest) => {
      const form = new URLSearchParams();
      form.append("username", payload.username);
      form.append("password", payload.password);

      const res = await api.post<TokenResponse>(ENDPOINTS.auth.login, form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      saveToken(res.data.access_token);
      const meRes = await api.get<User>(ENDPOINTS.auth.me);
      setUser(meRes.data);
      setAuthenticated(true);
      return res.data;
    },
    []
  );

  const register = useCallback(async (payload: RegisterRequest) => {
    const res = await api.post(ENDPOINTS.auth.register, payload);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setAuthenticated(false);
    router.push("/login");
    toast.success("Sessão encerrada");
  }, [router]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        await api.put("/api/auth/password", { current_password: currentPassword, new_password: newPassword });
        toast.success("Senha alterada com sucesso");
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      }
    },
    []
  );

  return { user, loading, authenticated, login, register, logout, changePassword, refetchUser: fetchMe };
}
