import { Play, Square, RotateCw, Upload } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Application {
  id: number;
  app_name: string;
  jar_name: string;
  current_version: string | null;
  status: "running" | "stopped" | "deploying" | "failed";
  last_deployed: string | null;
}

interface Props {
  app: Application;
  onDeploy: () => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  running: "text-green-600 bg-green-50",
  stopped: "text-red-600 bg-red-50",
  deploying: "text-yellow-600 bg-yellow-50",
  failed: "text-red-700 bg-red-100",
};

export default function ApplicationCard({ app, onDeploy, onStart, onStop, onRestart }: Props) {
  const statusStyle = STATUS_STYLES[app.status] ?? "text-gray-600 bg-gray-50";

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{app.app_name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{app.jar_name}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full uppercase ${statusStyle}`}>
          {app.status}
        </span>
      </div>

      <div className="text-sm text-gray-500 mb-4 space-y-1">
        <p>Versão: <span className="font-medium text-gray-700">{app.current_version ?? "—"}</span></p>
        <p>Último deploy: <span className="font-medium text-gray-700">
          {app.last_deployed ? formatDate(app.last_deployed) : "Nunca"}
        </span></p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onStart}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-medium transition-colors"
        >
          <Play size={14} /> Start
        </button>
        <button
          onClick={onStop}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium transition-colors"
        >
          <Square size={14} /> Stop
        </button>
        <button
          onClick={onRestart}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium transition-colors"
        >
          <RotateCw size={14} /> Restart
        </button>
        <button
          onClick={onDeploy}
          className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm font-medium transition-colors"
        >
          <Upload size={14} /> Deploy
        </button>
      </div>
    </div>
  );
}
