"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Upload,
  FileText,
  ClipboardList,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/servers", label: "Servidores", icon: Server },
  { href: "/deploy", label: "Deploy", icon: Upload },
  { href: "/logs", label: "Logs", icon: FileText },
  { href: "/audit", label: "Audit Log", icon: ClipboardList },
  { href: "/settings", label: "Configurações", icon: Settings },
];

type Props = {
  open?: boolean;
  onClose?: () => void;
};

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();

  const content = (
    <aside className="flex flex-col h-full w-64 bg-gray-900 text-gray-100">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2 font-bold text-blue-400">
          <Server className="h-5 w-5" />
          <span>{APP_NAME}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500">
        v1.0.0
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">{content}</div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={onClose}
          />
          <div className="relative z-10">{content}</div>
        </div>
      )}
    </>
  );
}
