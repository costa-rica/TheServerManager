"use client";
import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";

interface ModalServiceLogProps {
  serviceName: string;
  onClose: () => void;
  onError?: (errorData: {
    code: string;
    message: string;
    details?: string | Record<string, unknown> | Array<unknown>;
    status: number;
  }) => void;
}

export const ModalServiceLog: React.FC<ModalServiceLogProps> = ({
  serviceName,
  onClose,
  onError,
}) => {
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const token = useAppSelector((state) => state.user.token);
  const connectedMachine = useAppSelector(
    (state) => state.machine.connectedMachine
  );

  // Fetch logs function
  useEffect(() => {
    const fetchLogs = async () => {
      if (!connectedMachine) {
        if (onError) {
          onError({
            code: "NO_MACHINE",
            message: "No machine connected",
            details: "Please connect to a machine first",
            status: 400,
          });
          onClose();
        } else {
          setError("No machine connected");
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // URL encode the service name to handle spaces
        const encodedServiceName = encodeURIComponent(serviceName);
        const response = await fetch(
          `${connectedMachine.urlApiForTsmNetwork}/services/logs/${encodedServiceName}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Try to parse as JSON first to check for error responses
        let resJson = null;
        const contentType = response.headers.get("Content-Type");

        if (!response.ok) {
          // For error responses, try to parse JSON
          if (contentType?.includes("application/json")) {
            resJson = await response.json();
          }

          // Check if we have a standardized API error response
          if (
            resJson?.error &&
            resJson.error.code &&
            resJson.error.message &&
            resJson.error.status
          ) {
            // Use the onError callback to pass error to parent for ModalErrorResponse
            if (onError) {
              onError({
                code: resJson.error.code,
                message: resJson.error.message,
                details: resJson.error.details,
                status: resJson.error.status,
              });
              onClose();
            } else {
              setError(resJson.error.message);
            }
          } else {
            // For non-standardized errors
            const errorMessage =
              resJson?.error?.message ||
              resJson?.error ||
              `Failed to fetch logs: ${response.status} ${response.statusText}`;
            if (onError) {
              onError({
                code: "FETCH_LOGS_ERROR",
                message: errorMessage,
                details: `Service: ${serviceName}`,
                status: response.status,
              });
              onClose();
            } else {
              setError(errorMessage);
            }
          }
          setLoading(false);
          return;
        }

        // Success - response is plain text
        const logText = await response.text();
        setLogs(logText);
        setLoading(false);
      } catch (err) {
        // Network or parsing errors
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch logs";
        if (onError) {
          onError({
            code: "NETWORK_ERROR",
            message: errorMessage,
            details: "Unable to connect to the server",
            status: 0,
          });
          onClose();
        } else {
          setError(errorMessage);
        }
        setLoading(false);
      }
    };

    fetchLogs();
  }, [serviceName, token, connectedMachine, onError, onClose]);

  return (
    <div className="flex flex-col w-[95vw] h-[95vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Service Logs: {serviceName}
        </h2>
      </div>

      {/* Log Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-950 dark:bg-black">
        {loading && <p className="text-gray-400">Loading logs...</p>}

        {error && (
          <div className="p-4 bg-error-50 dark:bg-error-900/20 border border-error-500 rounded-lg">
            <p className="text-error-700 dark:text-error-400">{error}</p>
          </div>
        )}

        {!error && !loading && logs && (
          <pre className="text-sm text-success-400 font-mono whitespace-pre-wrap break-words select-text">
            {logs}
          </pre>
        )}

        {!error && !loading && !logs && (
          <p className="text-gray-400">No logs available</p>
        )}
      </div>
    </div>
  );
};
