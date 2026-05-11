"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import LoadingSpinner from "./LoadingSpinner";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const authed = isAuthenticated();

  useEffect(() => {
    if (!authed) router.replace("/login");
  }, [authed, router]);

  if (!authed) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Verificando autenticação..." />
      </div>
    );
  }

  return <>{children}</>;
}
