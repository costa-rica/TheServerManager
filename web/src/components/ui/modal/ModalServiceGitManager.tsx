"use client";

import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useLoading } from "@/context/LoadingContext";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  TrashBinIcon,
} from "@/icons";
import { Modal } from "@/components/ui/modal";
import { ModalInformationYesOrNo } from "@/components/ui/modal/ModalInformationYesOrNo";

interface ModalServiceGitManagerProps {
  serviceName: string;
  onClose: () => void;
  onError?: (errorData: {
    code: string;
    message: string;
    details?: string | Record<string, unknown> | Array<unknown>;
    status: number;
  }) => void;
  onSuccess?: () => void;
}

interface GitBranchesResponse {
  gitBranchesLocalArray: string[];
  gitBranchesRemoteArray: string[];
  currentBranch: string;
}

interface GitActionResponse {
  success: boolean;
  action?: string;
  branchName?: string;
  stdout: string;
  stderr: string;
}

export const ModalServiceGitManager: React.FC<ModalServiceGitManagerProps> = ({
  serviceName,
  onClose,
  onError,
  onSuccess,
}) => {
  const [localBranches, setLocalBranches] = useState<string[]>([]);
  const [remoteBranches, setRemoteBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [loadingBranches, setLoadingBranches] = useState<boolean>(true);
  const [isActionsExpanded, setIsActionsExpanded] = useState<boolean>(true);
  const [activeBranchTab, setActiveBranchTab] = useState<"local" | "remote">(
    "local"
  );
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] =
    useState<boolean>(false);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);

  const token = useAppSelector((state) => state.user.token);
  const connectedMachine = useAppSelector(
    (state) => state.machine.connectedMachine
  );
  const { showLoading, hideLoading } = useLoading();

  // Fetch branches on component mount
  useEffect(() => {
    fetchBranches();
  }, [serviceName]);

  const fetchBranches = async () => {
    if (!connectedMachine) {
      if (onError) {
        onError({
          code: "NO_MACHINE",
          message: "No machine connected",
          details: "Please connect to a machine first",
          status: 400,
        });
      }
      setLoadingBranches(false);
      return;
    }

    setLoadingBranches(true);

    try {
      const encodedServiceName = encodeURIComponent(serviceName);
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/services/git/${encodedServiceName}`,
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
        setLoadingBranches(false);
        return;
      }

      const data = resJson as GitBranchesResponse;
      setLocalBranches(data.gitBranchesLocalArray || []);
      setRemoteBranches(data.gitBranchesRemoteArray || []);
      setCurrentBranch(data.currentBranch || "");
      setLoadingBranches(false);
    } catch (err) {
      if (onError) {
        onError({
          code: "NETWORK_ERROR",
          message:
            err instanceof Error ? err.message : "Failed to fetch branches",
          details: "Unable to connect to the server",
          status: 0,
        });
      }
      setLoadingBranches(false);
    }
  };

  const handleGitAction = async (action: "fetch" | "pull") => {
    if (!connectedMachine) return;

    showLoading({ message: `Running git ${action}...`, variant: "info" });

    try {
      const encodedServiceName = encodeURIComponent(serviceName);
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/services/git/${encodedServiceName}/${action}`,
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

      // Success - optionally show success message
      const data = resJson as GitActionResponse;
      if (onSuccess && data.success) {
        onSuccess();
      }

      // Refresh branches after action
      await fetchBranches();
    } catch (err) {
      hideLoading();
      if (onError) {
        onError({
          code: "NETWORK_ERROR",
          message: err instanceof Error ? err.message : `Failed to ${action}`,
          details: "Unable to connect to the server",
          status: 0,
        });
      }
    }
  };

  const handleCheckoutBranch = async (branchName: string) => {
    if (!connectedMachine || branchName === currentBranch) return;

    showLoading({
      message: `Switching to branch ${branchName}...`,
      variant: "info",
    });

    try {
      const encodedServiceName = encodeURIComponent(serviceName);
      const encodedBranchName = encodeURIComponent(branchName);
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/services/git/checkout/${encodedServiceName}/${encodedBranchName}`,
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
      const data = resJson as GitActionResponse;
      if (onSuccess && data.success) {
        onSuccess();
      }

      // Refresh branches to update current branch
      await fetchBranches();
    } catch (err) {
      hideLoading();
      if (onError) {
        onError({
          code: "NETWORK_ERROR",
          message:
            err instanceof Error
              ? err.message
              : `Failed to checkout branch ${branchName}`,
          details: "Unable to connect to the server",
          status: 0,
        });
      }
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    if (!connectedMachine) return;

    showLoading({
      message: `Deleting branch ${branchName}...`,
      variant: "warning",
    });

    try {
      const encodedServiceName = encodeURIComponent(serviceName);
      const encodedBranchName = encodeURIComponent(branchName);
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/services/git/delete-branch/${encodedServiceName}/${encodedBranchName}`,
        {
          method: "DELETE",
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
      const data = resJson as GitActionResponse;
      if (onSuccess && data.success) {
        onSuccess();
      }

      // Refresh branches after deletion
      await fetchBranches();
    } catch (err) {
      hideLoading();
      if (onError) {
        onError({
          code: "NETWORK_ERROR",
          message:
            err instanceof Error
              ? err.message
              : `Failed to delete branch ${branchName}`,
          details: "Unable to connect to the server",
          status: 0,
        });
      }
    }
  };

  const confirmDeleteBranch = (branchName: string) => {
    setBranchToDelete(branchName);
    setDeleteConfirmModalOpen(true);
  };

  const executeDeleteBranch = () => {
    if (branchToDelete) {
      handleDeleteBranch(branchToDelete);
    }
    setDeleteConfirmModalOpen(false);
    setBranchToDelete(null);
  };

  return (
    <>
      <div className="flex flex-col w-full max-w-3xl bg-white dark:bg-gray-900 rounded-lg overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Git Manager: {serviceName}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loadingBranches ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                Loading branches...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Git Actions Section */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIsActionsExpanded(!isActionsExpanded)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Git Actions
                  </h3>
                  {isActionsExpanded ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>

                {isActionsExpanded && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleGitAction("fetch")}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors text-sm"
                      >
                        <span>Fetch</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGitAction("pull")}
                        className="flex items-center gap-2 px-4 py-2 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 hover:bg-success-200 dark:hover:bg-success-900/50 rounded-lg font-medium transition-colors text-sm"
                      >
                        <span>Pull</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      <strong>Fetch:</strong> Download changes without merging.{" "}
                      <strong>Pull:</strong> Download and merge changes.
                    </p>
                  </div>
                )}
              </div>

              {/* Branches Section */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="px-4 py-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Branches
                  </h3>
                </div>

                {/* Tabs */}
                <div className="border-t border-gray-200 dark:border-gray-700 flex">
                  <button
                    type="button"
                    onClick={() => setActiveBranchTab("local")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeBranchTab === "local"
                        ? "bg-brand-50 dark:bg-brand-900/10 text-brand-700 dark:text-brand-400 border-b-2 border-brand-500"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    Local ({localBranches.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBranchTab("remote")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeBranchTab === "remote"
                        ? "bg-brand-50 dark:bg-brand-900/10 text-brand-700 dark:text-brand-400 border-b-2 border-brand-500"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    Remote ({remoteBranches.length})
                  </button>
                </div>

                {/* Branch List */}
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {(() => {
                    const branches =
                      activeBranchTab === "local"
                        ? localBranches
                        : remoteBranches;
                    const isLocalTab = activeBranchTab === "local";

                    if (branches.length === 0) {
                      return (
                        <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                          No {activeBranchTab} branches found
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {branches.map((branch) => {
                          const isCurrentBranch = branch === currentBranch;
                          const isProtectedBranch =
                            branch === "main" || branch === "master";

                          return (
                            <div
                              key={branch}
                              className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                isCurrentBranch
                                  ? "bg-brand-50 dark:bg-brand-900/10"
                                  : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleCheckoutBranch(branch)}
                                disabled={isCurrentBranch}
                                className={`flex items-center gap-2 text-left flex-1 ${
                                  isCurrentBranch
                                    ? "cursor-default"
                                    : "cursor-pointer"
                                }`}
                              >
                                {isCurrentBranch && (
                                  <CheckCircleIcon className="w-5 h-5 text-brand-500" />
                                )}
                                <span
                                  className={`font-medium text-sm ${
                                    isCurrentBranch
                                      ? "text-brand-700 dark:text-brand-400"
                                      : "text-gray-900 dark:text-white"
                                  }`}
                                >
                                  {branch}
                                </span>
                                {isCurrentBranch && (
                                  <span className="text-xs text-brand-600 dark:text-brand-500">
                                    (current)
                                  </span>
                                )}
                              </button>

                              {isLocalTab &&
                                !isCurrentBranch &&
                                !isProtectedBranch && (
                                  <button
                                    type="button"
                                    onClick={() => confirmDeleteBranch(branch)}
                                    className="p-2 hover:bg-error-100 dark:hover:bg-error-900/30 rounded transition-colors"
                                    title="Delete branch"
                                  >
                                    <TrashBinIcon className="w-4 h-4 text-error-500" />
                                  </button>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
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

      {/* Delete Confirmation Modal */}
      {branchToDelete && (
        <Modal
          isOpen={deleteConfirmModalOpen}
          onClose={() => {
            setDeleteConfirmModalOpen(false);
            setBranchToDelete(null);
          }}
        >
          <ModalInformationYesOrNo
            title="Delete Branch"
            message={`Are you sure you want to delete the branch "${branchToDelete}"? This action cannot be undone.`}
            yesButtonText="Delete"
            noButtonText="Cancel"
            yesButtonStyle="danger"
            onYes={executeDeleteBranch}
            onClose={() => {
              setDeleteConfirmModalOpen(false);
              setBranchToDelete(null);
            }}
          />
        </Modal>
      )}
    </>
  );
};
