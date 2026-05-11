"use client";

import { useRef, useEffect, useState } from "react";
import { Download, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import LoadingSpinner from "./LoadingSpinner";

type Props = {
  content: string;
  loading?: boolean;
  onRefresh?: () => void;
  serverName?: string;
};

export default function LogViewer({ content, loading, onRefresh, serverName }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [content, autoScroll]);

  const lines = content
    ? content.split("\n").filter((line) => {
        if (!search) return true;
        return line.toLowerCase().includes(search.toLowerCase());
      })
    : [];

  const download = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${serverName ?? "server"}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLineClass = (line: string): string => {
    const l = line.toLowerCase();
    if (l.includes("error") || l.includes("exception") || l.includes("severe"))
      return "text-red-400";
    if (l.includes("warn")) return "text-yellow-400";
    if (l.includes("info")) return "text-blue-300";
    return "text-gray-300";
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-gray-700 bg-gray-950 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700 bg-gray-900">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar linhas..."
            className="w-full bg-gray-800 text-gray-200 text-sm rounded-lg pl-9 pr-8 py-1.5 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          Auto-scroll
        </label>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          title="Atualizar"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>

        <button
          onClick={download}
          disabled={!content}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Log content */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs scrollbar-thin">
        {loading && lines.length === 0 ? (
          <LoadingSpinner text="Carregando logs..." className="py-12" />
        ) : lines.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum conteúdo de log disponível</p>
        ) : (
          <>
            {lines.map((line, i) => (
              <div key={i} className={cn("leading-relaxed", getLineClass(line))}>
                <span className="text-gray-600 mr-3 select-none">{i + 1}</span>
                {line || " "}
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="px-4 py-2 border-t border-gray-700 bg-gray-900 text-xs text-gray-500">
        {lines.length} linha{lines.length !== 1 ? "s" : ""}
        {search && ` (filtradas de ${content.split("\n").length})`}
      </div>
    </div>
  );
}
