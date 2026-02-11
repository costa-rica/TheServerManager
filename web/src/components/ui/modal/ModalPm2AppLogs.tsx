"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";

interface ModalPm2AppLogsProps {
  appName: string;
  onClose: () => void;
}

type LogType = "out" | "err";

export const ModalPm2AppLogs: React.FC<ModalPm2AppLogsProps> = ({
  appName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClose: _onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LogType>("out");
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const token = useAppSelector((state) => state.user.token);
  const urlApiForTsmNetwork = useAppSelector(
    (state) => state.machine.connectedMachine?.urlApiForTsmNetwork || null
  );

  // Fetch logs function
  const fetchLogs = useCallback(
    async (type: LogType) => {
      if (!urlApiForTsmNetwork) {
        setError("No machine connected");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${urlApiForTsmNetwork}/pm2/logs/${appName}?type=${type}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch logs: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        // Backend returns { appName, type, lines: [] }
        if (data.lines && Array.isArray(data.lines)) {
          setLogs(data.lines.join("\n"));
        } else {
          setLogs("No logs available");
        }

        setError(null);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch logs");
        setLoading(false);
      }
    },
    [urlApiForTsmNetwork, appName, token]
  );

  // Poll logs every second when tab changes or component mounts
  useEffect(() => {
    setLoading(true);
    fetchLogs(activeTab);

    const interval = setInterval(() => {
      fetchLogs(activeTab);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTab, fetchLogs]);

  const handleTabChange = (tab: LogType) => {
    setActiveTab(tab);
    setLoading(true);
  };

  return (
    <div className="flex flex-col w-[95vw] h-[95vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Logs: {appName}
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleTabChange("out")}
          className={`px-6 py-3 text-base font-medium transition-colors ${
            activeTab === "out"
              ? "text-brand-500 border-b-2 border-brand-500 bg-brand-50 dark:bg-brand-500/10"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          Out
        </button>
        <button
          onClick={() => handleTabChange("err")}
          className={`px-6 py-3 text-base font-medium transition-colors ${
            activeTab === "err"
              ? "text-brand-500 border-b-2 border-brand-500 bg-brand-50 dark:bg-brand-500/10"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          Error
        </button>
      </div>

      {/* Log Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-950 dark:bg-black">
        {loading && !logs && <p className="text-gray-400">Loading logs...</p>}

        {error && (
          <div className="p-4 bg-error-50 dark:bg-error-900/20 border border-error-500 rounded-lg">
            <p className="text-error-700 dark:text-error-400">{error}</p>
          </div>
        )}

        {!error && logs && (
          <pre className="text-sm text-success-400 font-mono whitespace-pre-wrap break-words select-text">
            {logs}
          </pre>
        )}
      </div>
    </div>
  );
};
