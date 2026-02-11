"use client";

import React, { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useLoading } from "@/context/LoadingContext";
import { ChevronDownIcon, ChevronUpIcon } from "@/icons";

interface ModalNodeJsManagerProps {
  serviceName: string;
  onClose: () => void;
  onError?: (errorData: {
    code: string;
    message: string;
    details?: string | Record<string, unknown> | Array<unknown>;
    status: number;
  }) => void;
}

interface NpmResponse {
  status: "success" | "fail";
  warnings: string;
  failureReason: string | null;
}

interface ActionResult {
  status: "success" | "fail";
  warnings: string;
  failureReason: string | null;
  timestamp: Date;
}

export const ModalNodeJsManager: React.FC<ModalNodeJsManagerProps> = ({
  serviceName,
  onClose,
  onError,
}) => {
  const [installResult, setInstallResult] = useState<ActionResult | null>(null);
  const [buildResult, setBuildResult] = useState<ActionResult | null>(null);
  const [isInstallExpanded, setIsInstallExpanded] = useState<boolean>(false);
  const [isBuildExpanded, setIsBuildExpanded] = useState<boolean>(false);

  const token = useAppSelector((state) => state.user.token);
  const connectedMachine = useAppSelector(
    (state) => state.machine.connectedMachine
  );
  const { showLoading, hideLoading } = useLoading();

  const handleNpmAction = async (action: "install" | "build") => {
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

    // Clear previous result for this action before making new request
    if (action === "install") {
      setInstallResult(null);
    } else {
      setBuildResult(null);
    }

    showLoading({
      message: `Running npm ${action}...`,
      variant: action === "install" ? "info" : "warning",
    });

    try {
      const encodedServiceName = encodeURIComponent(serviceName);
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/services/npm/${encodedServiceName}/${action}`,
        {
          method: "POST",
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

      hideLoading();

      if (!response.ok) {
        // Handle API error response
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

      // Success - store the result
      const data = resJson as NpmResponse;
      const result: ActionResult = {
        status: data.status,
        warnings: data.warnings,
        failureReason: data.failureReason,
        timestamp: new Date(),
      };

      if (action === "install") {
        setInstallResult(result);
        setIsInstallExpanded(true); // Auto-expand on new result
      } else {
        setBuildResult(result);
        setIsBuildExpanded(true); // Auto-expand on new result
      }
    } catch (err) {
      hideLoading();
      if (onError) {
        onError({
          code: "NETWORK_ERROR",
          message:
            err instanceof Error ? err.message : `Failed to run npm ${action}`,
          details: "Unable to connect to the server",
          status: 0,
        });
      }
    }
  };

  const renderResultSection = (
    title: string,
    result: ActionResult | null,
    isExpanded: boolean,
    setIsExpanded: (expanded: boolean) => void
  ) => {
    if (!result) return null;

    const hasWarnings = result.warnings && result.warnings !== "no warnings";
    const hasFailed = result.status === "fail";

    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <span
              className={`text-xs px-2 py-1 rounded ${
                hasFailed
                  ? "bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400"
                  : "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400"
              }`}
            >
              {result.status}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        {isExpanded && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              {/* Timestamp */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {result.timestamp.toLocaleString()}
              </div>

              {/* Failure Reason */}
              {hasFailed && result.failureReason && (
                <div>
                  <h4 className="text-sm font-semibold text-error-700 dark:text-error-400 mb-2">
                    Error:
                  </h4>
                  <div className="p-3 rounded-lg bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800">
                    <pre className="text-xs text-error-700 dark:text-error-400 whitespace-pre-wrap break-words font-mono">
                      {result.failureReason}
                    </pre>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {hasWarnings && (
                <div>
                  <h4 className="text-sm font-semibold text-warning-700 dark:text-warning-400 mb-2">
                    Warnings:
                  </h4>
                  <div className="p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
                    <pre className="text-xs text-warning-700 dark:text-warning-400 whitespace-pre-wrap break-words font-mono">
                      {result.warnings}
                    </pre>
                  </div>
                </div>
              )}

              {/* Success message when no warnings or errors */}
              {!hasFailed && !hasWarnings && (
                <div className="p-3 rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800">
                  <p className="text-sm text-success-700 dark:text-success-400">
                    ✓ Completed successfully with no warnings
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full max-w-3xl bg-white dark:bg-gray-900 rounded-lg overflow-hidden max-h-[90vh]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Node.js Manager: {serviceName}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              NPM Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleNpmAction("install")}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors text-sm"
              >
                <span>Install</span>
              </button>
              <button
                type="button"
                onClick={() => handleNpmAction("build")}
                className="flex items-center gap-2 px-4 py-2 bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 hover:bg-warning-200 dark:hover:bg-warning-900/50 rounded-lg font-medium transition-colors text-sm"
              >
                <span>Build</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              <strong>Install:</strong> Runs npm install to install
              dependencies. <strong>Build:</strong> Runs npm run build to build
              the project.
            </p>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {renderResultSection(
              "Install Result",
              installResult,
              isInstallExpanded,
              setIsInstallExpanded
            )}
            {renderResultSection(
              "Build Result",
              buildResult,
              isBuildExpanded,
              setIsBuildExpanded
            )}
          </div>
        </div>
      </div>

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
