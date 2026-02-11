"use client";

import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useLoading } from "@/context/LoadingContext";

interface ModalNginxFileEditProps {
  nginxFilePublicId: string;
  serverName: string;
  onClose: () => void;
  onError?: (errorData: {
    code: string;
    message: string;
    details?: string | Record<string, unknown> | Array<unknown>;
    status: number;
  }) => void;
  onSuccess?: (message: string) => void;
}

interface NginxConfigFileResponse {
  content: string;
  filePath: string;
  serverName: string;
}

export const ModalNginxFileEdit: React.FC<ModalNginxFileEditProps> = ({
  nginxFilePublicId,
  serverName,
  onClose,
  onError,
  onSuccess,
}) => {
  const [loadingFile, setLoadingFile] = useState<boolean>(true);
  const [fileContent, setFileContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [filePath, setFilePath] = useState<string>("");
  const [localError, setLocalError] = useState<{
    code: string;
    message: string;
    details?: string | Record<string, unknown> | Array<unknown>;
  } | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const token = useAppSelector((state) => state.user.token);
  const connectedMachine = useAppSelector(
    (state) => state.machine.connectedMachine
  );
  const { showLoading, hideLoading } = useLoading();

  // Fetch nginx config file on mount
  useEffect(() => {
    fetchNginxConfigFile();
  }, [nginxFilePublicId]);

  const fetchNginxConfigFile = async () => {
    if (!connectedMachine) {
      const errorData = {
        code: "NO_MACHINE",
        message: "No machine connected",
        details: "Please connect to a machine first",
        status: 400,
      };
      setLocalError(errorData);
      if (onError) {
        onError(errorData);
      }
      setLoadingFile(false);
      onClose();
      return;
    }

    setLoadingFile(true);
    setLocalError(null);

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/nginx/config-file/${nginxFilePublicId}`,
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
          const errorData = {
            code: resJson.error.code,
            message: resJson.error.message,
            details: resJson.error.details,
            status: resJson.error.status,
          };
          setLocalError(errorData);
          if (onError) {
            onError(errorData);
          }
        }
        setLoadingFile(false);
        return;
      }

      const data = resJson as NginxConfigFileResponse;
      setFileContent(data.content);
      setOriginalContent(data.content);
      setFilePath(data.filePath);
      setLoadingFile(false);
    } catch (err) {
      const errorData = {
        code: "NETWORK_ERROR",
        message:
          err instanceof Error
            ? err.message
            : "Failed to fetch nginx config file",
        details: "Unable to connect to the server",
        status: 0,
      };
      setLocalError(errorData);
      if (onError) {
        onError(errorData);
      }
      setLoadingFile(false);
    }
  };

  const handleUpdateFile = async () => {
    if (!connectedMachine) return;

    // Check if content has changed
    if (fileContent === originalContent) {
      if (onSuccess) {
        onSuccess(`No changes detected for ${serverName}`);
      }
      return;
    }

    setLocalError(null);
    setLocalSuccess(null);
    showLoading({
      message: `Updating ${serverName} nginx configuration...`,
      variant: "info",
    });

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/nginx/config-file/${nginxFilePublicId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: fileContent }),
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
          const errorData = {
            code: resJson.error.code,
            message: resJson.error.message,
            details: resJson.error.details,
            status: resJson.error.status,
          };
          setLocalError(errorData);
          if (onError) {
            onError(errorData);
          }
        }
        return;
      }

      // Update original content to current content after successful save
      setOriginalContent(fileContent);
      setLocalError(null);

      const successMessage =
        resJson?.message ||
        `Nginx configuration for ${serverName} updated successfully`;
      setLocalSuccess(successMessage);

      if (onSuccess) {
        onSuccess(successMessage);
      }
    } catch (err) {
      hideLoading();
      const errorData = {
        code: "NETWORK_ERROR",
        message:
          err instanceof Error
            ? err.message
            : `Failed to update nginx config for ${serverName}`,
        details: "Unable to connect to the server",
        status: 0,
      };
      setLocalError(errorData);
      if (onError) {
        onError(errorData);
      }
    }
  };

  const isModified = fileContent !== originalContent;

  return (
    <div className="flex flex-col w-full h-[85vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Edit Nginx Configuration: {serverName}
        </h2>
        {filePath && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
            {filePath}
          </p>
        )}
      </div>

      {loadingFile ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            Loading nginx configuration...
          </p>
        </div>
      ) : (
        <>
          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="h-full flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Configuration File
                  {isModified && (
                    <span className="ml-2 text-xs text-warning-600 dark:text-warning-400">
                      (Modified)
                    </span>
                  )}
                </label>
              </div>

              {/* Error Display */}
              {localError && (
                <div className="mb-4 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg
                        className="w-5 h-5 text-error-600 dark:text-error-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-error-800 dark:text-error-300">
                        {localError.message}
                      </h3>
                      {localError.details && (
                        <p className="mt-1 text-sm text-error-700 dark:text-error-400">
                          {typeof localError.details === "string"
                            ? localError.details
                            : JSON.stringify(localError.details)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Success Display */}
              {localSuccess && (
                <div className="mb-4 p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg
                        className="w-5 h-5 text-success-600 dark:text-success-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-success-800 dark:text-success-300">
                        {localSuccess}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <textarea
                value={fileContent}
                onChange={(e) => {
                  setFileContent(e.target.value);
                  // Clear success/error messages when user starts typing
                  if (localSuccess) setLocalSuccess(null);
                  if (localError) setLocalError(null);
                }}
                className="flex-1 w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white font-mono text-sm resize-none"
                spellCheck={false}
              />
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleUpdateFile}
                  disabled={!isModified}
                  className="px-6 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update
                </button>
              </div>
            </div>
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
