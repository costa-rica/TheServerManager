"use client";

import React, { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useLoading } from "@/context/LoadingContext";

interface ModalServicesManagerProps {
  onClose: () => void;
  onError?: (errorData: {
    code: string;
    message: string;
    details?: string | Record<string, unknown> | Array<unknown>;
    status: number;
  }) => void;
  onSuccess?: (message: string) => void;
}

interface MakeServiceFileResponse {
  message: string;
  service: {
    template: string;
    outputPath: string;
    filename: string;
    content: string;
  };
  timer?: {
    template: string;
    outputPath: string;
    filename: string;
    content: string;
  };
  variablesApplied: {
    project_name: string;
    project_name_lowercase: string;
    python_env_name?: string;
    port?: number;
  };
}

const SERVICE_TEMPLATES = [
  { value: "expressjs.service", label: "Express.js" },
  { value: "flask.service", label: "Flask" },
  { value: "fastapi.service", label: "FastAPI" },
  { value: "nextjs.service", label: "Next.js" },
  { value: "nodejsscript.service", label: "Node.js Script" },
  { value: "pythonscript.service", label: "Python Script" },
];

const TIMER_TEMPLATES = [
  { value: "", label: "None" },
  { value: "nodejsscript.timer", label: "Node.js Script Timer" },
  { value: "pythonscript.timer", label: "Python Script Timer" },
];

export const ModalServicesManager: React.FC<ModalServicesManagerProps> = ({
  onClose,
  onError,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"create" | "modify">("create");

  // Form state for create tab
  const [filenameServiceTemplate, setFilenameServiceTemplate] = useState<string>("expressjs.service");
  const [filenameTimerTemplate, setFilenameTimerTemplate] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("");
  const [pythonEnvName, setPythonEnvName] = useState<string>("");
  const [port, setPort] = useState<string>("");

  const token = useAppSelector((state) => state.user.token);
  const connectedMachine = useAppSelector(
    (state) => state.machine.connectedMachine
  );
  const { showLoading, hideLoading } = useLoading();

  // Determine if selected template is Python-based
  const isPythonTemplate =
    filenameServiceTemplate === "flask.service" ||
    filenameServiceTemplate === "fastapi.service" ||
    filenameServiceTemplate === "pythonscript.service";

  // Determine if port is required (most templates except script-only timers)
  const isPortRequired =
    filenameServiceTemplate !== "nodejsscript.service" &&
    filenameServiceTemplate !== "pythonscript.service";

  const handleCreateServiceFile = async () => {
    if (!connectedMachine) {
      if (onError) {
        onError({
          code: "NO_MACHINE",
          message: "No machine connected",
          details: "Please connect to a machine first",
          status: 400,
        });
      }
      return;
    }

    // Validation
    if (!projectName.trim()) {
      if (onError) {
        onError({
          code: "VALIDATION_ERROR",
          message: "Project name is required",
          status: 400,
        });
      }
      return;
    }

    if (isPythonTemplate && !pythonEnvName.trim()) {
      if (onError) {
        onError({
          code: "VALIDATION_ERROR",
          message: "Python environment name is required for Python templates",
          status: 400,
        });
      }
      return;
    }

    showLoading({ message: "Creating service file(s)...", variant: "info" });

    try {
      const variables: {
        project_name: string;
        python_env_name?: string;
        port?: number;
      } = {
        project_name: projectName.trim(),
      };

      if (isPythonTemplate && pythonEnvName.trim()) {
        variables.python_env_name = pythonEnvName.trim();
      }

      if (port.trim()) {
        variables.port = parseInt(port.trim(), 10);
      }

      const requestBody: {
        filenameServiceTemplate: string;
        filenameTimerTemplate?: string;
        variables: typeof variables;
      } = {
        filenameServiceTemplate,
        variables,
      };

      if (filenameTimerTemplate) {
        requestBody.filenameTimerTemplate = filenameTimerTemplate;
      }

      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/services/make-service-file`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      let resJson = null;
      const contentType = response.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        resJson = await response.json();
      }

      hideLoading();

      if (!response.ok) {
        if (
          resJson?.error &&
          resJson.error.code &&
          resJson.error.message &&
          resJson.error.status
        ) {
          if (onError) {
            onError({
              code: resJson.error.code,
              message: resJson.error.message,
              details: resJson.error.details,
              status: resJson.error.status,
            });
          }
        }
        return;
      }

      // Success
      const data = resJson as MakeServiceFileResponse;
      if (onSuccess) {
        const timerInfo = data.timer ? ` and ${data.timer.filename}` : "";
        onSuccess(`Successfully created ${data.service.filename}${timerInfo}`);
      }

      // Reset form
      setProjectName("");
      setPythonEnvName("");
      setPort("");
      onClose();
    } catch (err) {
      hideLoading();
      if (onError) {
        onError({
          code: "NETWORK_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Failed to create service file",
          details: "Unable to connect to the server",
          status: 0,
        });
      }
    }
  };

  return (
    <div className="flex flex-col w-full max-w-3xl bg-white dark:bg-gray-900 rounded-lg overflow-hidden max-h-[90vh]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Services Manager
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 flex">
        <button
          type="button"
          onClick={() => setActiveTab("create")}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "create"
              ? "bg-brand-50 dark:bg-brand-900/10 text-brand-700 dark:text-brand-400 border-b-2 border-brand-500"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          Create
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("modify")}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "modify"
              ? "bg-brand-50 dark:bg-brand-900/10 text-brand-700 dark:text-brand-400 border-b-2 border-brand-500"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          Modify
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "create" ? (
          <div className="space-y-5">
            {/* Service Template Dropdown */}
            <div>
              <label
                htmlFor="serviceTemplate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Service Template <span className="text-error-500">*</span>
              </label>
              <select
                id="serviceTemplate"
                value={filenameServiceTemplate}
                onChange={(e) => setFilenameServiceTemplate(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white transition-all"
              >
                {SERVICE_TEMPLATES.map((template) => (
                  <option key={template.value} value={template.value}>
                    {template.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Timer Template Dropdown */}
            <div>
              <label
                htmlFor="timerTemplate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Timer Template
              </label>
              <select
                id="timerTemplate"
                value={filenameTimerTemplate}
                onChange={(e) => setFilenameTimerTemplate(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white transition-all"
              >
                {TIMER_TEMPLATES.map((template) => (
                  <option key={template.value} value={template.value}>
                    {template.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Name */}
            <div>
              <label
                htmlFor="projectName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Project Name <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., MyProject-API"
                className="w-full px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Used for PROJECT_NAME placeholder, auto-converted to lowercase
                for filenames
              </p>
            </div>

            {/* Python Environment Name (conditional) */}
            {isPythonTemplate && (
              <div>
                <label
                  htmlFor="pythonEnvName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Python Environment Name <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  id="pythonEnvName"
                  value={pythonEnvName}
                  onChange={(e) => setPythonEnvName(e.target.value)}
                  placeholder="e.g., myproject_env"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Required for Python templates (Flask, FastAPI, Python Script)
                </p>
              </div>
            )}

            {/* Port */}
            <div>
              <label
                htmlFor="port"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Port {isPortRequired && <span className="text-error-500">*</span>}
              </label>
              <input
                type="number"
                id="port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="e.g., 3000"
                className="w-full px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Port number the application will run on
              </p>
            </div>

            {/* Create Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleCreateServiceFile}
                className="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors"
              >
                Create Service File
              </button>
            </div>
          </div>
        ) : (
          // Modify Tab Placeholder
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Modify tab coming soon
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                This feature will allow you to modify existing service files
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
