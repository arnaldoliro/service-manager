import Link from "next/link";
import { Server, ExternalLink } from "lucide-react";
import type { Server as ServerType } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  server: ServerType;
  servicesCount?: number;
};

export default function ServerCard({ server, servicesCount }: Props) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {server.hostname}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Porta {server.port} · WinRM {server.winrm_port}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Online
        </span>
      </div>

      {server.description && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {server.description}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        {servicesCount !== undefined && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {servicesCount} serviço{servicesCount !== 1 ? "s" : ""}
          </span>
        )}
        <Link
          href={`/servers/${server.id}`}
          className="ml-auto flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Ver Detalhes
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
