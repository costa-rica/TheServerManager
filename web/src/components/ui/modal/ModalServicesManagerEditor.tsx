"use client";

import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useLoading } from "@/context/LoadingContext";

interface ModalServicesManagerEditorProps {
  serviceName: string;
  serviceFilename: string;
  onClose: () => void;
  onError?: (errorData: {
    code: string;
    message: string;
    details?: string | Record<string, unknown> | Array<unknown>;
    status: number;
  }) => void;
  onSuccess?: (message: string) => void;
}

interface ServiceFileResponse {
  status: string;
  filenameService: string;
  filenameTimer: string;
  fileContentService: string | null;
  fileContentTimer: string | null;
}

interface EnvFileResponse {
  status: string;
  env: string | null;
  envStatus: boolean;
  envLocal: string | null;
  envLocalStatus: boolean;
  workingDirectory: string;
}

export const ModalServicesManagerEditor: React.FC<
  ModalServicesManagerEditorProps
> = ({ serviceName, serviceFilename, onClose, onError, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<
    "service" | "timer" | "env" | "envLocal" | "create"
  >("service");
  const [loadingFiles, setLoadingFiles] = useState<boolean>(true);
  const [serviceContent, setServiceContent] = useState<string>("");
  const [timerContent, setTimerContent] = useState<string>("");
  const [originalServiceContent, setOriginalServiceContent] =
    useState<string>("");
  const [originalTimerContent, setOriginalTimerContent] = useState<string>("");
  const [hasTimerFile, setHasTimerFile] = useState<boolean>(false);
  const [filenameService, setFilenameService] = useState<string>("");
  const [filenameTimer, setFilenameTimer] = useState<string>("");

  // Env file state
  const [envContent, setEnvContent] = useState<string>("");
  const [envLocalContent, setEnvLocalContent] = useState<string>("");
  const [originalEnvContent, setOriginalEnvContent] = useState<string>("");
  const [originalEnvLocalContent, setOriginalEnvLocalContent] =
    useState<string>("");
  const [hasEnvFile, setHasEnvFile] = useState<boolean>(false);
  const [hasEnvLocalFile, setHasEnvLocalFile] = useState<boolean>(false);
  const [creatingEnvType, setCreatingEnvType] = useState<
    "env" | "envLocal" | null
  >(null);
  const [envFileCreated, setEnvFileCreated] = useState<boolean>(false);
  const [envLocalFileCreated, setEnvLocalFileCreated] =
    useState<boolean>(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState<boolean>(false);

  const token = useAppSelector((state) => state.user.token);
  const connectedMachine = useAppSelector(
    (state) => state.machine.connectedMachine
  );
  const { showLoading, hideLoading } = useLoading();

  // Fetch service files on mount
  useEffect(() => {
    const fetchAllFiles = async () => {
      await fetchServiceFiles();
      await fetchEnvFiles();
    };
    fetchAllFiles();
  }, [serviceFilename, serviceName]);

  const fetchServiceFiles = async () => {
    if (!connectedMachine) {
      if (onError) {
        onError({
          code: "NO_MACHINE",
          message: "No machine connected",
          details: "Please connect to a machine first",
          status: 400,
        });
      }
      setLoadingFiles(false);
      return;
    }

    setLoadingFiles(true);

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/services/service-file/${encodeURIComponent(
          serviceFilename
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let resJson = null;
      const contentType = response.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        resJson = await response.json();
      }

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
        setLoadingFiles(false);
        onClose();
        return;
      }

      const data = resJson as ServiceFileResponse;
      setFilenameService(data.filenameService);
      setFilenameTimer(data.filenameTimer);

      if (data.fileContentService) {
        setServiceContent(data.fileContentService);
        setOriginalServiceContent(data.fileContentService);
      }

      if (data.fileContentTimer) {
        setTimerContent(data.fileContentTimer);
        setOriginalTimerContent(data.fileContentTimer);
        setHasTimerFile(true);
      }

      setLoadingFiles(false);
    } catch (err) {
      if (onError) {
        onError({
          code: "NETWORK_ERROR",
          message:
            err instanceof Error ? err.message : "Failed to fetch service files",
          details: "Unable to connect to the server",
          status: 0,
        });
      }
      setLoadingFiles(false);
      onClose();
    }
  };

  const fetchEnvFiles = async () => {
    if (!connectedMachine) return;

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/services/env-file/${encodeURIComponent(
          serviceName
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let resJson = null;
      const contentType = response.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        resJson = await response.json();
      }

      if (!response.ok) {
        // Silently fail for env files - they might not exist and that's okay
        return;
      }

      const data = resJson as EnvFileResponse;

      if (data.envStatus && data.env) {
        setEnvContent(data.env);
        setOriginalEnvContent(data.env);
        setHasEnvFile(true);
        setEnvFileCreated(true);
      }

      if (data.envLocalStatus && data.envLocal) {
        setEnvLocalContent(data.envLocal);
        setOriginalEnvLocalContent(data.envLocal);
        setHasEnvLocalFile(true);
        setEnvLocalFileCreated(true);
      }
    } catch (err) {
      // Silently fail for env files - they might not exist and that's okay
    }
  };

  const handleUpdateFile = async (fileType: "service" | "timer") => {
    if (!connectedMachine) return;

    const filename = fileType === "service" ? filenameService : filenameTimer;
    const fileContents =
      fileType === "service" ? serviceContent : timerContent;
    const originalContent =
      fileType === "service" ? originalServiceContent : originalTimerContent;

    // Check if content has changed
    if (fileContents === originalContent) {
      if (onSuccess) {
        onSuccess(`No changes detected for ${filename}`);
      }
      return;
    }

    showLoading({
      message: `Updating ${filename}...`,
      variant: "info",
    });

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/services/service-file/${encodeURIComponent(
          filename
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ fileContents }),
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

      // Update original content to current content after successful save
      if (fileType === "service") {
        setOriginalServiceContent(serviceContent);
      } else {
        setOriginalTimerContent(timerContent);
      }

      if (onSuccess) {
        onSuccess(resJson?.message || `${filename} updated successfully`);
      }
    } catch (err) {
      hideLoading();
      if (onError) {
        onError({
          code: "NETWORK_ERROR",
          message:
            err instanceof Error ? err.message : `Failed to update ${filename}`,
          details: "Unable to connect to the server",
          status: 0,
        });
      }
    }
  };

  const handleCreateOrUpdateEnvFile = async (
    fileType: "env" | "envLocal"
  ) => {
    if (!connectedMachine) return;

    const isEnv = fileType === "env";
    const fileContent = isEnv ? envContent : envLocalContent;
    const isCreated = isEnv ? envFileCreated : envLocalFileCreated;
    const fileName = isEnv ? ".env" : ".env.local";

    showLoading({
      message: isCreated
        ? `Updating ${fileName}...`
        : `Creating ${fileName}...`,
      variant: "info",
    });

    try {
      const body: { env?: string; envLocal?: string } = {};
      if (isEnv) {
        body.env = fileContent;
      } else {
        body.envLocal = fileContent;
      }

      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/services/env-file/${encodeURIComponent(
          serviceName
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
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

      // Update original content and mark as created
      if (isEnv) {
        setOriginalEnvContent(envContent);
        setEnvFileCreated(true);
        setHasEnvFile(true);
      } else {
        setOriginalEnvLocalContent(envLocalContent);
        setEnvLocalFileCreated(true);
        setHasEnvLocalFile(true);
      }

      if (onSuccess) {
        onSuccess(
          resJson?.message ||
            `${fileName} ${isCreated ? "updated" : "created"} successfully`
        );
      }
    } catch (err) {
      hideLoading();
      if (onError) {
        onError({
          code: "NETWORK_ERROR",
          message:
            err instanceof Error ? err.message : `Failed to update ${fileName}`,
          details: "Unable to connect to the server",
          status: 0,
        });
      }
    }
  };

  const handleCreateEnvFile = (type: "env" | "envLocal") => {
    setCreatingEnvType(type);
    setActiveTab(type);
    setShowCreateDropdown(false);
    // Initialize with empty content
    if (type === "env") {
      setEnvContent("");
    } else {
      setEnvLocalContent("");
    }
  };

  const isServiceModified = serviceContent !== originalServiceContent;
  const isTimerModified = timerContent !== originalTimerContent;
  const isEnvModified = envContent !== originalEnvContent;
  const isEnvLocalModified = envLocalContent !== originalEnvLocalContent;

  return (
    <div className="flex flex-col w-full h-[85vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Edit Service Files: {serviceName}
        </h2>
      </div>

      {loadingFiles ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            Loading service files...
          </p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 flex">
            <button
              type="button"
              onClick={() => setActiveTab("service")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "service"
                  ? "bg-brand-50 dark:bg-brand-900/10 text-brand-700 dark:text-brand-400 border-b-2 border-brand-500"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              Service File {isServiceModified && "*"}
            </button>
            {hasTimerFile && (
              <button
                type="button"
                onClick={() => setActiveTab("timer")}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "timer"
                    ? "bg-brand-50 dark:bg-brand-900/10 text-brand-700 dark:text-brand-400 border-b-2 border-brand-500"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Timer File {isTimerModified && "*"}
              </button>
            )}
            {(hasEnvFile || creatingEnvType === "env") && (
              <button
                type="button"
                onClick={() => setActiveTab("env")}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "env"
                    ? "bg-brand-50 dark:bg-brand-900/10 text-brand-700 dark:text-brand-400 border-b-2 border-brand-500"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                .env {isEnvModified && "*"}
              </button>
            )}
            {(hasEnvLocalFile || creatingEnvType === "envLocal") && (
              <button
                type="button"
                onClick={() => setActiveTab("envLocal")}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "envLocal"
                    ? "bg-brand-50 dark:bg-brand-900/10 text-brand-700 dark:text-brand-400 border-b-2 border-brand-500"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                .env.local {isEnvLocalModified && "*"}
              </button>
            )}
            {!hasEnvFile && !hasEnvLocalFile && !creatingEnvType && (
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                  className={`w-full px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === "create"
                      ? "bg-brand-50 dark:bg-brand-900/10 text-brand-700 dark:text-brand-400 border-b-2 border-brand-500"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  + Env File
                </button>
                {showCreateDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                    <button
                      type="button"
                      onClick={() => handleCreateEnvFile("env")}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Create .env
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateEnvFile("envLocal")}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Create .env.local
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === "service" && (
              <div className="h-full flex flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {filenameService}
                    {isServiceModified && (
                      <span className="ml-2 text-xs text-warning-600 dark:text-warning-400">
                        (Modified)
                      </span>
                    )}
                  </label>
                </div>
                <textarea
                  value={serviceContent}
                  onChange={(e) => setServiceContent(e.target.value)}
                  className="flex-1 w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white font-mono text-sm resize-none"
                  spellCheck={false}
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleUpdateFile("service")}
                    disabled={!isServiceModified}
                    className="px-6 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update Service File
                  </button>
                </div>
              </div>
            )}

            {activeTab === "timer" && (
              <div className="h-full flex flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {filenameTimer}
                    {isTimerModified && (
                      <span className="ml-2 text-xs text-warning-600 dark:text-warning-400">
                        (Modified)
                      </span>
                    )}
                  </label>
                </div>
                <textarea
                  value={timerContent}
                  onChange={(e) => setTimerContent(e.target.value)}
                  className="flex-1 w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white font-mono text-sm resize-none"
                  spellCheck={false}
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleUpdateFile("timer")}
                    disabled={!isTimerModified}
                    className="px-6 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update Timer File
                  </button>
                </div>
              </div>
            )}

            {activeTab === "env" && (
              <div className="h-full flex flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    .env
                    {isEnvModified && (
                      <span className="ml-2 text-xs text-warning-600 dark:text-warning-400">
                        (Modified)
                      </span>
                    )}
                  </label>
                </div>
                <textarea
                  value={envContent}
                  onChange={(e) => setEnvContent(e.target.value)}
                  className="flex-1 w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white font-mono text-sm resize-none"
                  spellCheck={false}
                  placeholder="# Environment variables&#10;PORT=3000&#10;DATABASE_URL=mongodb://localhost:27017"
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCreateOrUpdateEnvFile("env")}
                    disabled={!envFileCreated && envContent.trim() === ""}
                    className="px-6 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {envFileCreated ? "Update .env" : "Create .env"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "envLocal" && (
              <div className="h-full flex flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    .env.local
                    {isEnvLocalModified && (
                      <span className="ml-2 text-xs text-warning-600 dark:text-warning-400">
                        (Modified)
                      </span>
                    )}
                  </label>
                </div>
                <textarea
                  value={envLocalContent}
                  onChange={(e) => setEnvLocalContent(e.target.value)}
                  className="flex-1 w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white font-mono text-sm resize-none"
                  spellCheck={false}
                  placeholder="# Local environment overrides&#10;NODE_ENV=development&#10;DEBUG=true"
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCreateOrUpdateEnvFile("envLocal")}
                    disabled={
                      !envLocalFileCreated && envLocalContent.trim() === ""
                    }
                    className="px-6 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {envLocalFileCreated
                      ? "Update .env.local"
                      : "Create .env.local"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
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
