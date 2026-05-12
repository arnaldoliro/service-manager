"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import ApplicationCard from "@/components/ApplicationCard";
import DeployModal from "@/components/DeployModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import toast from "react-hot-toast";

interface Application {
  id: number;
  app_name: string;
  jar_name: string;
  context_name: string;
  tomcat_home: string;
  tomcat_service_name: string;
  current_version: string | null;
  status: "running" | "stopped" | "deploying" | "failed";
  server_id: number;
  last_deployed: string | null;
}

export default function ApplicationsPage() {
  const { get, post } = useApi();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const data = await get("/api/applications");
      setApplications(data);
    } catch {
      toast.error("Falha ao carregar aplicações");
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = (app: Application) => {
    setSelectedApp(app);
    setShowDeployModal(true);
  };

  const handleAction = async (appId: number, action: string) => {
    try {
      const response = await post(`/api/applications/${appId}/action/${action}`, {});
      toast.success(response.message);
      fetchApplications();
    } catch (error: any) {
      toast.error(error?.message ?? "Erro ao executar ação");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Aplicações</h1>
        <span className="text-sm text-gray-500">{applications.length} aplicação(ões)</span>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhuma aplicação cadastrada. Crie uma aplicação via servidor.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onDeploy={() => handleDeploy(app)}
              onStart={() => handleAction(app.id, "start")}
              onStop={() => handleAction(app.id, "stop")}
              onRestart={() => handleAction(app.id, "restart")}
            />
          ))}
        </div>
      )}

      {showDeployModal && selectedApp && (
        <DeployModal
          app={selectedApp}
          onClose={() => setShowDeployModal(false)}
          onSuccess={() => {
            setShowDeployModal(false);
            fetchApplications();
          }}
        />
      )}
    </div>
  );
}
