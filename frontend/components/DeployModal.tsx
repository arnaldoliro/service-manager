"use client";

import { useState, useRef } from "react";
import { X, CheckCircle, XCircle, Clock, Upload } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface DeployStep {
  name: string;
  status: "pending" | "in_progress" | "success" | "failed";
  output: string;
  error: string;
}

interface Application {
  id: number;
  app_name: string;
}

interface Props {
  app: Application;
  onClose: () => void;
  onSuccess: () => void;
}

const StepIcon = ({ status }: { status: DeployStep["status"] }) => {
  if (status === "success") return <CheckCircle size={18} className="text-green-500 shrink-0" />;
  if (status === "failed") return <XCircle size={18} className="text-red-500 shrink-0" />;
  if (status === "in_progress") return <Clock size={18} className="text-yellow-500 shrink-0 animate-pulse" />;
  return <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />;
};

export default function DeployModal({ app, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<DeployStep[]>([]);
  const [deploySuccess, setDeploySuccess] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDeploy = async () => {
    if (!file) {
      toast.error("Selecione um arquivo .jar");
      return;
    }

    setLoading(true);
    setSteps([]);
    setDeploySuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post(`/api/applications/${app.id}/deploy`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSteps(response.data.steps ?? []);
      setDeploySuccess(true);
      toast.success("Deploy concluído com sucesso!");
      onSuccess();
    } catch (error: any) {
      const detail = error?.response?.data?.detail ?? error?.message ?? "Erro desconhecido";
      const errSteps = error?.response?.data?.steps;
      if (errSteps) setSteps(errSteps);
      setDeploySuccess(false);
      toast.error(`Deploy falhou: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Deploy — {app.app_name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 flex-1">
          {steps.length === 0 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arquivo JAR
                </label>
                <div
                  onClick={() => inputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  {file ? (
                    <p className="text-sm font-medium text-blue-700">{file.name}</p>
                  ) : (
                    <p className="text-sm text-gray-500">Clique para selecionar um arquivo <span className="font-medium">.jar</span></p>
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".jar"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <button
                onClick={handleDeploy}
                disabled={loading || !file}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? "Fazendo deploy..." : "Iniciar Deploy"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 mb-3">Progresso do deploy</h3>
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <StepIcon status={step.status} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{step.name}</p>
                    {step.output && (
                      <p className="text-xs text-gray-500 mt-0.5 break-all">{step.output}</p>
                    )}
                    {step.error && (
                      <p className="text-xs text-red-600 mt-0.5 break-all">{step.error}</p>
                    )}
                  </div>
                </div>
              ))}

              {deploySuccess === false && (
                <button
                  onClick={() => { setSteps([]); setDeploySuccess(null); setFile(null); }}
                  className="w-full mt-3 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
