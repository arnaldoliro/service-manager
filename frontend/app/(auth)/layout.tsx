import { Server } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-3 text-blue-400">
        <Server className="h-8 w-8" />
        <span className="text-2xl font-bold text-white">{APP_NAME}</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
