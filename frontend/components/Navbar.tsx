"use client";

import { useState } from "react";
import { Menu, LogOut, User, Server } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { APP_NAME } from "@/lib/constants";

type Props = {
  onMenuClick?: () => void;
};

export default function Navbar({ onMenuClick }: Props) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 shadow-sm">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
        <Server className="h-5 w-5" />
        <span className="hidden sm:block">{APP_NAME}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold">
              {user?.username?.[0]?.toUpperCase() ?? "U"}
            </span>
            <span className="hidden sm:block font-medium">{user?.username}</span>
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Meu Perfil
                </a>
                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
